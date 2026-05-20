import Link from "next/link";
import { Calendar, MapPin, Trophy, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatEventTime } from "@/lib/format";

export default async function HomePage() {
  const user = await requireUser();

  const [peopleCount, modalitiesCount, locationsCount, eventsCount, upcoming] = await Promise.all([
    prisma.person.count(),
    prisma.modality.count(),
    prisma.location.count(),
    prisma.event.count(),
    prisma.event.findMany({
      where: { status: { in: ["CONFIRMED", "POSSIBLE", "IN_PROGRESS"] } },
      orderBy: [{ day: "asc" }, { startTime: "asc" }],
      take: 6,
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
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Olá, {greetingName} 👋</h1>
        <p className="text-muted-foreground">
          Painel inicial — MVP 1 cobre cadastros e agenda. Operação da torcida vem na próxima fase.
        </p>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="block">
            <Card className="hover:bg-accent/40 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {s.label}
                </CardTitle>
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{s.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-semibold">Próximos eventos</h2>
          <Link href="/agenda" className="text-sm text-primary hover:underline">
            Ver agenda completa →
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Nenhum evento cadastrado ainda.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {upcoming.map((e) => (
              <Card key={e.id}>
                <CardContent className="py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{e.title}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {e.modality.name}
                      {e.location ? ` · ${e.location.name}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline">Dia {e.day}</Badge>
                    <span className="text-sm tabular-nums">{formatEventTime(e.startTime, e.endTime)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
