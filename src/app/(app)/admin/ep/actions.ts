"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import {
  fieldErrorsFromZod,
  fieldFailure,
  success,
  type FormState,
} from "@/lib/validations/_action-result";
import {
  epEditionSchema,
  type EpEditionFormValues,
} from "@/lib/validations/ep-edition";
import { EP_EDITION_ID } from "@/lib/ep-edition";

function toDateOrNull(value: string | undefined | null): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // input type="date" entrega "YYYY-MM-DD". new Date() interpreta como UTC,
  // o que está OK aqui — armazenamos só a data (12h pra evitar timezone burn).
  const d = new Date(`${trimmed}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function saveEpEdition(
  _prev: FormState,
  input: EpEditionFormValues,
): Promise<FormState> {
  await requireRole(["DIRECTOR", "ADMIN"]);

  const parsed = epEditionSchema.safeParse(input);
  if (!parsed.success) {
    return fieldFailure(fieldErrorsFromZod(parsed.error));
  }

  const v = parsed.data;
  const data = {
    name: v.name?.trim() || null,
    dayMinus1: toDateOrNull(v.dayMinus1),
    day0: toDateOrNull(v.day0),
    day1: toDateOrNull(v.day1),
    day2: toDateOrNull(v.day2),
    day3: toDateOrNull(v.day3),
    day4: toDateOrNull(v.day4),
    notes: v.notes?.trim() || null,
  };

  await prisma.epEdition.upsert({
    where: { id: EP_EDITION_ID },
    create: { id: EP_EDITION_ID, ...data },
    update: data,
  });

  revalidatePath("/admin/ep");
  revalidatePath("/");
  revalidatePath("/agenda");
  revalidatePath("/disponibilidade");
  return success();
}
