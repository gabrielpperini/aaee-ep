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
import { NewPersonButton } from "./new-person-button";
import { PersonRowActions } from "./row-actions";

export default async function PeoplePage() {
  await requireRole(["DIRECTOR", "ADMIN"]);

  const [people, modalities] = await Promise.all([
    prisma.person.findMany({
      orderBy: { name: "asc" },
      include: { modalityAthlete: { include: { modality: { select: { id: true, name: true } } } } },
    }),
    prisma.modality.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Pessoas"
        description="Membros da delegação: atletas, torcida, apoio e diretoria."
        actions={<NewPersonButton modalities={modalities} />}
      />

      {people.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhuma pessoa cadastrada.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Apelido</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Participação</TableHead>
                <TableHead>Modalidades</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((p) => {
                const tags = [
                  p.isAthlete && "Atleta",
                  p.isSupporter && "Torcida",
                  p.isDirector && "Diretor",
                  p.isSupport && "Apoio",
                ].filter(Boolean) as string[];
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.nickname || "—"}</TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {p.phone || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.email || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {tags.length === 0 ? (
                          <span className="text-muted-foreground text-xs">—</span>
                        ) : (
                          tags.map((t) => (
                            <Badge key={t} variant="secondary">{t}</Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {p.modalityAthlete.length === 0 ? (
                          <span className="text-muted-foreground text-xs">—</span>
                        ) : (
                          p.modalityAthlete.map((ma) => (
                            <Badge key={ma.modality.id} variant="outline">
                              {ma.modality.name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <PersonRowActions
                        person={{
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
                          modalityIds: p.modalityAthlete.map((ma) => ma.modality.id),
                        }}
                        modalities={modalities}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
