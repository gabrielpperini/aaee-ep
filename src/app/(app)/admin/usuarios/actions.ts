"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireRole } from "@/lib/auth";
import type { Role } from "@/generated/prisma/client";
import {
  failure,
  fieldErrorsFromZod,
  fieldFailure,
  success,
  type FormState,
} from "@/lib/validations/_action-result";
import { userEditSchema, type UserEditFormValues } from "@/lib/validations/user";


async function applyRoleChange(
  userId: string,
  role: Role,
): Promise<FormState> {
  const current = await getCurrentUser();
  if (current && current.id === userId && role !== "ADMIN") {
    return failure("Você não pode rebaixar a si mesmo. Peça a outro admin.");
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!target) {
    return failure("Usuário não encontrado");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role },
  });
  return success();
}

async function applyPersonLink(
  userId: string,
  personId: string | null,
): Promise<FormState> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { person: { select: { id: true } } },
  });
  if (!user) return failure("Usuário não encontrado");

  const currentPersonId = user.person?.id ?? null;
  if (currentPersonId === personId) return success();

  if (personId === null) {
    if (currentPersonId) {
      await prisma.person.update({
        where: { id: currentPersonId },
        data: { userId: null },
      });
    }
    return success();
  }

  const target = await prisma.person.findUnique({
    where: { id: personId },
    select: { id: true, userId: true },
  });
  if (!target) return failure("Pessoa não encontrada");
  if (target.userId && target.userId !== userId) {
    return failure("Essa pessoa já está vinculada a outro usuário.");
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
      data: { userId: userId },
    });
  });
  return success();
}

export async function saveUserEdit(
  _prev: FormState,
  input: UserEditFormValues,
): Promise<FormState> {
  await requireRole(["ADMIN"]);

  const parsed = userEditSchema.safeParse(input);
  if (!parsed.success) {
    return fieldFailure(fieldErrorsFromZod(parsed.error));
  }

  const { userId, role, personId } = parsed.data;

  const roleResult = await applyRoleChange(userId, role);
  if (roleResult.status === "error") return roleResult;

  const linkResult = await applyPersonLink(userId, personId);
  if (linkResult.status === "error") return linkResult;

  revalidatePath("/admin/usuarios");
  return success();
}

