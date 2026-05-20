"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

const PersonSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nome é obrigatório").max(120),
  nickname: z.string().max(60).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  isAthlete: z.boolean().default(false),
  isSupporter: z.boolean().default(true),
  isDirector: z.boolean().default(false),
  isSupport: z.boolean().default(false),
  notes: z.string().max(500).optional().or(z.literal("")),
  modalityIds: z.array(z.string()).default([]),
});

export type PersonFormValues = z.infer<typeof PersonSchema>;
export type ActionResult = { ok: true } | { ok: false; error: string };

export async function savePerson(input: PersonFormValues): Promise<ActionResult> {
  await requireRole(["DIRECTOR", "ADMIN"]);

  const parsed = PersonSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { id, modalityIds, name, nickname, phone, notes, ...flags } = parsed.data;
  const data = {
    name,
    nickname: nickname?.trim() || null,
    phone: phone?.trim() || null,
    notes: notes?.trim() || null,
    ...flags,
  };

  if (id) {
    await prisma.$transaction([
      prisma.person.update({ where: { id }, data }),
      prisma.modalityAthlete.deleteMany({ where: { personId: id } }),
      ...(modalityIds.length > 0
        ? [prisma.modalityAthlete.createMany({
            data: modalityIds.map((modalityId) => ({ personId: id, modalityId })),
          })]
        : []),
    ]);
  } else {
    await prisma.person.create({
      data: {
        ...data,
        modalityAthlete: {
          create: modalityIds.map((modalityId) => ({ modalityId })),
        },
      },
    });
  }

  revalidatePath("/pessoas");
  return { ok: true };
}

export async function deletePerson(id: string): Promise<ActionResult> {
  await requireRole(["DIRECTOR", "ADMIN"]);
  try {
    await prisma.person.delete({ where: { id } });
  } catch {
    return { ok: false, error: "Não foi possível excluir." };
  }
  revalidatePath("/pessoas");
  return { ok: true };
}
