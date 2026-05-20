"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

const LocationSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nome é obrigatório").max(120),
  address: z.string().max(240).optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export type LocationFormValues = z.infer<typeof LocationSchema>;
export type ActionResult = { ok: true } | { ok: false; error: string };

export async function saveLocation(input: LocationFormValues): Promise<ActionResult> {
  await requireRole(["DIRECTOR", "ADMIN"]);

  const parsed = LocationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
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
  return { ok: true };
}

export async function deleteLocation(id: string): Promise<ActionResult> {
  await requireRole(["DIRECTOR", "ADMIN"]);
  try {
    await prisma.location.delete({ where: { id } });
  } catch {
    return { ok: false, error: "Não foi possível excluir (talvez existam eventos vinculados)." };
  }
  revalidatePath("/locais");
  return { ok: true };
}
