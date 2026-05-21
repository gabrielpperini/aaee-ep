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
    athleteIds,
    locationId,
    startTime,
    endTime,
    description,
    opponent,
    ...rest
  } = parsed.data;

  const data = {
    ...rest,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    locationId: locationId || null,
    description: description?.trim() || null,
    opponent: opponent?.trim() || null,
  };

  if (id) {
    await prisma.$transaction([
      prisma.event.update({ where: { id }, data }),
      prisma.eventAthlete.deleteMany({ where: { eventId: id } }),
      ...(athleteIds.length > 0
        ? [prisma.eventAthlete.createMany({
            data: athleteIds.map((personId) => ({ eventId: id, personId })),
          })]
        : []),
    ]);
  } else {
    await prisma.event.create({
      data: {
        ...data,
        athletes: { create: athleteIds.map((personId) => ({ personId })) },
      },
    });
  }

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
