import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import type { Role } from "@/generated/prisma/client";
import { UserRowActions } from "./row-actions";

const ROLE_LABEL: Record<Role, string> = {
  USER: "Membro",
  DIRECTOR: "Diretor",
  ADMIN: "Admin",
};

const ROLE_VARIANT: Record<Role, "default" | "secondary" | "outline"> = {
  USER: "outline",
  DIRECTOR: "secondary",
  ADMIN: "default",
};

export default async function AdminUsersPage() {
  await requireRole(["ADMIN"]);

  const [users, unlinkedPersons] = await Promise.all([
    prisma.user.findMany({
      orderBy: { email: "asc" },
      include: {
        person: { select: { id: true, name: true, nickname: true } },
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
        title="Usuários"
        description="Contas que já entraram no app. Gerencie funções e vínculo com pessoas da delegação."
      />

      {users.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhum usuário cadastrado ainda.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Pessoa vinculada</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.email ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {u.phone || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ROLE_VARIANT[u.role]}>
                      {ROLE_LABEL[u.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.person ? (
                      <Link
                        href="/pessoas"
                        className="text-sm hover:underline"
                      >
                        {u.person.name}
                        {u.person.nickname ? (
                          <span className="text-muted-foreground">
                            {" "}
                            ({u.person.nickname})
                          </span>
                        ) : null}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <UserRowActions
                      user={{
                        id: u.id,
                        email: u.email,
                        role: u.role,
                        person: u.person,
                      }}
                      unlinkedPersons={unlinkedPersons}
                    />
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
