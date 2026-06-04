import "dotenv/config";
import webpush from "web-push";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, AssignmentRole } from "@/generated/prisma/client";

/**
 * Escala os capitães da torcida do Dia 1 e notifica cada um.
 * Uso: pnpm tsx scripts/seed-captains-dia1.ts [--dry]
 *
 * Standalone (não importa src/lib/push.ts nem src/lib/whatsapp.ts, que são
 * server-only do Next), mas replica EXATAMENTE o que o server action
 * `upsertAssignment` faz:
 *   1. valida conflitos (competindo / atleta no próprio evento / já alocada);
 *   2. upsert da Assignment (role SUPPORTER + isCaptain);
 *   3. push best-effort respeitando NotificationPreference.allocation +
 *      cleanup de subscriptions 410/404;
 *   4. WhatsApp best-effort (sempre, ignora opt-out) — no-op sem env do serviço.
 *
 * Diferença proposital: o action só notifica na TRANSIÇÃO p/ capitão. Aqui,
 * como é um (re)seed idempotente, sempre mandamos o aviso de capitão.
 */

const DRY = process.argv.includes("--dry");

// eventId, personId, rótulo (só p/ log). Títulos vêm do banco.
const CAPTAINS: { eventId: string; personId: string; who: string }[] = [
  { who: "Giulia",   personId: "cmprijll3000pq8ryhohk7o8v", eventId: "cmpsb2rgo0002xlry1i2u2fi4" }, // Judô 12:00
  { who: "Yuri",     personId: "cmprijnfs0023q8ry6sbgqn8k", eventId: "cmprki3nv000ba5rywnd4rl63" }, // Voleibol Masc 13:30
  { who: "Manoela",  personId: "cmprijmbf001eq8ryosk0cwr9", eventId: "cmprki3e00001a5ry2fxafm4d" }, // Basquete Fem 13:45
  { who: "Isabella", personId: "cmprijlqh000uq8rym4d2nveq", eventId: "cmprki3ii0005a5ryu1d65flb" }, // Handebol Masc 15:30
  { who: "Luiz",     personId: "cmprijm9o001cq8ryjz2r3sna", eventId: "cmprki3he0004a5ryzqtzuqyx" }, // Futsal Fem 16:45
  { who: "Isabella", personId: "cmprijlqh000uq8rym4d2nveq", eventId: "cmprki3on000ca5rygn2irv2l" }, // Voleibol Fem 18:00
  { who: "Isabella", personId: "cmprijlqh000uq8rym4d2nveq", eventId: "cmprki3ep0002a5rywjtsb17g" }, // Futebol de Campo 13:35
];

const COMMITTED_STATUSES = ["CONFIRMED", "POSTPONED"] as const; // espelha src/lib/format

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ep.aaee.com.br";

function absoluteUrl(url: string): string {
  if (/^https?:\/\//u.test(url)) return url;
  return `${siteUrl.replace(/\/$/u, "")}/${url.replace(/^\//u, "")}`;
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  // --- push setup (no-op silencioso sem VAPID, igual lib/push) ---
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  const pushReady = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT);
  if (pushReady) webpush.setVapidDetails(VAPID_SUBJECT!, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
  else console.warn("⚠️  VAPID ausente — push será no-op.");

  const waUrl = process.env.WHATSAPP_SERVICE_URL?.replace(/\/$/u, "");
  const waToken = process.env.WHATSAPP_SERVICE_TOKEN;
  const waReady = Boolean(waUrl && waToken);
  if (!waReady) console.warn("⚠️  WHATSAPP_SERVICE_URL/TOKEN ausentes — WhatsApp será no-op.");

  for (const c of CAPTAINS) {
    const ev = await prisma.event.findUnique({
      where: { id: c.eventId },
      select: { id: true, title: true, startTime: true, endTime: true, status: true, timeTbd: true },
    });
    if (!ev) { console.error(`✗ ${c.who}: evento ${c.eventId} não encontrado`); continue; }
    if (ev.status === "CANCELLED") { console.error(`✗ ${c.who}: "${ev.title}" cancelado`); continue; }

    // Conflito: competindo em outro evento que sobrepõe.
    const competingElsewhere = ev.timeTbd ? null : await prisma.eventAthlete.findFirst({
      where: {
        personId: c.personId, eventId: { not: ev.id },
        event: { startTime: { lt: ev.endTime }, endTime: { gt: ev.startTime }, status: { in: COMMITTED_STATUSES as unknown as string[] }, timeTbd: false },
      },
      select: { event: { select: { title: true } } },
    });
    if (competingElsewhere) { console.error(`✗ ${c.who}: competindo em "${competingElsewhere.event.title}" no mesmo horário`); continue; }

    // Conflito: atleta no próprio evento.
    const competingHere = await prisma.eventAthlete.findFirst({ where: { eventId: ev.id, personId: c.personId }, select: { eventId: true } });
    if (competingHere) { console.error(`✗ ${c.who}: é atleta em "${ev.title}" — não pode ser torcida`); continue; }

    const [existing, person] = await Promise.all([
      prisma.assignment.findUnique({ where: { eventId_personId: { eventId: ev.id, personId: c.personId } }, select: { role: true, isCaptain: true } }),
      prisma.person.findUnique({ where: { id: c.personId }, select: { userId: true } }),
    ]);

    if (DRY) {
      console.log(`• [dry] ${c.who} → capitão em "${ev.title}" (existing=${existing ? (existing.isCaptain ? "já capitão" : existing.role) : "nenhum"}, conta=${person?.userId ? "sim" : "não"})`);
      continue;
    }

    await prisma.assignment.upsert({
      where: { eventId_personId: { eventId: ev.id, personId: c.personId } },
      create: { eventId: ev.id, personId: c.personId, role: AssignmentRole.SUPPORTER, isCaptain: true },
      update: { role: AssignmentRole.SUPPORTER, isCaptain: true },
    });

    const payload = {
      title: "Torcida · EP",
      body: `Você é capitão(ã) em ${ev.title}!`,
      url: `/eventos/${ev.id}`,
      tag: `assignment-${person?.userId}-${ev.id}`,
    };

    let pushSent = 0, pushCleaned = 0, waSent = 0;

    if (person?.userId) {
      // WhatsApp — sempre (ignora opt-out).
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
        const allowed = !pref || pref.allocation;
        if (allowed) {
          const subs = await prisma.pushSubscription.findMany({ where: { userId: person.userId } });
          const body = JSON.stringify({ title: payload.title, body: payload.body, url: payload.url, tag: payload.tag });
          await Promise.all(subs.map(async (sub) => {
            try {
              await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, body, { urgency: "high", TTL: 3600 });
              pushSent += 1;
              await prisma.pushSubscription.update({ where: { id: sub.id }, data: { lastSeenAt: new Date() } });
            } catch (err) {
              const code = (err as { statusCode?: number })?.statusCode;
              if (code === 410 || code === 404) { await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined); pushCleaned += 1; }
            }
          }));
        } else {
          console.log(`  (push opt-out de allocation p/ ${c.who})`);
        }
      }
    }

    console.log(`✓ ${c.who} → capitão "${ev.title}" · push ${pushSent}${pushCleaned ? ` (limpou ${pushCleaned})` : ""} · whatsapp ${waSent}${person?.userId ? "" : " · SEM CONTA"}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
