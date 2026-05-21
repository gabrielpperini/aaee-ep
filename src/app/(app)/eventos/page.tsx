import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import {
  PHASE_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  formatEventTime,
  priorityVariant,
  statusVariant,
  toDatetimeLocal,
} from "@/lib/format";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { NewEventButton } from "./new-event-button";
import { EventRowActions } from "./row-actions";
import type { EventFormValues } from "./actions";

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
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dia / Horário</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Modalidade</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Fase</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Torcida</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((e) => {
                const initial: Partial<EventFormValues> & { id: string; title: string } = {
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
                };
                return (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap">
                      <div className="text-xs text-muted-foreground">Dia {e.day}</div>
                      <div className="tabular-nums text-sm">{formatEventTime(e.startTime, e.endTime)}</div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {e.title}
                      {e.opponent && <span className="text-muted-foreground"> · vs {e.opponent}</span>}
                      {e.isConditional && (
                        <Badge variant="outline" className="ml-2">Condicional</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{e.modality.name}</TableCell>
                    <TableCell className="text-muted-foreground">{e.location?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{PHASE_LABELS[e.phase]}</TableCell>
                    <TableCell>
                      <Badge variant={priorityVariant(e.priority)}>{PRIORITY_LABELS[e.priority]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(e.status)}>{STATUS_LABELS[e.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {e.desiredSupportersCount || "—"}
                    </TableCell>
                    <TableCell>
                      <EventRowActions
                        event={initial}
                        modalities={modalities}
                        locations={locations}
                        athletes={athletes}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
