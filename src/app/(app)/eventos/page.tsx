import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { toDatetimeLocal } from "@/lib/format";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { NewEventButton } from "./new-event-button";
import { EventsTable, type EventRow } from "./events-table";

export default async function EventsPage() {
  await requireRole(["DIRECTOR", "ADMIN"]);

  const [events, modalities, locations, athletes] = await Promise.all([
    prisma.event.findMany({
      orderBy: [{ day: "asc" }, { startTime: "asc" }],
      include: {
        modality: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
        athletes: { select: { personId: true } },
      },
    }),
    prisma.modality.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.location.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.person.findMany({
      where: { isAthlete: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, nickname: true },
    }),
  ]);

  const rows: EventRow[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    opponent: e.opponent,
    isConditional: e.isConditional,
    day: e.day,
    startTime: e.startTime,
    endTime: e.endTime,
    modalityName: e.modality.name,
    locationName: e.location?.name ?? null,
    phase: e.phase,
    priority: e.priority,
    status: e.status,
    desiredSupportersCount: e.desiredSupportersCount,
    initial: {
      id: e.id,
      modalityId: e.modalityId,
      title: e.title,
      description: e.description ?? "",
      day: e.day,
      startTime: toDatetimeLocal(e.startTime),
      endTime: toDatetimeLocal(e.endTime),
      locationId: e.locationId ?? "",
      opponent: e.opponent ?? "",
      phase: e.phase,
      priority: e.priority,
      status: e.status,
      isConditional: e.isConditional,
      desiredSupportersCount: e.desiredSupportersCount,
      athleteIds: e.athletes.map((a) => a.personId),
    },
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Gestão · Programação"
        title="Eventos"
        description="Programação completa do EP — jogos, lutas, provas e atividades."
        actions={
          <NewEventButton modalities={modalities} locations={locations} athletes={athletes} />
        }
      />

      {events.length === 0 ? (
        <EmptyState
          title="Nenhum evento cadastrado"
          description="Adicione o primeiro evento para começar a montar a programação."
        />
      ) : (
        <EventsTable
          events={rows}
          modalities={modalities}
          locations={locations}
          athletes={athletes}
        />
      )}
    </div>
  );
}
