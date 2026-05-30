import Link from "next/link";
import { AlertTriangle, ArrowRight, Activity, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  formatEventTime,
  priorityVariant,
  statusVariant,
} from "@/lib/format";
import { nowDate } from "@/lib/time";

const SOON_HORIZON_MS = 3 * 60 * 60 * 1000; // 3 horas
const PRIORITY_RANK: Record<string, number> = { CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3 };

export default async function DashboardPage() {
  await requireRole(["DIRECTOR", "ADMIN"]);

  const now = nowDate();
  const soonEnd = new Date(now.getTime() + SOON_HORIZON_MS);

  const [happeningNow, upcomingSoon, allActive, busyNow, competingNow, totalPeople] = await Promise.all([
    prisma.event.findMany({
      where: {
        startTime: { lte: now },
        endTime: { gt: now },
        status: "CONFIRMED",
      },
      orderBy: { startTime: "asc" },
      include: {
        modality: { select: { name: true } },
        location: { select: { name: true } },
        _count: { select: { assignments: true, checkIns: true } },
      },
    }),
    prisma.event.findMany({
      where: {
        startTime: { gt: now, lte: soonEnd },
        status: "CONFIRMED",
      },
      orderBy: { startTime: "asc" },
      include: {
        modality: { select: { name: true } },
        location: { select: { name: true } },
        _count: { select: { assignments: true } },
      },
    }),
    prisma.event.findMany({
      where: {
        endTime: { gt: now },
        status: "CONFIRMED",
      },
      orderBy: [{ priority: "asc" }, { startTime: "asc" }],
      include: {
        modality: { select: { name: true } },
        _count: { select: { assignments: true } },
      },
    }),
    prisma.assignment.findMany({
      where: {
        event: {
          startTime: { lte: now },
          endTime: { gt: now },
          status: "CONFIRMED",
        },
      },
      select: { personId: true },
      distinct: ["personId"],
    }),
    prisma.eventAthlete.findMany({
      where: {
        event: {
          startTime: { lte: now },
          endTime: { gt: now },
          status: "CONFIRMED",
        },
      },
      select: { personId: true },
      distinct: ["personId"],
    }),
    prisma.person.count(),
  ]);

  // Todo mundo é disponível por default; "ocupado agora" = competindo ou alocado em evento em curso.
  const busyIds = new Set<string>();
  for (const b of busyNow) busyIds.add(b.personId);
  for (const c of competingNow) busyIds.add(c.personId);
  const busyCount = busyIds.size;
  const freeNow = Math.max(0, totalPeople - busyCount);

  const understaffedPriority = allActive
    .filter(
      (e) =>
        (e.priority === "HIGH" || e.priority === "CRITICAL") &&
        e.desiredSupportersCount > 0 &&
        e._count.assignments < e.desiredSupportersCount,
    )
    .sort((a, b) => {
      const ra = PRIORITY_RANK[a.priority] ?? 9;
      const rb = PRIORITY_RANK[b.priority] ?? 9;
      if (ra !== rb) return ra - rb;
      return a.startTime.getTime() - b.startTime.getTime();
    });

  return (
    <div>
      <PageHeader
        eyebrow="Gestão · Visão geral"
        title="Dashboard"
        description="O que está acontecendo agora e o que vem na sequência."
      />

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <KpiCard
          label="Acontecendo agora"
          value={happeningNow.length}
          icon={<Activity className="h-3.5 w-3.5" />}
        />
        <KpiCard
          label="Pessoas livres agora"
          value={freeNow}
          icon={<Users className="h-3.5 w-3.5" />}
          hint={`${busyCount} já alocadas`}
        />
        <KpiCard
          label="Eventos prioritários sem torcida"
          value={understaffedPriority.length}
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          tone={understaffedPriority.length > 0 ? "warn" : "ok"}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Acontecendo agora</CardTitle>
          </CardHeader>
          <CardContent>
            {happeningNow.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem eventos no momento.</p>
            ) : (
              <ul className="space-y-2">
                {happeningNow.map((e) => (
                  <EventRow
                    key={e.id}
                    href={`/eventos/${e.id}`}
                    title={e.title}
                    subtitle={`${e.modality.name}${e.location ? ` · ${e.location.name}` : ""}`}
                    time={formatEventTime(e.startTime, e.endTime, e.timeTbd)}
                    rightBadges={[
                      <Badge key="prio" variant={priorityVariant(e.priority)}>
                        {PRIORITY_LABELS[e.priority]}
                      </Badge>,
                      <Badge key="st" variant={statusVariant(e.status)}>
                        {STATUS_LABELS[e.status]}
                      </Badge>,
                    ]}
                    meta={`${e._count.assignments}${
                      e.desiredSupportersCount ? `/${e.desiredSupportersCount}` : ""
                    } alocados · ${e._count.checkIns} check-ins`}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximas 3h</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingSoon.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nada na próxima janela.</p>
            ) : (
              <ul className="space-y-2">
                {upcomingSoon.map((e) => (
                  <EventRow
                    key={e.id}
                    href={`/eventos/${e.id}`}
                    title={e.title}
                    subtitle={`${e.modality.name}${e.location ? ` · ${e.location.name}` : ""}`}
                    time={formatEventTime(e.startTime, e.endTime, e.timeTbd)}
                    rightBadges={[
                      <Badge key="prio" variant={priorityVariant(e.priority)}>
                        {PRIORITY_LABELS[e.priority]}
                      </Badge>,
                    ]}
                    meta={`${e._count.assignments}${
                      e.desiredSupportersCount ? `/${e.desiredSupportersCount}` : ""
                    } alocados`}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Prioritários com pouca torcida</CardTitle>
          </CardHeader>
          <CardContent>
            {understaffedPriority.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todos os eventos prioritários têm meta de torcida atingida.
              </p>
            ) : (
              <ul className="space-y-2">
                {understaffedPriority.map((e) => {
                  const short = e.desiredSupportersCount - e._count.assignments;
                  return (
                    <EventRow
                      key={e.id}
                      href={`/eventos/${e.id}`}
                      title={e.title}
                      subtitle={`Dia ${e.day} · ${e.modality.name}`}
                      time={formatEventTime(e.startTime, e.endTime, e.timeTbd)}
                      rightBadges={[
                        <Badge key="prio" variant={priorityVariant(e.priority)}>
                          {PRIORITY_LABELS[e.priority]}
                        </Badge>,
                        <Badge key="short" variant="destructive">
                          Faltam {short}
                        </Badge>,
                      ]}
                      meta={`${e._count.assignments}/${e.desiredSupportersCount} alocados`}
                    />
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: number;
  hint?: string;
  icon?: React.ReactNode;
  tone?: "warn" | "ok";
}) {
  return (
    <div
      className={
        "rounded-xl border bg-card p-4 " +
        (tone === "warn"
          ? "border-destructive/40 bg-destructive/5"
          : "border-border")
      }
    >
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="stencil-number text-4xl text-foreground">{value}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}

function EventRow({
  href,
  title,
  subtitle,
  time,
  rightBadges,
  meta,
}: {
  href: string;
  title: string;
  subtitle: string;
  time: string;
  rightBadges: React.ReactNode[];
  meta: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 transition-colors hover:border-foreground/30 hover:bg-accent"
      >
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {subtitle}
          </div>
          <div className="truncate text-sm font-medium">{title}</div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
            <span>{time}</span>
            <span className="text-muted-foreground/40">·</span>
            <span>{meta}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {rightBadges}
          <ArrowRight className="ml-1 h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>
      </Link>
    </li>
  );
}
