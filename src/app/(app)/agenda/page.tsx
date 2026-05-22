import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requireUser, canManage } from "@/lib/auth";
import {
  PHASE_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  priorityVariant,
  statusVariant,
} from "@/lib/format";
import { PageHeader } from "@/components/app/page-header";
import { EP_DAY_SHORT_LABEL, formatEpDayDate, getEpEdition } from "@/lib/ep-edition";
import { cn } from "@/lib/utils";

type SearchParams = { day?: string };

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const { day } = await searchParams;
  const selectedDay = day !== undefined && day !== "" ? Number(day) : undefined;

  const [events, edition] = await Promise.all([
    prisma.event.findMany({
      where: selectedDay !== undefined ? { day: selectedDay } : undefined,
      orderBy: [{ day: "asc" }, { startTime: "asc" }],
      include: {
        modality: { select: { name: true } },
        location: { select: { name: true, address: true } },
      },
    }),
    getEpEdition(),
  ]);

  const byDay = new Map<number, typeof events>();
  for (const e of events) {
    if (!byDay.has(e.day)) byDay.set(e.day, []);
    byDay.get(e.day)!.push(e);
  }
  const days = Array.from(byDay.keys()).sort((a, b) => a - b);

  return (
    <div>
      <PageHeader
        eyebrow="EP · três dias"
        title="Agenda"
        description="Programação completa da delegação — filtre por dia para focar."
        actions={
          <div className="flex flex-wrap gap-1.5">
            <DayChip day={null} active={selectedDay === undefined} />
            {[-1, 0, 1, 2, 3, 4].map((d) => (
              <DayChip key={d} day={d} active={selectedDay === d} />
            ))}
          </div>
        }
      />

      {events.length === 0 ? (
        <EmptyState
          title="Nenhum evento cadastrado ainda"
          description={
            canManage(user.role)
              ? "Comece em Eventos para adicionar a programação."
              : "Quando a programação for definida, ela aparece aqui."
          }
        />
      ) : (
        <div className="space-y-10">
          {days.map((d) => (
            <section key={d} className="relative">
              <DayHeader
                day={d}
                count={byDay.get(d)!.length}
                dateLabel={formatEpDayDate(edition.byDay[d])}
              />
              <ul className="mt-4 space-y-3">
                {byDay.get(d)!.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/eventos/${e.id}`}
                      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
                    >
                    <article className="group grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto] items-stretch overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-foreground/30 hover:shadow-md">
                      <div className="relative flex w-24 flex-col items-center justify-center border-r border-dashed border-border bg-muted/40 px-3 py-3 text-center">
                        <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          Início
                        </span>
                        <span className="font-mono text-base font-semibold tabular-nums">
                          {formatTimeOnly(e.startTime)}
                        </span>
                        <span className="mt-0.5 text-[10px] text-muted-foreground tabular-nums">
                          até {formatTimeOnly(e.endTime)}
                        </span>
                        <span aria-hidden className="absolute -right-1.5 top-2 h-3 w-3 rounded-full bg-background" />
                        <span aria-hidden className="absolute -right-1.5 bottom-2 h-3 w-3 rounded-full bg-background" />
                      </div>

                      <div className="min-w-0 px-4 py-3 sm:px-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            {e.modality.name}
                            {e.location ? ` · ${e.location.name}` : ""}
                            {e.phase !== "OTHER" ? ` · ${PHASE_LABELS[e.phase]}` : ""}
                          </p>
                          {e.isConditional && (
                            <Badge variant="outline" className="text-[10px]">Condicional</Badge>
                          )}
                        </div>
                        <p className="mt-1 font-display text-lg sm:text-xl font-semibold leading-tight tracking-tight">
                          {e.title}
                          {e.opponent && (
                            <span className="text-muted-foreground"> · vs {e.opponent}</span>
                          )}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:hidden">
                          <Badge variant={priorityVariant(e.priority)}>
                            {PRIORITY_LABELS[e.priority]}
                          </Badge>
                          <Badge variant={statusVariant(e.status)}>{STATUS_LABELS[e.status]}</Badge>
                        </div>
                      </div>

                      <div className="hidden items-center gap-2 pr-5 sm:flex">
                        <Badge variant={priorityVariant(e.priority)}>
                          {PRIORITY_LABELS[e.priority]}
                        </Badge>
                        <Badge variant={statusVariant(e.status)}>{STATUS_LABELS[e.status]}</Badge>
                      </div>
                    </article>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function DayHeader({ day, count, dateLabel }: { day: number; count: number; dateLabel: string | null }) {
  const label = EP_DAY_SHORT_LABEL[day] ?? `Dia ${day}`;
  const numericPart = day >= 1 && day <= 3 ? String(day).padStart(2, "0") : null;
  return (
    <div className="flex items-end gap-4">
      {numericPart ? (
        <span className="stencil-number text-6xl sm:text-7xl leading-none text-foreground">
          {numericPart}
        </span>
      ) : (
        <span className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
          {label}
        </span>
      )}
      <div className="pb-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {numericPart ? `${label} do EP` : "Logística"}
          {dateLabel ? ` · ${dateLabel}` : ""}
        </p>
        <p className="font-display text-xl font-semibold tracking-tight">
          {count} {count === 1 ? "evento" : "eventos"}
        </p>
      </div>
      <span className="ml-auto hidden h-px flex-1 self-end bg-gradient-to-l from-transparent via-border to-border sm:block" />
    </div>
  );
}

function formatTimeOnly(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function DayChip({ day, active }: { day: number | null; active: boolean }) {
  const href = day === null ? "/agenda" : `/agenda?day=${day}`;
  const label = day === null ? "Todos" : (EP_DAY_SHORT_LABEL[day] ?? `Dia ${day}`);
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all",
        active
          ? "bg-foreground text-background border-foreground shadow-sm"
          : "bg-background hover:bg-accent hover:text-accent-foreground border-input text-muted-foreground hover:border-foreground/30",
      )}
    >
      {label}
    </Link>
  );
}

function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-dashed border-border bg-card/60 py-14 px-6 text-center">
      <div aria-hidden className="field-lines absolute inset-0 text-foreground/30 opacity-[0.08]" />
      <p className="relative font-display text-lg font-semibold">{title}</p>
      {description && <p className="relative mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
