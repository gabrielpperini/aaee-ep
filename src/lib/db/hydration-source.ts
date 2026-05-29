// Fonte de hidratação do cache offline (server-only).
//
// Carrega as fatias que a pessoa usa offline — seus próprios eventos
// (competindo ou escalada), suas alocações e seus check-ins — e devolve no
// shape achatado que o Dexie guarda. Reaproveita o mesmo filtro de
// `disponibilidade/page.tsx`.

import { prisma } from "@/lib/prisma";
import { COMMITTED_STATUSES } from "@/lib/format";
import type {
  OfflineAssignment,
  OfflineCheckIn,
  OfflineEvent,
} from "@/lib/db/dexie";

export type HydrationData = {
  events: OfflineEvent[];
  assignments: OfflineAssignment[];
  checkIns: OfflineCheckIn[];
};

export async function loadHydrationData(
  personId: string,
): Promise<HydrationData> {
  const events = await prisma.event.findMany({
    where: {
      OR: [
        { athletes: { some: { personId } } },
        { assignments: { some: { personId } } },
      ],
      status: { in: COMMITTED_STATUSES },
    },
    orderBy: [{ day: "asc" }, { startTime: "asc" }],
    include: {
      modality: { select: { name: true } },
      location: { select: { name: true, address: true } },
      assignments: {
        where: { personId },
        select: { eventId: true, personId: true, role: true, isCaptain: true },
      },
      checkIns: {
        where: { personId },
        select: { eventId: true, personId: true, checkedAt: true },
      },
    },
  });

  return {
    events: events.map(
      (e): OfflineEvent => ({
        id: e.id,
        day: e.day,
        title: e.title,
        startTime: e.startTime.toISOString(),
        endTime: e.endTime.toISOString(),
        modalityName: e.modality.name,
        locationName: e.location?.name ?? null,
        locationAddress: e.location?.address ?? null,
        status: e.status,
      }),
    ),
    assignments: events.flatMap((e): OfflineAssignment[] =>
      e.assignments.map((a) => ({
        eventId: a.eventId,
        personId: a.personId,
        role: a.role,
        isCaptain: a.isCaptain,
      })),
    ),
    checkIns: events.flatMap((e): OfflineCheckIn[] =>
      e.checkIns.map((c) => ({
        eventId: c.eventId,
        personId: c.personId,
        checkedAt: c.checkedAt.toISOString(),
      })),
    ),
  };
}
