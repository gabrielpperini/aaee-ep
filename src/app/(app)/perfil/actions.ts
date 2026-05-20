"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const ProfileSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(120),
  nickname: z.string().max(60).optional().or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  modalityIds: z.array(z.string()).default([]),
});

export type ProfileFormValues = z.infer<typeof ProfileSchema>;
export type ActionResult = { ok: true } | { ok: false; error: string };

export async function saveOwnProfile(input: ProfileFormValues): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = ProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { name, nickname, email, phone, modalityIds } = parsed.data;

  const data = {
    name: name.trim(),
    nickname: nickname?.trim() || null,
    email: email?.trim().toLowerCase() || null,
    phone: phone?.trim() || null,
  };

  if (user.person) {
    const personId = user.person.id;
    await prisma.$transaction([
      prisma.person.update({ where: { id: personId }, data }),
      prisma.modalityAthlete.deleteMany({ where: { personId } }),
      ...(modalityIds.length > 0
        ? [
            prisma.modalityAthlete.createMany({
              data: modalityIds.map((modalityId) => ({ personId, modalityId })),
            }),
          ]
        : []),
    ]);
  } else {
    await prisma.person.create({
      data: {
        ...data,
        userId: user.id,
        modalityAthlete: {
          create: modalityIds.map((modalityId) => ({ modalityId })),
        },
      },
    });
  }

  revalidatePath("/perfil");
  return { ok: true };
}
