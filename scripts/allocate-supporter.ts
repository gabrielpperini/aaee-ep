import "dotenv/config";
import webpush from "web-push";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, AssignmentRole } from "@/generated/prisma/client";

/**
 * Atribui torcida/apoio/capitão a eventos — IMITA o server action
 * `upsertAssignment` (src/app/(app)/eventos/[id]/actions.ts) + `notifyAssignmentChange`.
 * Standalone (não importa src/lib/* que é server-only), replicando:
 *   - validações de conflito (competindo / atleta no próprio evento / já alocada);
 *   - upsert da Assignment;
 *   - push best-effort (respeita NotificationPreference.allocation, limpa 410/404);
 *   - WhatsApp best-effort (sempre, ignora opt-out);
 *   - notifica só na MUDANÇA relevante (igual o action): nova escalação,
 *     virou capitão, ou mudou de função.
 *
 * USO
 *   Um:    pnpm tsx scripts/allocate-supporter.ts <eventId> <personId> [ROLE] [--captain] [--force] [--notes="..."] [--dry]
 *   Lote:  echo '[{"eventId":"...","personId":"...","role":"SUPPORTER","isCaptain":false}]' | pnpm tsx scripts/allocate-supporter.ts --dry
 *          (qualquer entrada no stdin é tratada como JSON array de itens)
 *
 *   ROLE ∈ SUPPORTER | CAPTAIN | MATERIAL_LEAD | SUPPORT  (default SUPPORTER)
 *
 *   CAPITÃO DA TORCIDA (configurável):
 *     - CLI:  --captain | --captain=true | --captain=false | --no-captain  (default false)
 *     - JSON: campo "isCaptain": true|false por item (default false)
 *     Convenção do app: capitão é role=SUPPORTER + isCaptain=true (a flag é independente do role).
 *
 *   Flags por item no JSON: { eventId, personId, role?, isCaptain?, notes?, force? }
 *   Flags globais: --dry (não grava/não envia), --force (ignora conflito de já-alocada),
 *                  --no-notify (grava mas não dispara push/WhatsApp).
 */

const COMMITTED_STATUSES = ["CONFIRMED", "POSTPONED"];
const ROLE_LABELS: Record<string, string> = {
  SUPPORTER: "Torcedor(a)",
  CAPTAIN: "Capitão/Capitã",
  MATERIAL_LEAD: "Responsável material",
  SUPPORT: "Apoio",
};

type Item = { eventId: string; personId: string; role?: string; isCaptain?: boolean; notes?: string; force?: boolean };

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith("--")).map((a) => a.split("=")[0]));
const DRY = flags.has("--dry");
const GLOBAL_FORCE = flags.has("--force");
const NO_NOTIFY = flags.has("--no-notify");
const notesFlag = argv.find((a) => a.startsWith("--notes="))?.slice("--notes=".length);

/** Lê uma flag booleana com valor opcional: --x | --x=true | --x=false | --no-x. */
function boolFlag(name: string, dflt = false): boolean {
  if (flags.has(`--no-${name}`)) return false;
  const raw = argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!raw) return dflt;
  const val = raw.includes("=") ? raw.split("=")[1] : "true";
  return val !== "false" && val !== "0" && val !== "no";
}
const CLI_IS_CAPTAIN = boolFlag("captain", false);

// Link de PRODUÇÃO (mesmo domínio do PWA instalado). Override via NEXT_PUBLIC_SITE_URL.
const PROD_SITE_URL = "https://ep.aaee.com.br";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? PROD_SITE_URL;
const absoluteUrl = (url: string) =>
  /^https?:\/\//u.test(url) ? url : `${siteUrl.replace(/\/$/u, "")}/${url.replace(/^\//u, "")}`;

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  const chunks: Buffer[] = [];
  for await (const c of process.stdin) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString("utf8").trim();
}

