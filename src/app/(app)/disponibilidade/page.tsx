import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { MapsLink } from "@/components/app/maps-link";
import { ASSIGNMENT_ROLE_LABELS, formatEventTime } from "@/lib/format";
import { EP_DAY_SHORT_LABEL, formatEpDayDate, getEpEdition } from "@/lib/ep-edition";

type Item = {
  eventId: string;
  title: string;
  modalityName: string;
  locationName: string | null;
  locationAddress: string | null;
  startTime: Date;
  endTime: Date;
  kind: "competing" | "assigned";
  role?: keyof typeof ASSIGNMENT_ROLE_LABELS;
  isCaptain?: boolean;
};

export default async function MeuHorarioPage() {
  const user = await requireUser();

  if (!user.person) {
    return (
      <div>
        <PageHeader
          eyebrow="Painel · Você"
          title="Meu horário"
          description="Sua agenda pessoal nos dias do EP."
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

  const [events, edition] = await Promise.all([
    prisma.event.findMany({
      where: {
        OR: [
          { athletes: { some: { personId } } },
          { assignments: { some: { personId } } },
        ],
        status: { notIn: ["CANCELLED"] },
      },
      orderBy: [{ day: "asc" }, { startTime: "asc" }],
      include: {
        modality: { select: { name: true } },
        location: { select: { name: true, address: true } },
        assignments: { where: { personId }, select: { role: true, isCaptain: true } },
        athletes: { where: { personId }, select: { personId: true } },
      },
    }),
    getEpEdition(),
  ]);

  const items: Item[] = events.map((e) => {
    const isAthlete = e.athletes.length > 0;
    if (isAthlete) {
      return {
        eventId: e.id,
        title: e.title,
        modalityName: e.modality.name,
        locationName: e.location?.name ?? null,
        locationAddress: e.location?.address ?? null,
        startTime: e.startTime,
        endTime: e.endTime,
        kind: "competing",
      };
    }
    return {
      eventId: e.id,
      title: e.title,
      modalityName: e.modality.name,
      locationName: e.location?.name ?? null,
      locationAddress: e.location?.address ?? null,
      startTime: e.startTime,
      endTime: e.endTime,
      kind: "assigned",
      role: e.assignments[0]?.role,
      isCaptain: e.assignments[0]?.isCaptain,
    };
  });

  const byDay = new Map<number, Item[]>();
  for (const it of items) {
    const day = events.find((e) => e.id === it.eventId)!.day;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(it);
  }
  const days = Array.from(byDay.keys()).sort((a, b) => a - b);

  const totalCompeting = items.filter((i) => i.kind === "competing").length;
  const totalAssigned = items.filter((i) => i.kind === "assigned").length;

  return (
    <div>
      <PageHeader
        eyebrow="Painel · Você"
        title="Meu horário"
        description="Cronologia dos seus compromissos no EP. Você é livre fora desses horários."
      />

      <Summary competing={totalCompeting} assigned={totalAssigned} />

      {items.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card/60 p-8 text-center">
          <p className="font-display text-lg font-semibold">
            Você ainda não tem compromissos no EP
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Quando você for escalado pra torcida ou tiver jogo como atleta, aparece aqui.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {days.map((day) => (
            <DaySection
              key={day}
              day={day}
              dateLabel={formatEpDayDate(edition.byDay[day])}
              items={byDay.get(day)!}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Summary({ competing, assigned }: { competing: number; assigned: number }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 text-destructive">
        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
        Competindo: {competing}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary bg-primary px-3 py-1 text-primary-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
        Escalado: {assigned}
      </span>
    </div>
  );
}

function DaySection({
  day,
  dateLabel,
  items,
}: {
  day: number;
  dateLabel: string | null;
  items: Item[];
}) {
  const label = EP_DAY_SHORT_LABEL[day] ?? `Dia ${day}`;
  return (
    <section>
      <div className="flex items-baseline gap-3 border-b border-border pb-2">
        <span className="font-display text-xl font-semibold tracking-tight">{label}</span>
        {dateLabel && (
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {dateLabel}
          </span>
        )}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {items.length} {items.length === 1 ? "item" : "itens"}
        </span>
      </div>
      <ul className="mt-3 space-y-2.5">
        {items.map((it) => (
          <li key={it.eventId}>
            <ItemRow item={it} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ItemRow({ item }: { item: Item }) {
  const isCompeting = item.kind === "competing";
  return (
    <article
      className={
        isCompeting
          ? "grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3"
          : "grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3"
      }
    >
      <div className="flex w-20 flex-col items-center justify-center rounded-lg border border-border bg-background px-2 py-2 text-center">
        <span className="font-mono text-base font-semibold tabular-nums">
          {formatHour(item.startTime)}
        </span>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          até {formatHour(item.endTime)}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {item.modalityName}
          {item.locationName ? ` · ${item.locationName}` : ""}
        </p>
        <Link
          href={`/eventos/${item.eventId}`}
          className="block font-display text-lg font-semibold leading-tight tracking-tight hover:underline truncate"
        >
          {item.title}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge
            variant={isCompeting ? "destructive" : "secondary"}
            className="text-[10px]"
          >
            {isCompeting
              ? "Competindo"
              : item.role
                ? `${ASSIGNMENT_ROLE_LABELS[item.role]}${item.isCaptain ? " · capitão" : ""}`
                : "Escalado"}
          </Badge>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {formatEventTime(item.startTime, item.endTime)}
          </span>
        </div>
      </div>
      <div className="col-span-2 sm:col-span-1 sm:justify-self-end">
        <MapsLink address={item.locationAddress} variant="inline" />
      </div>
    </article>
  );
}

function formatHour(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
