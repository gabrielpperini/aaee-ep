import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { OfflineUnsupportedNotice } from "@/components/app/offline-unsupported-notice";
import { Card, CardContent } from "@/components/ui/card";
import { EP_EDITION_ID } from "@/lib/ep-edition";
import { EpEditionForm } from "./ep-edition-form";

function dateToInput(value: Date | null | undefined): string {
  if (!value) return "";
  // ISO YYYY-MM-DD (input type="date").
  return value.toISOString().slice(0, 10);
}

export default async function EpEditionAdminPage() {
  await requireRole(["DIRECTOR", "ADMIN"]);

  const row = await prisma.epEdition.findUnique({ where: { id: EP_EDITION_ID } });

  const initial = {
    name: row?.name ?? "",
    day0: dateToInput(row?.day0),
    day1: dateToInput(row?.day1),
    day2: dateToInput(row?.day2),
    day3: dateToInput(row?.day3),
    day4: dateToInput(row?.day4),
    notes: row?.notes ?? "",
  };

  return (
    <div>
      <PageHeader
        eyebrow="Administração · EP"
        title="Edição do EP"
        description="Defina as datas reais de cada dia da edição atual. O dia 0 é a ida (ônibus) e o dia 4 é a volta."
      />
      <OfflineUnsupportedNotice />
      <Card>
        <CardContent className="pt-6">
          <EpEditionForm initial={initial} />
        </CardContent>
      </Card>
    </div>
  );
}
