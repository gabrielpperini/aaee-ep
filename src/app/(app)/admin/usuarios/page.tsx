import { EmptyState } from "@/components/app/empty-state";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { UsersTable } from "./users-table";

export default async function AdminUsersPage() {
  await requireRole(["ADMIN"]);

  const [users, unlinkedPersons] = await Promise.all([
    prisma.user.findMany({
      orderBy: { email: "asc" },
      include: {
        person: {
          select: {
            id: true,
            name: true,
            nickname: true,
            course: true,
            semester: true,
          },
        },
      },
    }),
    prisma.person.findMany({
      where: { userId: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, nickname: true, email: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Administração · Contas"
        title="Usuários"
        description="Contas que já entraram no app. Gerencie funções e vínculo com pessoas da delegação."
      />

      {users.length === 0 ? (
        <EmptyState
          title="Nenhum usuário cadastrado"
          description="Os usuários aparecem aqui assim que entrarem pela primeira vez."
        />
      ) : (
        <UsersTable users={users} unlinkedPersons={unlinkedPersons} />
      )}
    </div>
  );
}
