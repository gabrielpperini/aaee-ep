import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { OfflineUnsupportedNotice } from "@/components/app/offline-unsupported-notice";
import { EmptyState } from "@/components/app/empty-state";
import { NewModalityButton } from "./new-modality-button";
import { ModalitiesTable, type ModalityRow } from "./modalities-table";

export default async function ModalitiesPage() {
  await requireRole(["DIRECTOR", "ADMIN"]);

  const modalities = await prisma.modality.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { events: true, athletes: true } } },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Gestão · Disputas"
        title="Modalidades"
        description="Esportes, atividades culturais e da torcida."
        actions={<NewModalityButton />}
      />
      <OfflineUnsupportedNotice />

      {modalities.length === 0 ? (
        <EmptyState
          title="Nenhuma modalidade cadastrada"
          description="Cadastre as disputas que a delegação vai participar."
        />
      ) : (
        <ModalitiesTable
          modalities={modalities.map(
            (m): ModalityRow => ({
              id: m.id,
              name: m.name,
              category: m.category,
              priority: m.priority,
              athletesCount: m._count.athletes,
              eventsCount: m._count.events,
              notes: m.notes,
            }),
          )}
        />
      )}
    </div>
  );
}
