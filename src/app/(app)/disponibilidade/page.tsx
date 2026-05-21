import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { ASSIGNMENT_ROLE_LABELS } from "@/lib/format";
import { generateSlots, slotCoveredBy, slotLabel } from "@/lib/slots";
import { cn } from "@/lib/utils";

const DAYS = [1, 2, 3] as const;

type SlotState =
  | { kind: "free" }
  | { kind: "competing"; title: string; eventId: string }
  | {
      kind: "assigned";
      title: string;
      eventId: string;
      role: keyof typeof ASSIGNMENT_ROLE_LABELS;
      isCaptain: boolean;
    };

export default async function MeuHorarioPage() {
  const user = await requireUser();

  if (!user.person) {
    return (
      <div>
        <PageHeader
          eyebrow="Painel · Você"
          title="Meu horário"
          description="Visão dos 3 dias do EP com o que você tem de compromisso."
        />
        <div className="rounded-xl border border-dashed border-border bg-card/60 p-8 text-center">
          <p className="font-display text-lg font-semibold">Complete seu perfil primeiro</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Precisamos do seu cadastro pra montar sua agenda pessoal.
          </p>
          <Link
            href="/perfil"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            Abrir meu perfil →
          </Link>
        </div>
      </div>
    );
  }

  const personId = user.person.id;

  const events = await prisma.event.findMany({
    where: {
      OR: [
        { athletes: { some: { personId } } },
        { assignments: { some: { personId } } },
      ],
      status: { notIn: ["CANCELLED"] },
    },
    orderBy: [{ day: "asc" }, { startTime: "asc" }],
    include: {
      assignments: {
        where: { personId },
        select: { role: true, isCaptain: true },
      },
      athletes: { where: { personId }, select: { personId: true } },
    },
  });

  const allEventsForWindow = await prisma.event.findMany({
    where: { status: { notIn: ["CANCELLED"] } },
    orderBy: [{ day: "asc" }, { startTime: "asc" }],
    select: { day: true, startTime: true, endTime: true },
  });

  type DayBlock = {
    day: number;
    dateLabel: string | null;
    slots: { key: string; label: string; state: SlotState }[];
    summary: { competing: number; assigned: number; total: number };
  };

  const days: DayBlock[] = DAYS.map((day) => {
    const windowSrc = allEventsForWindow.filter((e) => e.day === day);
    if (windowSrc.length === 0) {
      return {
        day,
        dateLabel: null,
        slots: [],
        summary: { competing: 0, assigned: 0, total: 0 },
      };
    }

    const start = windowSrc.reduce(
      (min, e) => (e.startTime < min ? e.startTime : min),
      windowSrc[0].startTime,
    );
    const end = windowSrc.reduce(
      (max, e) => (e.endTime > max ? e.endTime : max),
      windowSrc[0].endTime,
    );

    const myCompeting = events
      .filter((e) => e.day === day && e.athletes.length > 0)
      .map((e) => ({ id: e.id, title: e.title, start: e.startTime, end: e.endTime }));
    const myAssignments = events
      .filter((e) => e.day === day && e.assignments.length > 0)
      .map((e) => ({
        id: e.id,
        title: e.title,
        start: e.startTime,
        end: e.endTime,
        role: e.assignments[0].role,
        isCaptain: e.assignments[0].isCaptain,
      }));

    const allSlots = generateSlots(start, end);

    const slots = allSlots.map((slotStart) => {
      // Competir tem prioridade sobre alocação (não dá pra fazer ambos)
      const competing = myCompeting.find((c) =>
        slotCoveredBy(slotStart, [{ start: c.start, end: c.end }]),
      );
      if (competing) {
        return {
          key: slotStart.toISOString(),
          label: slotLabel(slotStart),
          state: { kind: "competing", title: competing.title, eventId: competing.id } satisfies SlotState,
        };
      }
      const assigned = myAssignments.find((a) =>
        slotCoveredBy(slotStart, [{ start: a.start, end: a.end }]),
      );
      if (assigned) {
        return {
          key: slotStart.toISOString(),
          label: slotLabel(slotStart),
          state: {
            kind: "assigned",
            title: assigned.title,
            eventId: assigned.id,
            role: assigned.role,
            isCaptain: assigned.isCaptain,
          } satisfies SlotState,
        };
      }
      return {
        key: slotStart.toISOString(),
        label: slotLabel(slotStart),
        state: { kind: "free" } satisfies SlotState,
      };
    });

    const summary = {
      competing: slots.filter((s) => s.state.kind === "competing").length,
      assigned: slots.filter((s) => s.state.kind === "assigned").length,
      total: slots.length,
    };

    return {
      day,
      dateLabel: start.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        weekday: "short",
      }),
      slots,
      summary,
    };
  });

  return (
    <div>
      <PageHeader
        eyebrow="Painel · Você"
        title="Meu horário"
        description="Você está disponível por padrão. Aqui aparecem só os horários em que você compete ou foi escalado."
      />

      <Legend />

      <div className="grid gap-4 lg:grid-cols-3">
        {days.map((d) => (
          <Card key={d.day}>
            <CardHeader className="flex flex-row items-end justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Dia {d.day}
                </p>
                <CardTitle className="text-xl">{d.dateLabel ?? "Sem programação"}</CardTitle>
              </div>
              {d.slots.length > 0 && (
                <div className="text-right text-xs text-muted-foreground tabular-nums">
                  {d.summary.competing > 0 && <div>{d.summary.competing} competindo</div>}
                  {d.summary.assigned > 0 && <div>{d.summary.assigned} escalado</div>}
                  <div>
                    {d.summary.total - d.summary.competing - d.summary.assigned} livre
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {d.slots.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum evento cadastrado para este dia ainda.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {d.slots.map((s) => (
                    <SlotChip key={s.key} label={s.label} state={s.state} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <DetailList days={days} />
    </div>
  );
}

function SlotChip({ label, state }: { label: string; state: SlotState }) {
  if (state.kind === "competing") {
    return (
      <Link
        href={`/eventos/${state.eventId}`}
        title={`Competindo: ${state.title}`}
        className="rounded-md border border-destructive/50 bg-destructive/10 px-2 py-1.5 text-center text-xs font-mono tabular-nums text-destructive hover:bg-destructive/15"
      >
        {label}
      </Link>
    );
  }
  if (state.kind === "assigned") {
    return (
      <Link
        href={`/eventos/${state.eventId}`}
        title={`Escalado em: ${state.title}`}
        className="rounded-md border border-primary bg-primary px-2 py-1.5 text-center text-xs font-mono tabular-nums text-primary-foreground hover:bg-primary/90"
      >
        {label}
      </Link>
    );
  }
  return (
    <div
      className={cn(
        "rounded-md border border-input bg-background px-2 py-1.5 text-center text-xs font-mono tabular-nums text-muted-foreground",
      )}
    >
      {label}
    </div>
  );
}

function Legend() {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-5 rounded-sm border border-destructive/50 bg-destructive/10" />
        Competindo
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-5 rounded-sm border border-primary bg-primary" />
        Escalado(a) na torcida
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-5 rounded-sm border border-input bg-background" />
        Livre — você está disponível
      </span>
    </div>
  );
}

function DetailList({
  days,
}: {
  days: { day: number; slots: { state: SlotState }[] }[];
}) {
  const items: { day: number; eventId: string; title: string; tag: string }[] = [];
  for (const d of days) {
    const seen = new Set<string>();
    for (const s of d.slots) {
      if (s.state.kind === "free") continue;
      const eventId = s.state.eventId;
      if (seen.has(eventId)) continue;
      seen.add(eventId);
      const tag =
        s.state.kind === "competing"
          ? "Competindo"
          : `${ASSIGNMENT_ROLE_LABELS[s.state.role]}${s.state.isCaptain ? " · capitão" : ""}`;
      items.push({ day: d.day, eventId, title: s.state.title, tag });
    }
  }

  if (items.length === 0) return null;

  return (
    <section className="mt-8">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        Seus compromissos
      </p>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.eventId}>
            <Link
              href={`/eventos/${it.eventId}`}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 hover:border-foreground/30 hover:bg-accent"
            >
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Dia {it.day}
                </div>
                <div className="text-sm font-medium">{it.title}</div>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {it.tag}
              </Badge>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
