"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import {
  failure,
  fieldErrorsFromZod,
  fieldFailure,
  success,
  type FormState,
} from "@/lib/validations/_action-result";
import { eventSchema, type EventFormValues } from "@/lib/validations/event";
import { syncEventRoster } from "@/lib/roster";

export async function saveEvent(
  _prev: FormState,
  input: EventFormValues,
): Promise<FormState> {
  await requireRole(["DIRECTOR", "ADMIN"]);

  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) {
    return fieldFailure(fieldErrorsFromZod(parsed.error));
  }

  const {
    id,
    locationId,
    startTime,
    endTime,
    timeTbd,
    description,
    opponent,
    ...rest
  } = parsed.data;

  const start = new Date(startTime);
  const data = {
    ...rest,
    timeTbd,
    startTime: start,
    // Sem horário definido: o fim só ancora a data (igual ao início).
    endTime: timeTbd ? start : new Date(endTime),
    locationId: locationId || null,
    description: description?.trim() || null,
    opponent: opponent?.trim() || null,
  };

  // A escalação (EventAthlete) é derivada da modalidade: todo atleta da
  // modalidade compete no evento. syncEventRoster mantém esse espelho.
  await prisma.$transaction(async (tx) => {
    const event = id
      ? await tx.event.update({ where: { id }, data })
      : await tx.event.create({ data });
    await syncEventRoster(tx, event.id, event.modalityId);
  });

  revalidatePath("/eventos");
  revalidatePath("/agenda");
  revalidatePath("/");
  return success();
}

export async function deleteEvent(id: string): Promise<FormState> {
  await requireRole(["DIRECTOR", "ADMIN"]);
  try {
    await prisma.event.delete({ where: { id } });
  } catch {
    return failure("Não foi possível excluir.");
  }
  revalidatePath("/eventos");
  revalidatePath("/agenda");
  revalidatePath("/");
  return success();
}
