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
  locationSchema,
  type LocationFormValues,
} from "@/lib/validations/location";

export async function saveLocation(
  _prev: FormState,
  input: LocationFormValues,
): Promise<FormState> {
  await requireRole(["DIRECTOR", "ADMIN"]);

  const parsed = locationSchema.safeParse(input);
  if (!parsed.success) {
    return fieldFailure(fieldErrorsFromZod(parsed.error));
  }

  const { id, name, address, description, notes } = parsed.data;
  const data = {
    name,
    address: address?.trim() || null,
    description: description?.trim() || null,
    notes: notes?.trim() || null,
  };

  if (id) {
    await prisma.location.update({ where: { id }, data });
  } else {
    await prisma.location.create({ data });
  }

  revalidatePath("/locais");
  return success();
}

export async function deleteLocation(id: string): Promise<FormState> {
  await requireRole(["DIRECTOR", "ADMIN"]);
  try {
    await prisma.location.delete({ where: { id } });
  } catch {
    return failure("Não foi possível excluir (talvez existam eventos vinculados).");
  }
  revalidatePath("/locais");
  return success();
}
