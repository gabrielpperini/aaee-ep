import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { COMMITTED_STATUSES } from "@/lib/format";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { NewPersonButton } from "./new-person-button";
import { PeopleTable, type PersonRow } from "./people-table";

export default async function PeoplePage() {
  await requireRole(["DIRECTOR", "ADMIN"]);

  const now = new Date();

  const [people, modalities, busyAthletes, busyAssignments] = await Promise.all([
    prisma.person.findMany({
      orderBy: { name: "asc" },
      include: { modalityAthlete: { include: { modality: { select: { id: true, name: true } } } } },
    }),
    prisma.modality.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.eventAthlete.findMany({
      where: {
        event: {
          startTime: { lte: now },
          endTime: { gt: now },
          status: { in: COMMITTED_STATUSES },
        },
      },
      select: { personId: true },
    }),
    prisma.assignment.findMany({
      where: {
        event: {
          startTime: { lte: now },
          endTime: { gt: now },
          status: { in: COMMITTED_STATUSES },
        },
      },
      select: { personId: true },
    }),
  ]);

  const busyPersonIds = Array.from(
    new Set([
      ...busyAthletes.map((a) => a.personId),
      ...busyAssignments.map((a) => a.personId),
    ]),
  );

  const rows: PersonRow[] = people.map((p) => ({
    id: p.id,
    name: p.name,
    nickname: p.nickname,
    email: p.email,
    phone: p.phone,
    isAthlete: p.isAthlete,
    isSupporter: p.isSupporter,
    isDirector: p.isDirector,
    isSupport: p.isSupport,
    notes: p.notes,
    modalities: p.modalityAthlete.map((ma) => ({ id: ma.modality.id, name: ma.modality.name })),
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Gestão · Cadastros"
        title="Pessoas"
        description="Membros da delegação: atletas, torcida, apoio e diretoria."
        actions={<NewPersonButton modalities={modalities} />}
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Nenhuma pessoa cadastrada"
          description="Comece adicionando atletas, torcida e equipe de apoio."
        />
      ) : (
        <PeopleTable people={rows} modalities={modalities} busyPersonIds={busyPersonIds} />
      )}
    </div>
  );
}
