import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireUser, canManage } from "@/lib/auth";
import {
  ASSIGNMENT_ROLE_LABELS,
  PHASE_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  formatDateTime,
  formatEventTime,
  priorityVariant,
  statusVariant,
} from "@/lib/format";
import { PageHeader } from "@/components/app/page-header";
import { AllocationPanel } from "./allocation-panel";
import { CheckInButton } from "./checkin-button";
import { EventStatusActions } from "./event-status-actions";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      modality: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } },
      athletes: { include: { person: { select: { id: true, name: true, nickname: true } } } },
      assignments: {
        include: { person: { select: { id: true, name: true, nickname: true } } },
        orderBy: [{ isCaptain: "desc" }, { role: "asc" }],
      },
      checkIns: {
        include: { person: { select: { id: true, name: true, nickname: true } } },
        orderBy: { checkedAt: "asc" },
      },
    },
  });

  if (!event) notFound();

  const isManager = canManage(user.role);

  // ----- Pessoas que podem ser escaladas -----
  // Regra nova: todo mundo é disponível por padrão. Excluímos quem está
  // competindo neste evento, quem já está alocado aqui, e marcamos com
  // alerta quem tem alocação conflitante em outro evento que sobrepõe.
  let availablePeople: Array<{
    id: string;
    name: string;
    nickname: string | null;
    conflict: { eventId: string; title: string } | null;
    competingElsewhere: { eventId: string; title: string } | null;
  }> = [];

  if (isManager) {
    const assignedIds = new Set(event.assignments.map((a) => a.personId));
    const competingIds = new Set(event.athletes.map((a) => a.personId));

    const [people, conflicts, competingConflicts] = await Promise.all([
      prisma.person.findMany({
        where: {
          id: { notIn: [...assignedIds, ...competingIds] },
        },
        orderBy: [{ name: "asc" }],
        select: { id: true, name: true, nickname: true },
      }),
      prisma.assignment.findMany({
        where: {
          eventId: { not: event.id },
          event: {
            startTime: { lt: event.endTime },
            endTime: { gt: event.startTime },
            status: { notIn: ["CANCELLED"] },
          },
        },
        select: {
          personId: true,
          event: { select: { id: true, title: true } },
        },
      }),
      prisma.eventAthlete.findMany({
        where: {
          eventId: { not: event.id },
          event: {
            startTime: { lt: event.endTime },
            endTime: { gt: event.startTime },
            status: { notIn: ["CANCELLED"] },
          },
        },
        select: {
          personId: true,
          event: { select: { id: true, title: true } },
        },
      }),
    ]);

    const conflictByPerson = new Map<string, { eventId: string; title: string }>();
    for (const c of conflicts) {
      if (!conflictByPerson.has(c.personId)) {
        conflictByPerson.set(c.personId, { eventId: c.event.id, title: c.event.title });
      }
    }
    const competingByPerson = new Map<string, { eventId: string; title: string }>();
    for (const c of competingConflicts) {
      if (!competingByPerson.has(c.personId)) {
        competingByPerson.set(c.personId, { eventId: c.event.id, title: c.event.title });
      }
    }

    availablePeople = people.map((p) => ({
      ...p,
      conflict: conflictByPerson.get(p.id) ?? null,
      competingElsewhere: competingByPerson.get(p.id) ?? null,
    }));
  }

  const captainCount = event.assignments.filter((a) => a.isCaptain).length;
  const myAssignment = user.person
    ? event.assignments.find((a) => a.personId === user.person!.id)
    : null;
  const myCheckIn = user.person
    ? event.checkIns.find((c) => c.personId === user.person!.id)
    : null;

  return (
    <div>
      <Link
        href="/agenda"
        className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para agenda
      </Link>
      <PageHeader
        eyebrow={`${event.modality.name} · Dia ${event.day}`}
        title={event.title + (event.opponent ? ` · vs ${event.opponent}` : "")}
        description={[
          formatEventTime(event.startTime, event.endTime),
          event.location?.name,
          event.phase !== "OTHER" ? PHASE_LABELS[event.phase] : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={priorityVariant(event.priority)}>
              {PRIORITY_LABELS[event.priority]}
            </Badge>
            <Badge variant={statusVariant(event.status)}>{STATUS_LABELS[event.status]}</Badge>
            {event.isConditional && <Badge variant="outline">Condicional</Badge>}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Você</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {myAssignment && (
              <div>
                <div className="text-xs text-muted-foreground">Seu papel neste evento</div>
                <div className="mt-0.5 flex items-center gap-2">
                  <Badge variant="secondary">
                    {ASSIGNMENT_ROLE_LABELS[myAssignment.role]}
                  </Badge>
                  {myAssignment.isCaptain && <Badge>Capitão</Badge>}
                </div>
                {myAssignment.notes && (
                  <p className="mt-2 text-xs text-muted-foreground">{myAssignment.notes}</p>
                )}
              </div>
            )}
            <CheckInButton
              eventId={event.id}
              checkedAt={myCheckIn?.checkedAt ?? null}
              disabled={!user.person}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Torcida alocada</CardTitle>
            <div className="text-xs text-muted-foreground tabular-nums">
              {event.assignments.length}
              {event.desiredSupportersCount ? ` / ${event.desiredSupportersCount}` : ""} pessoas
              {captainCount > 0 ? ` · ${captainCount} capitão(ões)` : ""}
            </div>
          </CardHeader>
          <CardContent>
            {event.assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ninguém alocado ainda.
                {isManager ? " Use o painel abaixo para escalar." : ""}
              </p>
            ) : (
              <ul className="space-y-2">
                {event.assignments.map((a) => (
                  <li
                    key={a.personId}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-card/60 px-3 py-2"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {a.person.name}
                        {a.person.nickname && (
                          <span className="text-muted-foreground"> ({a.person.nickname})</span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">
                          {ASSIGNMENT_ROLE_LABELS[a.role]}
                        </Badge>
                        {a.isCaptain && <Badge className="text-[10px]">Capitão</Badge>}
                      </div>
                    </div>
                    {event.checkIns.some((c) => c.personId === a.personId) && (
                      <Badge variant="outline" className="text-[10px]">
                        Presente
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {isManager && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Painel da diretoria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <EventStatusActions eventId={event.id} status={event.status} />
              <AllocationPanel
                eventId={event.id}
                desiredSupportersCount={event.desiredSupportersCount}
                assignments={event.assignments.map((a) => ({
                  personId: a.personId,
                  name: a.person.name,
                  nickname: a.person.nickname,
                  role: a.role,
                  isCaptain: a.isCaptain,
                  notes: a.notes,
                }))}
                available={availablePeople}
              />
            </CardContent>
          </Card>
        )}

        {event.checkIns.length > 0 && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Check-ins ({event.checkIns.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                {event.checkIns.map((c) => (
                  <li
                    key={c.personId}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-card/60 px-3 py-2"
                  >
                    <span className="font-medium">
                      {c.person.nickname || c.person.name}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatDateTime(c.checkedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
