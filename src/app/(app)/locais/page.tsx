import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { OfflineUnsupportedNotice } from "@/components/app/offline-unsupported-notice";
import { EmptyState } from "@/components/app/empty-state";
import { NewLocationButton } from "./new-location-button";
import { LocationsTable, type LocationRow } from "./locations-table";

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
        <LocationsTable
          locations={locations.map(
            (loc): LocationRow => ({
              id: loc.id,
              name: loc.name,
              address: loc.address,
              description: loc.description,
              notes: loc.notes,
              eventsCount: loc._count.events,
            }),
          )}
        />
      )}
    </div>
  );
}
