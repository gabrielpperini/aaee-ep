"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/auth";
import { AssignmentRole, EventStatus } from "@/generated/prisma/client";

export type ActionResult = { ok: true } | { ok: false; error: string };

const AssignSchema = z.object({
  eventId: z.string().min(1),
  personId: z.string().min(1),
  role: z.nativeEnum(AssignmentRole).default(AssignmentRole.SUPPORTER),
  isCaptain: z.boolean().default(false),
  notes: z.string().max(280).optional().or(z.literal("")),
});

export async function upsertAssignment(
  input: z.input<typeof AssignSchema>,
): Promise<ActionResult> {
  await requireRole(["DIRECTOR", "ADMIN"]);
  const parsed = AssignSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { eventId, personId, role, isCaptain, notes } = parsed.data;

  await prisma.assignment.upsert({
    where: { eventId_personId: { eventId, personId } },
    create: { eventId, personId, role, isCaptain, notes: notes || null },
    update: { role, isCaptain, notes: notes || null },
  });

  revalidatePath(`/eventos/${eventId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function removeAssignment(input: {
  eventId: string;
  personId: string;
}): Promise<ActionResult> {
  await requireRole(["DIRECTOR", "ADMIN"]);
  await prisma.assignment.delete({
    where: { eventId_personId: { eventId: input.eventId, personId: input.personId } },
  });
  revalidatePath(`/eventos/${input.eventId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function checkIn(eventId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!user.person) {
    return { ok: false, error: "Complete seu perfil antes de fazer check-in." };
  }
  await prisma.checkIn.upsert({
    where: { eventId_personId: { eventId, personId: user.person.id } },
    create: { eventId, personId: user.person.id },
    update: {}, // mantém o registro original
  });
  revalidatePath(`/eventos/${eventId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function undoCheckIn(eventId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!user.person) return { ok: false, error: "Sem perfil." };
  try {
    await prisma.checkIn.delete({
      where: { eventId_personId: { eventId, personId: user.person.id } },
    });
  } catch {
    // já não existia — ok
  }
  revalidatePath(`/eventos/${eventId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

const StatusSchema = z.object({
  eventId: z.string().min(1),
  status: z.nativeEnum(EventStatus),
});

export async function setEventStatus(
  input: z.input<typeof StatusSchema>,
): Promise<ActionResult> {
  await requireRole(["DIRECTOR", "ADMIN"]);
  const parsed = StatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  await prisma.event.update({
    where: { id: parsed.data.eventId },
    data: { status: parsed.data.status },
  });
  revalidatePath(`/eventos/${parsed.data.eventId}`);
  revalidatePath("/eventos");
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  revalidatePath("/");
  return { ok: true };
}
