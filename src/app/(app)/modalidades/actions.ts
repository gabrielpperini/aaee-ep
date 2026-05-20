"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

const ModalitySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nome é obrigatório").max(120),
  category: z.enum(["SPORT", "CULTURAL", "CHEERING", "LOGISTICS", "GENERAL"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export type ModalityFormValues = z.infer<typeof ModalitySchema>;
export type ActionResult = { ok: true } | { ok: false; error: string };

export async function saveModality(input: ModalityFormValues): Promise<ActionResult> {
  await requireRole(["DIRECTOR", "ADMIN"]);

  const parsed = ModalitySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
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
    return { ok: false, error: "Já existe uma modalidade com esse nome." };
  }

  revalidatePath("/modalidades");
  return { ok: true };
}

export async function deleteModality(id: string): Promise<ActionResult> {
  await requireRole(["DIRECTOR", "ADMIN"]);
  try {
    await prisma.modality.delete({ where: { id } });
  } catch {
    return { ok: false, error: "Não foi possível excluir (existem eventos vinculados)." };
  }
  revalidatePath("/modalidades");
  return { ok: true };
}
