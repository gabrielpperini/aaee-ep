import { EmptyState } from "@/components/app/empty-state";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { OfflineUnsupportedNotice } from "@/components/app/offline-unsupported-notice";
import { UsersTable } from "./users-table";

export default async function AdminUsersPage() {
  await requireRole(["ADMIN"]);

  const [users, unlinkedPersons] = await Promise.all([
    prisma.user.findMany({
      orderBy: { email: "asc" },
      include: {
        _count: { select: { pushSubscriptions: true } },
        person: {
          select: {
            id: true,
            name: true,
            nickname: true,
            email: true,
            phone: true,
            course: true,
            semester: true,
            isAthlete: true,
            isSupporter: true,
            isDirector: true,
            isSupport: true,
            isBateria: true,
            modalityAthlete: {
              select: { modality: { select: { id: true, name: true } } },
            },
          },
        },
      },
    }),
    prisma.person.findMany({
      where: { userId: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, nickname: true, email: true, phone: true },
    }),
  ]);

  // Nome que veio do Supabase (metadata do login — ex: Google), usado quando
  // a conta ainda não tem Person vinculada.
  const authRows = await prisma.$queryRawUnsafe<{ id: string; name: string | null }[]>(
    `SELECT id, COALESCE(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name') AS name FROM auth.users`,
  );
  const nameByAuthId = new Map(authRows.map((r) => [r.id, r.name]));

  const userRows = users.map((u) => ({
    id: u.id,
    email: u.email,
    phone: u.phone,
    role: u.role,
    pushCount: u._count.pushSubscriptions,
    authName: u.authUserId ? nameByAuthId.get(u.authUserId) ?? null : null,
    person: u.person
      ? {
          ...u.person,
          modalities: u.person.modalityAthlete.map((ma) => ma.modality),
        }
      : null,
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Administração · Contas"
        title="Usuários"
        description="Contas que já entraram no app. Gerencie funções e vínculo com pessoas da delegação."
      />
      <OfflineUnsupportedNotice />

      {users.length === 0 ? (
        <EmptyState
          title="Nenhum usuário cadastrado"
          description="Os usuários aparecem aqui assim que entrarem pela primeira vez."
        />
      ) : (
        <UsersTable users={userRows} unlinkedPersons={unlinkedPersons} />
      )}
    </div>
  );
}