async function main() {
  // 1) Monta a lista de itens: stdin JSON tem prioridade; senão, args posicionais.
  let items: Item[] = [];
  const stdin = await readStdin();
  if (stdin) {
    const parsed = JSON.parse(stdin);
    items = Array.isArray(parsed) ? parsed : [parsed];
  } else {
    const pos = argv.filter((a) => !a.startsWith("--"));
    const [eventId, personId, role] = pos;
    if (!eventId || !personId) {
      console.error('Uso: tsx scripts/allocate-supporter.ts <eventId> <personId> [ROLE] [--captain] [--force] [--dry]\n   ou: echo \'[{...}]\' | tsx scripts/allocate-supporter.ts');
      process.exit(1);
    }
    items = [{ eventId, personId, role, isCaptain: CLI_IS_CAPTAIN, notes: notesFlag }];
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  const pushReady = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT);
  if (pushReady) webpush.setVapidDetails(VAPID_SUBJECT!, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
  const waUrl = process.env.WHATSAPP_SERVICE_URL?.replace(/\/$/u, "");
  const waToken = process.env.WHATSAPP_SERVICE_TOKEN;
  const waReady = Boolean(waUrl && waToken);

  const results: Record<string, unknown>[] = [];

  for (const item of items) {
    const role = (item.role as AssignmentRole) ?? AssignmentRole.SUPPORTER;
    const isCaptain = item.isCaptain === true;
    const notes = item.notes ?? "";
    const force = GLOBAL_FORCE || item.force === true;
    const tag = `${item.eventId}/${item.personId}`;

    if (!(role in AssignmentRole)) { results.push({ tag, ok: false, error: `role inválido: ${role}` }); continue; }

    const ev = await prisma.event.findUnique({
      where: { id: item.eventId },
      select: { id: true, title: true, startTime: true, endTime: true, status: true, timeTbd: true },
    });
    if (!ev) { results.push({ tag, ok: false, error: "Evento não encontrado." }); continue; }
    if (ev.status === "CANCELLED") { results.push({ tag, ok: false, error: "Evento cancelado.", conflict: "event-cancelled" }); continue; }

    // Conflito: competindo em outro evento que sobrepõe.
    const competingElsewhere = ev.timeTbd ? null : await prisma.eventAthlete.findFirst({
      where: {
        personId: item.personId, eventId: { not: ev.id },
        event: { startTime: { lt: ev.endTime }, endTime: { gt: ev.startTime }, status: { in: COMMITTED_STATUSES }, timeTbd: false },
      },
      select: { event: { select: { title: true } } },
    });
    if (competingElsewhere) { results.push({ tag, ok: false, error: `Competindo em "${competingElsewhere.event.title}" no mesmo horário.`, conflict: "competing" }); continue; }

    // Conflito: é atleta NESTE evento.
    const competingHere = await prisma.eventAthlete.findFirst({ where: { eventId: ev.id, personId: item.personId }, select: { eventId: true } });
    if (competingHere) { results.push({ tag, ok: false, error: "É atleta neste evento — não pode ser torcida.", conflict: "athlete-here" }); continue; }

    // Conflito: já alocada em outro evento que sobrepõe (passa com force).
    if (!force && !ev.timeTbd) {
      const conflicting = await prisma.assignment.findFirst({
        where: {
          personId: item.personId, eventId: { not: ev.id },
          event: { startTime: { lt: ev.endTime }, endTime: { gt: ev.startTime }, status: { in: COMMITTED_STATUSES }, timeTbd: false },
        },
        select: { event: { select: { title: true } } },
      });
      if (conflicting) { results.push({ tag, ok: false, error: `Já escalada em "${conflicting.event.title}" no mesmo horário. Use force.`, conflict: "already-allocated" }); continue; }
    }

    const [existing, person] = await Promise.all([
      prisma.assignment.findUnique({ where: { eventId_personId: { eventId: ev.id, personId: item.personId } }, select: { role: true, isCaptain: true } }),
      prisma.person.findUnique({ where: { id: item.personId }, select: { userId: true, name: true } }),
    ]);

    // Mensagem (mesma lógica do notifyAssignmentChange).
    let body: string | null;
    if (!existing) body = `Você foi escalado(a) para ${ev.title}`;
    else if (isCaptain && !existing.isCaptain) body = `Você é capitão(ã) em ${ev.title}!`;
    else if (role !== existing.role) body = `Sua função em ${ev.title} mudou para ${ROLE_LABELS[role]}`;
    else body = null; // sem mudança relevante

    if (DRY) {
      const willNotify = Boolean(body && person?.userId && !NO_NOTIFY);
      results.push({ tag, ok: true, dry: true, who: person?.name, event: ev.title, role, isCaptain, willNotify, body, link: willNotify ? absoluteUrl(`/eventos/${ev.id}`) : null });
      continue;
    }

    await prisma.assignment.upsert({
      where: { eventId_personId: { eventId: ev.id, personId: item.personId } },
      create: { eventId: ev.id, personId: item.personId, role, isCaptain, notes: notes || null },
      update: { role, isCaptain, notes: notes || null },
    });

    let pushSent = 0, pushCleaned = 0, waSent = 0;
    if (body && person?.userId && !NO_NOTIFY) {
      const payload = { title: "Torcida · EP", body, url: `/eventos/${ev.id}`, tag: `assignment-${person.userId}-${ev.id}` };

      // WhatsApp — sempre.
      if (waReady) {
        const u = await prisma.user.findUnique({ where: { id: person.userId }, select: { phone: true, person: { select: { phone: true } } } });
        const phone = u?.person?.phone ?? u?.phone ?? null;
        if (phone) {
          const msg = `*${payload.title}*\n\n${payload.body}\n\n${absoluteUrl(payload.url)}`;
          try {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 5000);
            const res = await fetch(`${waUrl}/send`, { method: "POST", headers: { Authorization: `Bearer ${waToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ to: phone, message: msg }), signal: ctrl.signal });
            clearTimeout(t);
            if (res.ok) { const d = await res.json().catch(() => null) as { accepted?: number } | null; waSent = d?.accepted ?? 0; }
          } catch { /* best-effort */ }
        }
      }

      // Push — respeita NotificationPreference.allocation.
      if (pushReady) {
        const pref = await prisma.notificationPreference.findUnique({ where: { userId: person.userId } });
        if (!pref || pref.allocation) {
          const subs = await prisma.pushSubscription.findMany({ where: { userId: person.userId } });
          const pbody = JSON.stringify({ title: payload.title, body: payload.body, url: payload.url, tag: payload.tag });
          await Promise.all(subs.map(async (sub) => {
            try {
              await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, pbody, { urgency: "high", TTL: 3600 });
              pushSent += 1;
              await prisma.pushSubscription.update({ where: { id: sub.id }, data: { lastSeenAt: new Date() } });
            } catch (err) {
              const code = (err as { statusCode?: number })?.statusCode;
              if (code === 410 || code === 404) { await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined); pushCleaned += 1; }
            }
          }));
        }
      }
    }

    results.push({ tag, ok: true, who: person?.name, event: ev.title, role, isCaptain, notified: Boolean(body && person?.userId && !NO_NOTIFY), pushSent, pushCleaned, waSent, hasAccount: Boolean(person?.userId) });
  }

  await prisma.$disconnect();

  // Saída legível + JSON (parseável por outro processo/Claude).
  for (const r of results) {
    const mark = r.ok ? (r.dry ? "•" : "✓") : "✗";
    console.log(`${mark} ${r.who ?? r.tag}${r.event ? ` → ${r.event}` : ""}${r.ok ? ` [${r.role}${r.isCaptain ? "/cap" : ""}]` : ""}` +
      (r.ok ? (r.dry ? ` (notificaria: ${r.willNotify}${r.body ? ` · "${r.body}" · ${r.link}` : ""})` : ` · push ${r.pushSent} · whatsapp ${r.waSent}${r.notified ? "" : " · sem notificação"}`) : ` — ${r.error}`));
  }
  const okN = results.filter((r) => r.ok).length;
  console.log(`\n${okN}/${results.length} ok${DRY ? " (dry-run)" : ""}.`);
  console.log("JSON:" + JSON.stringify(results));
}

main().catch((e) => { console.error(e); process.exit(1); });
