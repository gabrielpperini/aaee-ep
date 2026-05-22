import { prisma } from "@/lib/prisma";
import { EP_EDITION_ID, type EpEditionDates } from "@/lib/ep-edition";

export async function getEpEdition(): Promise<EpEditionDates> {
  const row = await prisma.epEdition.findUnique({ where: { id: EP_EDITION_ID } });
  return {
    name: row?.name ?? null,
    byDay: {
      0: row?.day0 ?? null,
      1: row?.day1 ?? null,
      2: row?.day2 ?? null,
      3: row?.day3 ?? null,
      4: row?.day4 ?? null,
    },
  };
}
