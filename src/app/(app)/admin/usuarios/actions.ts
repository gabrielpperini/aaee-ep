"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireRole } from "@/lib/auth";
import type { Role } from "@/generated/prisma/client";

export type ActionResult = { ok: true } | { ok: false; error: string };

const RoleSchema = z.enum(["USER", "DIRECTOR", "ADMIN"]);
const CuidSchema = z.string().min(1, "ID inválido");

export async function updateUserRole(
  userId: string,
  role: Role,
): Promise<ActionResult> {
  await requireRole(["ADMIN"]);

  const parsedId = CuidSchema.safeParse(userId);
  if (!parsedId.success) {
    return { ok: false, error: "ID de usuário inválido" };
  }
  const parsedRole = RoleSchema.safeParse(role);
  if (!parsedRole.success) {
    return { ok: false, error: "Função inválida" };
  }

  const current = await getCurrentUser();
  if (current && current.id === parsedId.data && parsedRole.data !== "ADMIN") {
    return {
      ok: false,
      error: "Você não pode rebaixar a si mesmo. Peça a outro admin.",
    };
  }

  const target = await prisma.user.findUnique({
    where: { id: parsedId.data },
    select: { id: true },
  });
  if (!target) {
    return { ok: false, error: "Usuário não encontrado" };
  }

  await prisma.user.update({
    where: { id: parsedId.data },
    data: { role: parsedRole.data },
  });

  revalidatePath("/admin/usuarios");
  return { ok: true };
}

export async function linkUserToPerson(
  userId: string,
  personId: string | null,
): Promise<ActionResult> {
  await requireRole(["ADMIN"]);

  const parsedUserId = CuidSchema.safeParse(userId);
  if (!parsedUserId.success) {
    return { ok: false, error: "ID de usuário inválido" };
  }
  if (personId !== null) {
    const parsedPersonId = CuidSchema.safeParse(personId);
    if (!parsedPersonId.success) {
      return { ok: false, error: "ID de pessoa inválido" };
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: parsedUserId.data },
    include: { person: { select: { id: true } } },
  });
  if (!user) {
    return { ok: false, error: "Usuário não encontrado" };
  }

  const currentPersonId = user.person?.id ?? null;

  if (currentPersonId === personId) {
    return { ok: true };
  }

  if (personId === null) {
    if (currentPersonId) {
      await prisma.person.update({
        where: { id: currentPersonId },
        data: { userId: null },
      });
    }
    revalidatePath("/admin/usuarios");
    return { ok: true };
  }

  const target = await prisma.person.findUnique({
    where: { id: personId },
    select: { id: true, userId: true },
  });
  if (!target) {
    return { ok: false, error: "Pessoa não encontrada" };
  }
  if (target.userId && target.userId !== parsedUserId.data) {
    return {
      ok: false,
      error: "Essa pessoa já está vinculada a outro usuário.",
    };
  }

  await prisma.$transaction(async (tx) => {
    if (currentPersonId && currentPersonId !== personId) {
      await tx.person.update({
        where: { id: currentPersonId },
        data: { userId: null },
      });
    }
    await tx.person.update({
      where: { id: personId },
      data: { userId: parsedUserId.data },
    });
  });

  revalidatePath("/admin/usuarios");
  return { ok: true };
}
