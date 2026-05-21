"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import {
  fieldErrorsFromZod,
  failure,
  fieldFailure,
  success,
  type FormState,
} from "@/lib/validations/_action-result";
import {
  modalitySchema,
  type ModalityFormValues,
} from "@/lib/validations/modality";

export async function saveModality(
  _prev: FormState,
  input: ModalityFormValues,
): Promise<FormState> {
  await requireRole(["DIRECTOR", "ADMIN"]);

  const parsed = modalitySchema.safeParse(input);
  if (!parsed.success) {
    return fieldFailure(fieldErrorsFromZod(parsed.error));
  }

  const { id, name, category, priority, notes } = parsed.data;
  const data = { name, category, priority, notes: notes?.trim() || null };

  try {
    if (id) {
      await prisma.modality.update({ where: { id }, data });
    } else {
      await prisma.modality.create({ data });
    }
  } catch {
    return failure("Já existe uma modalidade com esse nome.");
  }

  revalidatePath("/modalidades");
  return success();
}

export async function deleteModality(id: string): Promise<FormState> {
  await requireRole(["DIRECTOR", "ADMIN"]);
  try {
    await prisma.modality.delete({ where: { id } });
  } catch {
    return failure("Não foi possível excluir (existem eventos vinculados).");
  }
  revalidatePath("/modalidades");
  return success();
}
