import "dotenv/config";
import webpush from "web-push";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, AssignmentRole } from "@/generated/prisma/client";

/**
 * Ajuste pontual (dia 1): Manoela ficou indisponível 14h-16h, então sai do
 * Basquete Fem (13:45) e vira capitã da Natação (11:00).
 *   1. remove Assignment do Basquete Fem  → notifica cancelamento (igual removeAssignment)
 *   2. upsert capitão na Natação          → notifica "Você é capitão(ã) em ..." (igual seed)
 * Push (respeita opt-out allocation) + WhatsApp (sempre). Link de produção.
 * Uso: pnpm tsx scripts/adjust-manoela-dia1.ts [--dry]
 */

const DRY = process.argv.includes("--dry");
const MANOELA = "cmprijmbf001eq8ryosk0cwr9";
const BASQUETE_FEM = "cmprki3e00001a5ry2fxafm4d";
const NATACAO = "cmpsb2rch0001xlryoys3a5vm";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ep.aaee.com.br";
const absoluteUrl = (url: string) =>
  /^https?:\/\//u.test(url) ? url : `${siteUrl.replace(/\/$/u, "")}/${url.replace(/^\//u, "")}`;

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
const pushReady = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT);
if (pushReady) webpush.setVapidDetails(VAPID_SUBJECT!, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
const waUrl = process.env.WHATSAPP_SERVICE_URL?.replace(/\/$/u, "");
const waToken = process.env.WHATSAPP_SERVICE_TOKEN;
const waReady = Boolean(waUrl && waToken);

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function notify(userId: string, eventId: string, body: string) {
  const payload = { title: "Torcida · EP", body, url: `/eventos/${eventId}`, tag: `assignment-${userId}-${eventId}` };
  let pushSent = 0, waSent = 0;
  if (waReady) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true, person: { select: { phone: true } } } });
    const phone = u?.person?.phone ?? u?.phone ?? null;
    if (phone) {
      const msg = `*${payload.title}*\n\n${payload.body}\n\n${absoluteUrl(payload.url)}`;
      try {
        const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 5000);
        const res = await fetch(`${waUrl}/send`, { method: "POST", headers: { Authorization: `Bearer ${waToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ to: phone, message: msg }), signal: ctrl.signal });
        clearTimeout(t);
        if (res.ok) { const d = await res.json().catch(() => null) as { accepted?: number } | null; waSent = d?.accepted ?? 0; }
      } catch { /* best-effort */ }
    }
  }
  if (pushReady) {
    const pref = await prisma.notificationPreference.findUnique({ where: { userId } });
    if (!pref || pref.allocation) {
      const subs = await prisma.pushSubscription.findMany({ where: { userId } });
      const pbody = JSON.stringify({ title: payload.title, body: payload.body, url: payload.url, tag: payload.tag });
      await Promise.all(subs.map(async (sub) => {
        try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, pbody, { urgency: "high", TTL: 3600 }); pushSent += 1; }
        catch (err) { const c = (err as { statusCode?: number })?.statusCode; if (c === 410 || c === 404) await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined); }
      }));
    }
  }
  return { pushSent, waSent };
}

async function main() {
  const person = await prisma.person.findUnique({ where: { id: MANOELA }, select: { userId: true, name: true } });
  const [bf, nat] = await Promise.all([
    prisma.event.findUnique({ where: { id: BASQUETE_FEM }, select: { title: true } }),
    prisma.event.findUnique({ where: { id: NATACAO }, select: { title: true, startTime: true, endTime: true, status: true, timeTbd: true } }),
  ]);
  if (!person || !bf || !nat) throw new Error("Person/eventos não encontrados.");

  // Conflito da Natação (mesmas checagens do action) — Manoela competindo/atleta?
  const competing = nat.timeTbd ? null : await prisma.eventAthlete.findFirst({
    where: { personId: MANOELA, eventId: { not: NATACAO }, event: { startTime: { lt: nat.endTime }, endTime: { gt: nat.startTime }, status: { in: ["CONFIRMED", "POSTPONED"] }, timeTbd: false } },
    select: { event: { select: { title: true } } },
  });
  const athleteHere = await prisma.eventAthlete.findFirst({ where: { eventId: NATACAO, personId: MANOELA }, select: { eventId: true } });

  console.log(`Manoela (conta=${person.userId ? "sim" : "não"})`);
  console.log(`  1) remover de "${bf.title}" → "Sua alocação em ${bf.title} foi cancelada"`);
  console.log(`  2) capitã de "${nat.title}" → "Você é capitão(ã) em ${nat.title}!"  ${competing ? `⚠️ CONFLITO: competindo em ${competing.event.title}` : ""}${athleteHere ? "⚠️ é atleta na Natação" : ""}`);

  if (DRY) { console.log("\n(dry-run — nada gravado/enviado)"); await prisma.$disconnect(); return; }
  if (competing || athleteHere) { console.error("Abortado por conflito."); await prisma.$disconnect(); process.exit(1); }

  // 1) remove Basquete Fem (se existir) + notifica cancelamento
  const existedBF = await prisma.assignment.findUnique({ where: { eventId_personId: { eventId: BASQUETE_FEM, personId: MANOELA } }, select: { eventId: true } });
  if (existedBF) {
    await prisma.assignment.delete({ where: { eventId_personId: { eventId: BASQUETE_FEM, personId: MANOELA } } });
    const r = person.userId ? await notify(person.userId, BASQUETE_FEM, `Sua alocação em ${bf.title} foi cancelada`) : { pushSent: 0, waSent: 0 };
    console.log(`✓ removida do Basquete Fem · push ${r.pushSent} · whatsapp ${r.waSent}`);
  } else {
    console.log("• Manoela já não estava no Basquete Fem (nada a remover).");
  }

  // 2) capitã da Natação + notifica
  await prisma.assignment.upsert({
    where: { eventId_personId: { eventId: NATACAO, personId: MANOELA } },
    create: { eventId: NATACAO, personId: MANOELA, role: AssignmentRole.SUPPORTER, isCaptain: true },
    update: { role: AssignmentRole.SUPPORTER, isCaptain: true },
  });
  const r2 = person.userId ? await notify(person.userId, NATACAO, `Você é capitão(ã) em ${nat.title}!`) : { pushSent: 0, waSent: 0 };
  console.log(`✓ capitã da Natação · push ${r2.pushSent} · whatsapp ${r2.waSent}`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
