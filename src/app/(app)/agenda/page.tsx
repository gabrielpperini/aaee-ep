import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireUser, canManage } from "@/lib/auth";
import {
  PHASE_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  formatEventTime,
  priorityVariant,
  statusVariant,
} from "@/lib/format";
import { PageHeader } from "@/components/app/page-header";

type SearchParams = { day?: string };

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const { day } = await searchParams;
  const selectedDay = day ? Number(day) : undefined;

  const events = await prisma.event.findMany({
    where: selectedDay ? { day: selectedDay } : undefined,
    orderBy: [{ day: "asc" }, { startTime: "asc" }],
    include: {
      modality: { select: { name: true } },
      location: { select: { name: true } },
    },
  });

  const byDay = new Map<number, typeof events>();
  for (const e of events) {
    if (!byDay.has(e.day)) byDay.set(e.day, []);
    byDay.get(e.day)!.push(e);
  }
  const days = Array.from(byDay.keys()).sort((a, b) => a - b);

  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Programação dos três dias do EP."
        actions={
          <div className="flex gap-1">
            <DayChip day={null} active={!selectedDay} />
            {[1, 2, 3].map((d) => (
              <DayChip key={d} day={d} active={selectedDay === d} />
            ))}
          </div>
        }
      />

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {canManage(user.role)
              ? "Nenhum evento cadastrado ainda — comece em Eventos."
              : "Nenhum evento cadastrado ainda."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {days.map((d) => (
            <section key={d}>
              <h2 className="text-lg font-semibold mb-3">Dia {d}</h2>
              <div className="space-y-2">
                {byDay.get(d)!.map((e) => (
                  <Card key={e.id}>
                    <CardContent className="py-4 flex flex-wrap items-center gap-4">
                      <div className="tabular-nums text-sm w-28 shrink-0">
                        {formatEventTime(e.startTime, e.endTime)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">
                          {e.title}
                          {e.opponent && (
                            <span className="text-muted-foreground"> · vs {e.opponent}</span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {e.modality.name}
                          {e.location ? ` · ${e.location.name}` : ""}
                          {e.phase !== "OTHER" ? ` · ${PHASE_LABELS[e.phase]}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {e.isConditional && <Badge variant="outline">Condicional</Badge>}
                        <Badge variant={priorityVariant(e.priority)}>
                          {PRIORITY_LABELS[e.priority]}
                        </Badge>
                        <Badge variant={statusVariant(e.status)}>{STATUS_LABELS[e.status]}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function DayChip({ day, active }: { day: number | null; active: boolean }) {
  const href = day === null ? "/agenda" : `/agenda?day=${day}`;
  const label = day === null ? "Todos" : `Dia ${day}`;
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 text-sm border transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background hover:bg-accent border-input"
      }`}
    >
      {label}
    </Link>
  );
}
