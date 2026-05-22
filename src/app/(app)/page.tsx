import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  Trophy,
  Users,
  Volleyball,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BrandMark } from "@/components/brand-mark";
import { MapsLink } from "@/components/app/maps-link";
import { prisma } from "@/lib/prisma";
import { requireUser, canManage } from "@/lib/auth";
import {
  ASSIGNMENT_ROLE_LABELS,
  deriveEventStatus,
  formatEventTime,
} from "@/lib/format";
import { EP_DAY_SHORT_LABEL, formatEpDayDate, getEpEdition } from "@/lib/ep-edition";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const user = await requireUser();
  const isManager = canManage(user.role);
  const personId = user.person?.id ?? null;

  const edition = await getEpEdition();

  // Visão de membro: só faz sentido se há Person vinculada.
  if (personId) {
    return <MemberHome user={user} personId={personId} edition={edition} isManager={isManager} />;
  }

  // Sem person vinculada (admin/diretor sem cadastro): mantém visão de gestão.
  return <ManagementHome name={user.email ?? "delegação"} edition={edition} />;
}

// ===== Visão do membro =====

async function MemberHome({
  user,
  personId,
  edition,
  isManager,
}: {
  user: { role: string; person: { name: string; nickname: string | null } | null };
  personId: string;
  edition: Awaited<ReturnType<typeof getEpEdition>>;
  isManager: boolean;
}) {
  const now = new Date();

  const [myAssignments, myAthleteEvents, openEvents, stats] = await Promise.all([
    prisma.event.findMany({
      where: {
        status: { notIn: ["CANCELLED"] },
        endTime: { gte: now },
        assignments: { some: { personId } },
      },
      orderBy: [{ startTime: "asc" }],
      include: {
        modality: { select: { name: true } },
        location: { select: { name: true, address: true } },
        assignments: {
          where: { personId },
          select: { role: true, isCaptain: true },
        },
      },
    }),
    prisma.event.findMany({
      where: {
        status: { notIn: ["CANCELLED"] },
        endTime: { gte: now },
        athletes: { some: { personId } },
      },
      orderBy: [{ startTime: "asc" }],
      include: {
        modality: { select: { name: true } },
        location: { select: { name: true, address: true } },
      },
    }),
    prisma.event.findMany({
      where: {
        status: { notIn: ["CANCELLED"] },
        endTime: { gte: now },
        assignments: { none: { personId } },
        athletes: { none: { personId } },
      },
      orderBy: [{ startTime: "asc" }],
      take: 30,
      include: {
        modality: { select: { name: true } },
        location: { select: { name: true, address: true } },
        _count: { select: { assignments: true } },
      },
    }),
    isManager
      ? Promise.all([
          prisma.person.count(),
          prisma.modality.count(),
          prisma.location.count(),
          prisma.event.count(),
        ])
      : Promise.resolve(null),
  ]);

  // Combina escalados + atleta pra calcular janelas ocupadas e "próximo compromisso".
  type Commitment = {
    id: string;
    title: string;
    day: number;
    startTime: Date;
    endTime: Date;
    location: { name: string; address: string | null } | null;
    modality: { name: string };
    kind: "assigned" | "athlete";
    role?: keyof typeof ASSIGNMENT_ROLE_LABELS;
    isCaptain?: boolean;
    isConditional: boolean;
    status: "CONFIRMED" | "CANCELLED" | "POSTPONED";
  };

  const commitments: Commitment[] = [
    ...myAssignments.map<Commitment>((e) => ({
      id: e.id,
      title: e.title,
      day: e.day,
      startTime: e.startTime,
      endTime: e.endTime,
      location: e.location,
      modality: e.modality,
      kind: "assigned",
      role: e.assignments[0]?.role,
      isCaptain: e.assignments[0]?.isCaptain,
      isConditional: e.isConditional,
      status: e.status,
    })),
    ...myAthleteEvents.map<Commitment>((e) => ({
      id: e.id,
      title: e.title,
      day: e.day,
      startTime: e.startTime,
      endTime: e.endTime,
      location: e.location,
      modality: e.modality,
      kind: "athlete",
      isConditional: e.isConditional,
      status: e.status,
    })),
  ].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  // Próximo: o primeiro compromisso futuro (ou já em andamento).
  const next = commitments.find((c) => c.endTime.getTime() >= now.getTime()) ?? null;

  // Eventos "abertos" filtrando conflitos de horário com qualquer compromisso da pessoa.
  const filteredOpen = openEvents.filter((e) =>
    !commitments.some(
      (c) =>
        c.startTime.getTime() < e.endTime.getTime() &&
        c.endTime.getTime() > e.startTime.getTime(),
    ),
  );

  const greetingName = user.person?.nickname ?? user.person?.name ?? "delegação";

  return (
    <div className="space-y-10">
      <NextHero next={next} editionDate={next ? edition.byDay[next.day] : null} name={greetingName} />

      {myAssignments.length > 0 && (
        <Section
          eyebrow="Sua escala"
          title="Meus eventos escalados"
          href="/disponibilidade"
          hrefLabel="Ver meu horário"
        >
          <ul className="space-y-3">
            {myAssignments.map((e) => (
              <li key={e.id}>
                <CommitmentRow
                  event={e}
                  role={e.assignments[0]?.role}
                  isCaptain={e.assignments[0]?.isCaptain}
                  dateLabel={formatEpDayDate(edition.byDay[e.day])}
                />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {myAthleteEvents.length > 0 && (
        <Section
          eyebrow="Você compete"
          title="Meus jogos como atleta"
        >
          <ul className="space-y-3">
            {myAthleteEvents.map((e) => (
              <li key={e.id}>
                <AthleteRow
                  event={e}
                  dateLabel={formatEpDayDate(edition.byDay[e.day])}
                />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section
        eyebrow="Pode aparecer"
        title="Eventos abertos pra torcida"
        description="Eventos confirmados em que você ainda não foi escalado e que não conflitam com seus horários."
        href="/agenda"
        hrefLabel="Agenda completa"
      >
        {filteredOpen.length === 0 ? (
          <EmptyState
            title="Sem eventos abertos pra você agora"
            description="Volte mais tarde — novas escalações abrem conforme a diretoria organiza a torcida."
          />
        ) : (
          <ul className="space-y-3">
            {filteredOpen.slice(0, 8).map((e) => (
              <li key={e.id}>
                <OpenEventRow
                  event={e}
                  dateLabel={formatEpDayDate(edition.byDay[e.day])}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {stats && (
        <ManagerStrip
          peopleCount={stats[0]}
          modalitiesCount={stats[1]}
          locationsCount={stats[2]}
          eventsCount={stats[3]}
        />
      )}
    </div>
  );
}

// ===== Visão de gestão (fallback quando user.person não existe) =====

async function ManagementHome({
  name,
  edition,
}: {
  name: string;
  edition: Awaited<ReturnType<typeof getEpEdition>>;
}) {
  const [peopleCount, modalitiesCount, locationsCount, eventsCount, upcoming] = await Promise.all([
    prisma.person.count(),
    prisma.modality.count(),
    prisma.location.count(),
    prisma.event.count(),
    prisma.event.findMany({
      where: { status: "CONFIRMED" },
      orderBy: [{ day: "asc" }, { startTime: "asc" }],
      take: 5,
      include: {
        modality: true,
        location: { select: { name: true, address: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-10">
      <section className="rise-in relative overflow-hidden rounded-2xl border border-border/80 bg-card text-card-foreground p-6 sm:p-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Olá, {name}.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Complete seu perfil para acessar sua agenda pessoal.
        </p>
        <Link
          href="/perfil"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          Abrir meu perfil →
        </Link>
      </section>

      <ManagerStrip
        peopleCount={peopleCount}
        modalitiesCount={modalitiesCount}
        locationsCount={locationsCount}
        eventsCount={eventsCount}
      />

      <Section eyebrow="Em destaque" title="Próximos eventos" href="/agenda" hrefLabel="Agenda completa">
        {upcoming.length === 0 ? (
          <EmptyState title="Nenhum evento cadastrado ainda" />
        ) : (
          <ul className="space-y-3">
            {upcoming.map((e) => (
              <li key={e.id}>
                <OpenEventRow
                  event={e}
                  dateLabel={formatEpDayDate(edition.byDay[e.day])}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

// ===== Subcomponentes =====

function NextHero({
  next,
  editionDate,
  name,
}: {
  next: {
    id: string;
    title: string;
    day: number;
    startTime: Date;
    endTime: Date;
    location: { name: string; address: string | null } | null;
    modality: { name: string };
    kind: "assigned" | "athlete";
    role?: keyof typeof ASSIGNMENT_ROLE_LABELS;
    isCaptain?: boolean;
    isConditional: boolean;
    status: "CONFIRMED" | "CANCELLED" | "POSTPONED";
  } | null;
  editionDate: Date | null | undefined;
  name: string;
}) {
  return (
    <section className="rise-in relative overflow-hidden rounded-2xl border border-border/80 bg-card text-card-foreground">
      <div aria-hidden className="grain" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px circle at 110% 0%, color-mix(in oklch, var(--cyan) 22%, transparent), transparent 60%), radial-gradient(700px circle at -10% 110%, color-mix(in oklch, var(--primary) 24%, transparent), transparent 60%)",
        }}
      />
      <div aria-hidden className="field-lines pointer-events-none absolute inset-0 text-foreground/40 opacity-[0.10]" />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 opacity-[0.08] hidden sm:block select-none"
      >
        <BrandMark size={360} alt="" />
      </div>

      <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.3fr_1fr] lg:gap-10 lg:p-10">
        <div>
          <div className="inline-flex items-center gap-3 rounded-full border border-border/70 bg-background/60 py-1.5 pl-1.5 pr-3.5 backdrop-blur-sm">
            <BrandMark size={28} priority />
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              EP · Engenharia UFRGS
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-pulse" />
          </div>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl font-semibold leading-[0.95] tracking-tight text-balance">
            Olá,{" "}
            <span className="relative inline-block">
              <span className="relative z-10">{name}</span>
              <span aria-hidden className="absolute inset-x-0 bottom-1 h-3 -z-0 bg-cyan/55" />
            </span>
            .
          </h1>
          <p className="mt-3 max-w-xl text-base text-muted-foreground text-pretty">
            {next
              ? "Esse é seu próximo compromisso. Confira local, horário e abra o mapa direto."
              : "Você não tem compromissos próximos. Aproveita pra dar uma olhada nos eventos abertos abaixo."}
          </p>
        </div>

        <div className="relative">
          {next ? (
            <NextCard next={next} editionDate={editionDate ?? null} />
          ) : (
            <div className="rounded-xl border border-border bg-background/60 p-5 text-sm text-muted-foreground">
              Nada na agenda agora.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function NextCard({
  next,
  editionDate,
}: {
  next: {
    id: string;
    title: string;
    day: number;
    startTime: Date;
    endTime: Date;
    location: { name: string; address: string | null } | null;
    modality: { name: string };
    kind: "assigned" | "athlete";
    role?: keyof typeof ASSIGNMENT_ROLE_LABELS;
    isCaptain?: boolean;
    isConditional: boolean;
    status: "CONFIRMED" | "CANCELLED" | "POSTPONED";
  };
  editionDate: Date | null;
}) {
  const derived = deriveEventStatus(next);
  const dayLabel = EP_DAY_SHORT_LABEL[next.day] ?? `Dia ${next.day}`;
  return (
    <div className="rounded-xl border border-cyan/40 bg-cyan/10 p-5 text-foreground">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Próximo compromisso
        </span>
        <Badge
          variant={next.kind === "athlete" ? "destructive" : "default"}
          className="text-[10px]"
        >
          {next.kind === "athlete" ? "Você compete" : "Você está escalado"}
        </Badge>
      </div>
      <Link
        href={`/eventos/${next.id}`}
        className="mt-2 block font-display text-2xl font-semibold leading-tight tracking-tight hover:underline"
      >
        {next.title}
      </Link>
      <p className="mt-1 text-xs text-muted-foreground">
        {next.modality.name}
        {next.location ? ` · ${next.location.name}` : ""}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 font-mono tabular-nums">
          <Clock className="h-3 w-3" />
          {formatEventTime(next.startTime, next.endTime)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 font-semibold uppercase tracking-wider">
          {dayLabel}
          {editionDate ? ` · ${formatEpDayDate(editionDate)}` : ""}
        </span>
        {next.kind === "assigned" && next.role && (
          <Badge variant="secondary" className="text-[10px]">
            {ASSIGNMENT_ROLE_LABELS[next.role]}
            {next.isCaptain ? " · capitão" : ""}
          </Badge>
        )}
        {derived === "IN_PROGRESS" && (
          <Badge className="text-[10px]">Em andamento</Badge>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/eventos/${next.id}`}
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-3.5 py-1.5 text-xs font-semibold text-background hover:-translate-y-0.5 transition-transform"
        >
          Ver detalhes
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <MapsLink address={next.location?.address} />
      </div>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  description,
  href,
  hrefLabel,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {eyebrow}
          </p>
          <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {href && hrefLabel && (
          <Link
            href={href}
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 whitespace-nowrap"
          >
            {hrefLabel}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function CommitmentRow({
  event,
  role,
  isCaptain,
  dateLabel,
}: {
  event: {
    id: string;
    title: string;
    day: number;
    startTime: Date;
    endTime: Date;
    modality: { name: string };
    location: { name: string; address: string | null } | null;
  };
  role?: keyof typeof ASSIGNMENT_ROLE_LABELS;
  isCaptain?: boolean;
  dateLabel: string | null;
}) {
  return (
    <article className="grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 sm:p-4">
      <DayBadge day={event.day} dateLabel={dateLabel} />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {event.modality.name}
          {event.location ? ` · ${event.location.name}` : ""}
        </p>
        <Link
          href={`/eventos/${event.id}`}
          className="block font-display text-lg font-semibold leading-tight hover:underline truncate"
        >
          {event.title}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-mono tabular-nums text-muted-foreground">
            {formatEventTime(event.startTime, event.endTime)}
          </span>
          {role && (
            <Badge variant="secondary" className="text-[10px]">
              {ASSIGNMENT_ROLE_LABELS[role]}
              {isCaptain ? " · capitão" : ""}
            </Badge>
          )}
        </div>
      </div>
      <div className="col-span-2 sm:col-span-1 sm:justify-self-end">
        <MapsLink address={event.location?.address} variant="inline" />
      </div>
    </article>
  );
}

function AthleteRow({
  event,
  dateLabel,
}: {
  event: {
    id: string;
    title: string;
    day: number;
    startTime: Date;
    endTime: Date;
    modality: { name: string };
    location: { name: string; address: string | null } | null;
  };
  dateLabel: string | null;
}) {
  return (
    <article className="grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 sm:p-4">
      <DayBadge day={event.day} dateLabel={dateLabel} tone="destructive" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {event.modality.name}
          {event.location ? ` · ${event.location.name}` : ""}
        </p>
        <Link
          href={`/eventos/${event.id}`}
          className="block font-display text-lg font-semibold leading-tight hover:underline truncate"
        >
          {event.title}
        </Link>
        <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
          {formatEventTime(event.startTime, event.endTime)}
        </p>
      </div>
      <div className="col-span-2 sm:col-span-1 sm:justify-self-end">
        <MapsLink address={event.location?.address} variant="inline" />
      </div>
    </article>
  );
}

function OpenEventRow({
  event,
  dateLabel,
}: {
  event: {
    id: string;
    title: string;
    day: number;
    startTime: Date;
    endTime: Date;
    modality: { name: string };
    location: { name: string; address: string | null } | null;
    _count?: { assignments: number };
    desiredSupportersCount?: number;
  };
  dateLabel: string | null;
}) {
  const wantedTotal = event.desiredSupportersCount ?? 0;
  const assigned = event._count?.assignments ?? 0;
  return (
    <article className="grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-border bg-card p-3 sm:p-4">
      <DayBadge day={event.day} dateLabel={dateLabel} />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {event.modality.name}
          {event.location ? ` · ${event.location.name}` : ""}
        </p>
        <Link
          href={`/eventos/${event.id}`}
          className="block font-display text-lg font-semibold leading-tight hover:underline truncate"
        >
          {event.title}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-mono tabular-nums text-muted-foreground">
            {formatEventTime(event.startTime, event.endTime)}
          </span>
          {wantedTotal > 0 && (
            <Badge variant="outline" className="text-[10px]">
              {assigned}/{wantedTotal} torcida
            </Badge>
          )}
        </div>
      </div>
      <div className="col-span-2 sm:col-span-1 sm:justify-self-end">
        <MapsLink address={event.location?.address} variant="inline" />
      </div>
    </article>
  );
}

function DayBadge({
  day,
  dateLabel,
  tone = "default",
}: {
  day: number;
  dateLabel: string | null;
  tone?: "default" | "destructive";
}) {
  const label = EP_DAY_SHORT_LABEL[day] ?? `Dia ${day}`;
  return (
    <div
      className={cn(
        "flex w-16 sm:w-20 flex-col items-center justify-center rounded-lg border px-2 py-2 text-center",
        tone === "destructive"
          ? "border-destructive/30 bg-background"
          : "border-border bg-background",
      )}
    >
      <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      {dateLabel && (
        <span className="mt-0.5 text-[10px] font-mono tabular-nums text-foreground/80">
          {dateLabel}
        </span>
      )}
    </div>
  );
}

function ManagerStrip({
  peopleCount,
  modalitiesCount,
  locationsCount,
  eventsCount,
}: {
  peopleCount: number;
  modalitiesCount: number;
  locationsCount: number;
  eventsCount: number;
}) {
  const stats = [
    { label: "Pessoas", value: peopleCount, href: "/pessoas", icon: Users },
    { label: "Modalidades", value: modalitiesCount, href: "/modalidades", icon: Trophy },
    { label: "Locais", value: locationsCount, href: "/locais", icon: MapPin },
    { label: "Eventos", value: eventsCount, href: "/eventos", icon: Volleyball },
  ];
  return (
    <section>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        Gestão
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              href={s.href}
              className="group relative block overflow-hidden rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {s.label}
                </span>
                <span className="grid h-7 w-7 place-items-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-foreground group-hover:text-background">
                  <Icon className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="stencil-number text-3xl sm:text-4xl text-foreground">
                  {s.value}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-dashed border-border bg-card/60 py-12 px-6 text-center">
      <div aria-hidden className="field-lines absolute inset-0 text-foreground/30 opacity-[0.08]" />
      <Calendar className="relative mx-auto mb-2 h-6 w-6 text-muted-foreground" />
      <p className="relative font-display text-lg font-semibold">{title}</p>
      {description && <p className="relative mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
