"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/auth";
import { AssignmentRole, EventStatus } from "@/generated/prisma/client";
import { ASSIGNMENT_ROLE_LABELS, COMMITTED_STATUSES } from "@/lib/format";
import { nowDate } from "@/lib/time";
import { sendPushToUser, sendPushToUsers } from "@/lib/push";
import { callSupportersSchema } from "@/lib/validations/push";
import type { ConflictKind } from "@/lib/sync/conflict";

export type ActionResult<TData = undefined> =
  | { ok: true; data?: TData }
  | { ok: false; error: string; conflict?: ConflictKind };

const CHECKIN_OPEN_BEFORE_MS = 30 * 60 * 1000; // libera 30min antes
const CHECKIN_OPEN_AFTER_MS = 60 * 60 * 1000; // expira 60min depois

const AssignSchema = z.object({
  eventId: z.string().min(1),
  personId: z.string().min(1),
  role: z.nativeEnum(AssignmentRole).default(AssignmentRole.SUPPORTER),
  isCaptain: z.boolean().default(false),
  notes: z.string().max(280).optional().or(z.literal("")),
  /** Permite escalar mesmo havendo conflito (aviso visual no painel). */
  force: z.boolean().optional().default(false),
});

export async function upsertAssignment(
  input: z.input<typeof AssignSchema>,
): Promise<ActionResult> {
  await requireRole(["DIRECTOR", "ADMIN"]);
  const parsed = AssignSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { eventId, personId, role, isCaptain, notes, force } = parsed.data;

  const targetEvent = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, startTime: true, endTime: true, status: true },
  });
  if (!targetEvent) return { ok: false, error: "Evento não encontrado." };
  if (targetEvent.status === "CANCELLED") {
    return {
      ok: false,
      error: "Não é possível escalar pessoas em evento cancelado.",
      conflict: "event-cancelled",
    };
  }

  // Conflito: a pessoa está competindo em outro evento que sobrepõe?
  const competingElsewhere = await prisma.eventAthlete.findFirst({
    where: {
      personId,
      eventId: { not: eventId },
      event: {
        startTime: { lt: targetEvent.endTime },
        endTime: { gt: targetEvent.startTime },
        status: { in: COMMITTED_STATUSES },
      },
    },
    select: { event: { select: { title: true } } },
  });
  if (competingElsewhere) {
    return {
      ok: false,
      error: `Pessoa está competindo em "${competingElsewhere.event.title}" no mesmo horário.`,
      conflict: "competing",
    };
  }

  // Conflito: a pessoa também é atleta NESTE evento (não pode ser torcida em jogo próprio)?
  const competingHere = await prisma.eventAthlete.findFirst({
    where: { eventId, personId },
    select: { eventId: true },
  });
  if (competingHere) {
    return {
      ok: false,
      error: "Pessoa é atleta neste evento e não pode ser escalada como torcida.",
      conflict: "athlete-here",
    };
  }

  // Conflito: alocada em outro evento que sobrepõe (passa com `force`).
  if (!force) {
    const conflicting = await prisma.assignment.findFirst({
      where: {
        personId,
        eventId: { not: eventId },
        event: {
          startTime: { lt: targetEvent.endTime },
          endTime: { gt: targetEvent.startTime },
          status: { in: COMMITTED_STATUSES },
        },
      },
      select: { event: { select: { title: true } } },
    });
    if (conflicting) {
      return {
        ok: false,
        error: `Pessoa já está escalada em "${conflicting.event.title}" no mesmo horário.`,
        conflict: "already-allocated",
      };
    }
  }

  // Estado anterior (pra distinguir nova escalação x mudança de papel) e o
  // userId da pessoa (push só faz sentido se ela tem conta).
  const [existing, person] = await Promise.all([
    prisma.assignment.findUnique({
      where: { eventId_personId: { eventId, personId } },
      select: { role: true, isCaptain: true },
    }),
    prisma.person.findUnique({
      where: { id: personId },
      select: { userId: true },
    }),
  ]);

  await prisma.assignment.upsert({
    where: { eventId_personId: { eventId, personId } },
    create: { eventId, personId, role, isCaptain, notes: notes || null },
    update: { role, isCaptain, notes: notes || null },
  });

  // Push best-effort — não bloqueia a resposta.
  if (person?.userId) {
    notifyAssignmentChange(person.userId, targetEvent.id, targetEvent.title, {
      existing,
      role,
      isCaptain,
    });
  }

  revalidatePath(`/eventos/${eventId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Dispara o push de mudança de alocação (B4). Best-effort e fire-and-forget.
 * Tag única por pessoa+evento substitui a notificação anterior.
 */
function notifyAssignmentChange(
  userId: string,
  eventId: string,
  eventTitle: string,
  change: {
    existing: { role: AssignmentRole; isCaptain: boolean } | null;
    role: AssignmentRole;
    isCaptain: boolean;
  },
) {
  const { existing, role, isCaptain } = change;
  let body: string;

  if (!existing) {
    body = `Você foi escalado(a) para ${eventTitle}`;
  } else if (isCaptain && !existing.isCaptain) {
    body = `Você é capitão(ã) em ${eventTitle}!`;
  } else if (role !== existing.role) {
    body = `Sua função em ${eventTitle} mudou para ${ASSIGNMENT_ROLE_LABELS[role]}`;
  } else {
    // Sem mudança relevante pra notificar (ex: só editou notas).
    return;
  }

  void sendPushToUser(userId, {
    title: "Torcida · EP",
    body,
    url: `/eventos/${eventId}`,
    tag: `assignment-${userId}-${eventId}`,
    category: "allocation",
  });
}

export async function removeAssignment(input: {
  eventId: string;
  personId: string;
}): Promise<ActionResult> {
  await requireRole(["DIRECTOR", "ADMIN"]);

  const [person, event] = await Promise.all([
    prisma.person.findUnique({
      where: { id: input.personId },
      select: { userId: true },
    }),
    prisma.event.findUnique({
      where: { id: input.eventId },
      select: { title: true },
    }),
  ]);

  await prisma.assignment.delete({
    where: { eventId_personId: { eventId: input.eventId, personId: input.personId } },
  });

  if (person?.userId && event) {
    void sendPushToUser(person.userId, {
      title: "Torcida · EP",
      body: `Sua alocação em ${event.title} foi cancelada`,
      url: `/eventos/${input.eventId}`,
      tag: `assignment-${person.userId}-${input.eventId}`,
      category: "allocation",
    });
  }

  revalidatePath(`/eventos/${input.eventId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function checkIn(eventId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!user.person) {
    return { ok: false, error: "Complete seu perfil antes de fazer check-in." };
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, startTime: true, endTime: true, status: true },
  });
  if (!event) return { ok: false, error: "Evento não encontrado." };

  if (event.status !== "CONFIRMED") {
    const label = event.status === "CANCELLED" ? "cancelado" : "adiado";
    return { ok: false, error: `Evento ${label} — check-in indisponível.` };
  }

  const now = nowDate().getTime();
  if (now < event.startTime.getTime() - CHECKIN_OPEN_BEFORE_MS) {
    return { ok: false, error: "Check-in só libera 30 minutos antes do horário." };
  }
  if (now > event.endTime.getTime() + CHECKIN_OPEN_AFTER_MS) {
    return { ok: false, error: "Janela de check-in encerrada." };
  }

  await prisma.checkIn.upsert({
    where: { eventId_personId: { eventId, personId: user.person.id } },
    create: { eventId, personId: user.person.id },
    update: {}, // mantém o registro original
  });
  revalidatePath(`/eventos/${eventId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function undoCheckIn(eventId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!user.person) return { ok: false, error: "Sem perfil." };
  try {
    await prisma.checkIn.delete({
      where: { eventId_personId: { eventId, personId: user.person.id } },
    });
  } catch {
    // já não existia — ok
  }
  revalidatePath(`/eventos/${eventId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

const StatusSchema = z.object({
  eventId: z.string().min(1),
  status: z.nativeEnum(EventStatus),
});

export type SetStatusImpact = { assignments: number; checkIns: number };

export async function setEventStatus(
  input: z.input<typeof StatusSchema>,
): Promise<ActionResult<SetStatusImpact>> {
  await requireRole(["DIRECTOR", "ADMIN"]);
  const parsed = StatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const updated = await prisma.event.update({
    where: { id: parsed.data.eventId },
    data: { status: parsed.data.status },
    select: {
      _count: { select: { assignments: true, checkIns: true } },
    },
  });

  revalidatePath(`/eventos/${parsed.data.eventId}`);
  revalidatePath("/eventos");
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  revalidatePath("/");
  return {
    ok: true,
    data: {
      assignments: updated._count.assignments,
      checkIns: updated._count.checkIns,
    },
  };
}

/**
 * "Chamado da torcida" (B6): capitão (ou manager) dispara um push pra toda a
 * torcida alocada no evento. Throttle de 5min por evento.
 */
export async function callSupporters(
  input: z.input<typeof callSupportersSchema>,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = callSupportersSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Mensagem inválida" };
  }
  const { eventId, message } = parsed.data;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, lastSupporterCallAt: true },
  });
  if (!event) return { ok: false, error: "Evento não encontrado." };

  // Permissão: manager OU capitão deste evento.
  const isManager = user.role === "DIRECTOR" || user.role === "ADMIN";
  let isCaptainHere = false;
  if (!isManager && user.person) {
    const a = await prisma.assignment.findUnique({
      where: { eventId_personId: { eventId, personId: user.person.id } },
      select: { isCaptain: true },
    });
    isCaptainHere = a?.isCaptain ?? false;
  }
  if (!isManager && !isCaptainHere) {
    return { ok: false, error: "Apenas capitães do evento podem chamar a torcida." };
  }

  const now = nowDate();

  const assignments = await prisma.assignment.findMany({
    where: { eventId },
    select: { person: { select: { userId: true } } },
  });
  const userIds = assignments
    .map((a) => a.person.userId)
    .filter((id): id is string => Boolean(id));

  await prisma.event.update({
    where: { id: eventId },
    data: { lastSupporterCallAt: now },
  });

  void sendPushToUsers(userIds, {
    title: `Chamado da torcida · ${event.title}`,
    body: message,
    url: `/eventos/${eventId}`,
    tag: `captain-call-${eventId}`,
    category: "captainCall",
  });

  return { ok: true };
}
