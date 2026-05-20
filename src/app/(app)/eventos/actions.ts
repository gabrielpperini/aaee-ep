"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

const EventSchema = z.object({
  id: z.string().optional(),
  modalityId: z.string().min(1, "Selecione uma modalidade"),
  title: z.string().min(1, "Título obrigatório").max(180),
  description: z.string().max(1000).optional().or(z.literal("")),
  day: z.coerce.number().int().min(1).max(3),
  startTime: z.string().min(1, "Horário inicial obrigatório"),
  endTime: z.string().min(1, "Horário final obrigatório"),
  locationId: z.string().optional().or(z.literal("")),
  opponent: z.string().max(180).optional().or(z.literal("")),
  phase: z.enum([
    "GROUP", "ROUND_OF_16", "QUARTER", "SEMI", "FINAL",
    "THIRD_PLACE", "HEAT", "ELIMINATORY", "OTHER",
  ]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]),
  status: z.enum([
    "CONFIRMED", "POSSIBLE", "IN_PROGRESS", "FINISHED", "CANCELLED", "POSTPONED",
  ]),
  isConditional: z.boolean().default(false),
  desiredSupportersCount: z.coerce.number().int().min(0).default(0),
  athleteIds: z.array(z.string()).default([]),
});

export type EventFormValues = z.infer<typeof EventSchema>;
export type ActionResult = { ok: true } | { ok: false; error: string };

function toDate(value: string): Date {
  // Espera "YYYY-MM-DDTHH:mm" do datetime-local; interpretado como horário local.
  return new Date(value);
}

export async function saveEvent(input: EventFormValues): Promise<ActionResult> {
  await requireRole(["DIRECTOR", "ADMIN"]);

  const parsed = EventSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { id, athleteIds, locationId, startTime, endTime, description, opponent, ...rest } = parsed.data;

  const start = toDate(startTime);
  const end = toDate(endTime);
  if (end <= start) {
    return { ok: false, error: "Horário final deve ser depois do inicial." };
  }

  const data = {
    ...rest,
    startTime: start,
    endTime: end,
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
  return { ok: true };
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  await requireRole(["DIRECTOR", "ADMIN"]);
  try {
    await prisma.event.delete({ where: { id } });
  } catch {
    return { ok: false, error: "Não foi possível excluir." };
  }
  revalidatePath("/eventos");
  revalidatePath("/agenda");
  revalidatePath("/");
  return { ok: true };
}
