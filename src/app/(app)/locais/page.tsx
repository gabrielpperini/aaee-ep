import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { OfflineUnsupportedNotice } from "@/components/app/offline-unsupported-notice";
import { EmptyState } from "@/components/app/empty-state";
import { MapsLink } from "@/components/app/maps-link";
import { NewLocationButton } from "./new-location-button";
import { LocationRowActions } from "./row-actions";

export default async function LocationsPage() {
  await requireRole(["DIRECTOR", "ADMIN"]);

  const locations = await prisma.location.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { events: true } } },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Gestão · Mapa do EP"
        title="Locais"
        description="Locais físicos onde acontecem os eventos do EP."
        actions={<NewLocationButton />}
      />
      <OfflineUnsupportedNotice />

      {locations.length === 0 ? (
        <EmptyState
          title="Nenhum local cadastrado"
          description="Cadastre quadras, ginásios e pontos de encontro da delegação."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead className="w-16">Mapa</TableHead>
                <TableHead className="text-right">Eventos</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((loc) => (
                <TableRow key={loc.id}>
                  <TableCell className="font-medium">{loc.name}</TableCell>
                  <TableCell className="text-muted-foreground">{loc.address || "—"}</TableCell>
                  <TableCell>
                    <MapsLink address={loc.address} variant="icon" />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{loc._count.events}</TableCell>
                  <TableCell>
                    <LocationRowActions location={loc} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
