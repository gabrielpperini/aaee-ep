import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";
import { nowDate } from "@/lib/time";
import { formatEventTime } from "@/lib/format";

// web-push precisa do runtime Node (não Edge).
export const runtime = "nodejs";
// Sempre dinâmico — depende de "agora".
export const dynamic = "force-dynamic";

const WINDOW_BEFORE_MS = 25 * 60 * 1000;
const WINDOW_AFTER_MS = 35 * 60 * 1000;

/**
 * Lembrete T-30min (B5). Roda a cada 5min via Vercel Cron.
 * Idempotente: marca `Assignment.reminderSentAt` pra não duplicar.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const now = nowDate();
  const windowStart = new Date(now.getTime() + WINDOW_BEFORE_MS);
  const windowEnd = new Date(now.getTime() + WINDOW_AFTER_MS);

  // Assignments de eventos confirmados começando na janela [+25min, +35min],
  // ainda sem lembrete enviado e cuja pessoa tem conta.
  const assignments = await prisma.assignment.findMany({
    where: {
      reminderSentAt: null,
      person: { userId: { not: null } },
      event: {
        status: "CONFIRMED",
        startTime: { gte: windowStart, lte: windowEnd },
      },
    },
    select: {
      eventId: true,
      personId: true,
      person: { select: { userId: true } },
      event: { select: { id: true, title: true, startTime: true, endTime: true } },
    },
  });

  let sent = 0;
  for (const a of assignments) {
    const userId = a.person.userId;
    if (!userId) continue;
    await sendPushToUser(userId, {
      title: `Começa em ~30min · ${a.event.title}`,
      body: formatEventTime(a.event.startTime, a.event.endTime),
      url: `/eventos/${a.event.id}`,
      tag: `reminder-${a.event.id}`,
      category: "eventReminder",
    });
    await prisma.assignment.update({
      where: { eventId_personId: { eventId: a.eventId, personId: a.personId } },
      data: { reminderSentAt: now },
    });
    sent += 1;
  }

  return NextResponse.json({ ok: true, candidates: assignments.length, sent });
}
