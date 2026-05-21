import Link from "next/link";
import { ArrowRight, Calendar, MapPin, Trophy, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BrandMark } from "@/components/brand-mark";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatEventTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const user = await requireUser();

  const [peopleCount, modalitiesCount, locationsCount, eventsCount, upcoming] = await Promise.all([
    prisma.person.count(),
    prisma.modality.count(),
    prisma.location.count(),
    prisma.event.count(),
    prisma.event.findMany({
      where: { status: "CONFIRMED" },
      orderBy: [{ day: "asc" }, { startTime: "asc" }],
      take: 5,
      include: { modality: true, location: true },
    }),
  ]);

  const stats = [
    { label: "Pessoas", value: peopleCount, href: "/pessoas", icon: Users },
    { label: "Modalidades", value: modalitiesCount, href: "/modalidades", icon: Trophy },
    { label: "Locais", value: locationsCount, href: "/locais", icon: MapPin },
    { label: "Eventos", value: eventsCount, href: "/eventos", icon: Calendar },
  ];

  const greetingName = user.person?.nickname ?? user.person?.name ?? "delegação";

  return (
    <div className="space-y-10">
      <Hero name={greetingName} eventCount={eventsCount} />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s, i) => (
          <StatTile key={s.label} {...s} delay={i} />
        ))}
      </section>

      <section className="rise-in rise-delay-5">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Em destaque
            </p>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              Próximos eventos
            </h2>
          </div>
          <Link
            href="/agenda"
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80"
          >
            Agenda completa
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <EmptyState
            title="Nenhum evento cadastrado ainda"
            description="Quando a programação do EP for definida, os jogos aparecem aqui."
          />
        ) : (
          <ul className="space-y-3">
            {upcoming.map((e) => (
              <li key={e.id}>
                <EventTicket event={e} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Hero({ name, eventCount }: { name: string; eventCount: number }) {
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

      {/* Brasão watermark — assinatura visual gigante, posicionado para sangrar pra fora */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 opacity-[0.08] hidden sm:block select-none"
      >
        <BrandMark size={360} alt="" />
      </div>

      <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.5fr_1fr] lg:gap-10 lg:p-10">
        <div>
          <div className="inline-flex items-center gap-3 rounded-full border border-border/70 bg-background/60 py-1.5 pl-1.5 pr-3.5 backdrop-blur-sm">
            <BrandMark size={28} priority />
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              EP · Engenharia UFRGS
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-pulse" />
          </div>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[0.95] tracking-tight text-balance">
            Olá,{" "}
            <span className="relative inline-block">
              <span className="relative z-10">{name}</span>
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-1 h-3 -z-0 bg-cyan/55"
              />
            </span>
            .
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground text-pretty">
            Painel da delegação. Acompanhe a agenda, organize a torcida e gerencie cadastros
            num só lugar. A vitória começa fora de quadra.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/agenda"
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition-transform hover:-translate-y-0.5"
            >
              Ver agenda
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/perfil"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              Meu perfil
            </Link>
          </div>
        </div>

        <div className="relative grid grid-cols-2 gap-3 self-stretch sm:gap-4 lg:grid-cols-1 lg:grid-rows-2">
          <HeroPanel label="Dias do EP" value="3" suffix="dias" tone="navy" />
          <HeroPanel label="Eventos previstos" value={String(eventCount).padStart(2, "0")} suffix={eventCount === 1 ? "evento" : "eventos"} tone="cyan" />
        </div>
      </div>
    </section>
  );
}

function HeroPanel({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: string;
  suffix: string;
  tone: "navy" | "cyan";
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-4 sm:p-5",
        tone === "cyan"
          ? "border-cyan/40 bg-cyan/15 text-foreground"
          : "border-border bg-background/60 text-foreground",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="stencil-number text-5xl sm:text-6xl">{value}</span>
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {suffix}
        </span>
      </div>
      {tone === "cyan" && (
        <div aria-hidden className="absolute -bottom-3 -right-3 h-16 w-16 stripes-cyan opacity-40 rotate-12" />
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  href,
  icon: Icon,
  delay,
}: {
  label: string;
  value: number;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  delay: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rise-in group relative block overflow-hidden rounded-xl border border-border bg-card p-4 sm:p-5",
        "transition-all hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-lg",
        `rise-delay-${Math.min(delay + 1, 4)}`,
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </span>
        <span className="grid h-7 w-7 place-items-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-foreground group-hover:text-background">
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="stencil-number text-4xl sm:text-5xl text-foreground">{value}</span>
      </div>
      <span className="mt-3 inline-flex items-center text-xs font-medium text-muted-foreground group-hover:text-foreground">
        Abrir
        <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function EventTicket({
  event,
}: {
  event: {
    id: string;
    title: string;
    day: number;
    startTime: Date;
    endTime: Date;
    modality: { name: string };
    location: { name: string } | null;
  };
}) {
  return (
    <article className="group relative grid grid-cols-[auto_1fr] items-stretch overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-foreground/30 hover:shadow-md sm:grid-cols-[auto_1fr_auto]">
      <div className="relative flex w-20 flex-col items-center justify-center gap-0.5 border-r border-dashed border-border bg-muted/40 px-3 py-4 sm:w-24">
        <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Dia
        </span>
        <span className="stencil-number text-4xl sm:text-5xl">{event.day}</span>
        {/* ticket punch holes */}
        <span aria-hidden className="absolute -right-1.5 top-2 h-3 w-3 rounded-full bg-background" />
        <span aria-hidden className="absolute -right-1.5 bottom-2 h-3 w-3 rounded-full bg-background" />
      </div>

      <div className="min-w-0 px-4 py-3 sm:px-5 sm:py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {event.modality.name}
          {event.location ? ` · ${event.location.name}` : ""}
        </p>
        <p className="mt-1 font-display text-lg font-semibold leading-tight tracking-tight truncate">
          {event.title}
        </p>
        <p className="mt-1 font-mono text-sm tabular-nums text-muted-foreground">
          {formatEventTime(event.startTime, event.endTime)}
        </p>
      </div>

      <div className="hidden items-center pr-5 sm:flex">
        <Badge variant="outline" className="font-mono uppercase tracking-wider">
          Próximo
        </Badge>
      </div>
    </article>
  );
}

function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-dashed border-border bg-card/60 py-12 px-6 text-center">
      <div aria-hidden className="field-lines absolute inset-0 text-foreground/30 opacity-[0.08]" />
      <p className="relative font-display text-lg font-semibold">{title}</p>
      {description && <p className="relative mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
