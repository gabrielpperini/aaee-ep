"use server";

// Auditoria server-side da fila offline (MVP 3 / C3).
// A fila operacional vive no client (Dexie); aqui só registramos o RESULTADO
// do processamento que precisa de visibilidade — conflitos e falhas — pra
// diretoria poder acompanhar, e disparamos o aviso de conflito de escalação.

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDirectorUserIds } from "@/lib/directors";
import { sendPushToUsers } from "@/lib/push";
import type { ConflictKind } from "@/lib/sync/conflict";
import type { Prisma } from "@/generated/prisma/client";

export async function logSyncOperation(input: {
  kind: string;
  payload: Record<string, unknown>;
  status: "done" | "conflict" | "failed";
  conflict?: ConflictKind;
  error?: string;
}): Promise<void> {
  const user = await requireUser();
  await prisma.syncOperation.create({
    data: {
      userId: user.id,
      kind: input.kind,
      payload: input.payload as Prisma.InputJsonValue,
      status: input.status,
      error: input.error ?? null,
    },
  });

  // Conflito de escalação → avisa a diretoria (categoria `syncConflict`).
  if (input.status === "conflict" && input.kind === "allocate") {
    await notifyDirectorsOfAllocationConflict(user.id, input.payload, input.error);
  }
}

/** Push pra diretoria (exceto o autor) quando uma escalação offline conflita. */
async function notifyDirectorsOfAllocationConflict(
  actorUserId: string,
  payload: Record<string, unknown>,
  error?: string,
): Promise<void> {
  try {
    const eventId = typeof payload.eventId === "string" ? payload.eventId : null;
    const personId = typeof payload.personId === "string" ? payload.personId : null;
    if (!eventId) return;

    const [event, person, directorIds] = await Promise.all([
      prisma.event.findUnique({ where: { id: eventId }, select: { title: true } }),
      personId
        ? prisma.person.findUnique({
            where: { id: personId },
            select: { name: true, nickname: true },
          })
        : Promise.resolve(null),
      getDirectorUserIds(actorUserId),
    ]);

    if (directorIds.length === 0) return;

    const who = person ? person.nickname || person.name : "alguém";
    const where = event ? event.title : "um evento";

    await sendPushToUsers(directorIds, {
      title: "Conflito de escalação",
      body: error
        ? `${who} × ${where}: ${error}`
        : `Conflito ao escalar ${who} em ${where}.`,
      url: `/eventos/${eventId}`,
      tag: `sync-conflict-${eventId}`,
      category: "syncConflict",
    });
  } catch {
    // Best-effort — aviso de conflito nunca pode quebrar a sincronização.
  }
}
