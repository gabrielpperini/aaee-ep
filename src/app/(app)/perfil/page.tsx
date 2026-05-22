import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { ProfileForm } from "./profile-form";
import { InstallAppLink } from "@/components/app/install-app-link";
import type { ProfileFormValues } from "@/lib/validations/profile";

const ROLE_LABEL: Record<string, string> = {
  USER: "Usuário",
  DIRECTOR: "Diretor(a)",
  ADMIN: "Administrador(a)",
};

export default async function ProfilePage() {
  const user = await requireUser();

  const modalities = await prisma.modality.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const selectedModalityIds = user.person
    ? (
        await prisma.modalityAthlete.findMany({
          where: { personId: user.person.id },
          select: { modalityId: true },
        })
      ).map((ma) => ma.modalityId)
    : [];

  const initial: ProfileFormValues = {
    name: user.person?.name ?? "",
    nickname: user.person?.nickname ?? "",
    email: user.person?.email ?? user.email ?? "",
    phone: user.person?.phone ?? user.phone ?? "",
    course: user.person?.course ?? "",
    semester: user.person?.semester ?? "",
    modalityIds: selectedModalityIds,
  };

  return (
    <div>
      <PageHeader
        eyebrow="Painel · Você"
        title="Meu perfil"
        description="Suas informações e participação na delegação."
      />

      <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Conta</CardTitle>
            <CardDescription>Dados da sua conta de acesso.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Email</div>
              <div>{user.email ?? "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Papel</div>
              <div>
                <Badge variant="secondary">
                  {ROLE_LABEL[user.role] ?? user.role}
                </Badge>
              </div>
            </div>
            {!user.person && (
              <p className="text-xs text-muted-foreground pt-2 border-t">
                Você ainda não está vinculado a uma pessoa da delegação.
                Preencha os dados ao lado para criar seu cadastro.
              </p>
            )}
            <InstallAppLink />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados na delegação</CardTitle>
            <CardDescription>
              Atualize seus dados de contato e modalidades em que compete.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              personId={user.person?.id ?? null}
              modalities={modalities}
              initial={initial}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
