import { Badge } from "@/components/ui/badge";
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
import { MODALITY_CATEGORY_LABELS, PRIORITY_LABELS, priorityVariant } from "@/lib/format";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { NewModalityButton } from "./new-modality-button";
import { ModalityRowActions } from "./row-actions";

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

      {modalities.length === 0 ? (
        <EmptyState
          title="Nenhuma modalidade cadastrada"
          description="Cadastre as disputas que a delegação vai participar."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead className="text-right">Atletas</TableHead>
                <TableHead className="text-right">Eventos</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {modalities.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {MODALITY_CATEGORY_LABELS[m.category]}
                  </TableCell>
                  <TableCell>
                    <Badge variant={priorityVariant(m.priority)}>{PRIORITY_LABELS[m.priority]}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{m._count.athletes}</TableCell>
                  <TableCell className="text-right tabular-nums">{m._count.events}</TableCell>
                  <TableCell>
                    <ModalityRowActions
                      modality={{
                        id: m.id,
                        name: m.name,
                        category: m.category,
                        priority: m.priority,
                        notes: m.notes,
                      }}
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
