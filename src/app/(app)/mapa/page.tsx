import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { MapsLink } from "@/components/app/maps-link";
import { EmptyState } from "@/components/app/empty-state";

export default async function MapaPage() {
  await requireUser();

  const locations = await prisma.location.findMany({
    where: { events: { some: {} } },
    orderBy: { name: "asc" },
    include: { _count: { select: { events: true } } },
  });

  const orphans = await prisma.location.findMany({
    where: { events: { none: {} } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Painel · Logística"
        title="Mapa do EP"
        description="Locais dos eventos da delegação. Clique pra abrir no Google Maps."
      />

      {locations.length === 0 && orphans.length === 0 ? (
        <EmptyState
          title="Nenhum local cadastrado"
          description="A diretoria vai cadastrar os endereços dos ginásios e pontos de encontro."
        />
      ) : (
        <div className="space-y-8">
          {locations.length > 0 && (
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {locations.map((loc) => (
                <Card key={loc.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-lg leading-tight">{loc.name}</CardTitle>
                    {loc.description && (
                      <p className="text-xs text-muted-foreground">{loc.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Endereço
                      </p>
                      <p className="text-sm">{loc.address || "—"}</p>
                      {loc.notes && (
                        <p className="text-xs text-muted-foreground">{loc.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground tabular-nums">
                        {loc._count.events} evento{loc._count.events === 1 ? "" : "s"}
                      </span>
                      <MapsLink address={loc.address} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </section>
          )}

          {orphans.length > 0 && (
            <section>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Outros locais
              </p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {orphans.map((loc) => (
                  <li
                    key={loc.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-card/60 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{loc.name}</div>
                      {loc.address && (
                        <div className="text-xs text-muted-foreground truncate">{loc.address}</div>
                      )}
                    </div>
                    <MapsLink address={loc.address} variant="icon" />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
