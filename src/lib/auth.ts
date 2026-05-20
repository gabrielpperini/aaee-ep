import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/client";

/**
 * Carrega o usuário autenticado e o registro local em `User` (com Person).
 * Garante que existe um `User` no nosso banco com o mesmo `authUserId` —
 * cria sob demanda na primeira vez que a pessoa loga.
 *
 * Na criação, tenta auto-linkar com um `Person` existente cujo `email`
 * bata (case-insensitive) com o email autenticado, desde que esse Person
 * ainda não esteja vinculado a outro User. Se houver múltiplos candidatos,
 * NÃO faz o link automaticamente (deixa para o admin resolver).
 *
 * Memoizado por request via React `cache`.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const existing = await prisma.user.findUnique({
    where: { authUserId: authUser.id },
    include: { person: true },
  });

  if (existing) return existing;

  const normalizedEmail = authUser.email?.trim().toLowerCase() ?? null;

  return prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        authUserId: authUser.id,
        email: normalizedEmail,
        phone: authUser.phone,
      },
    });

    if (normalizedEmail) {
      const candidates = await tx.person.findMany({
        where: {
          userId: null,
          email: { equals: normalizedEmail, mode: "insensitive" },
        },
        select: { id: true },
        take: 2,
      });

      if (candidates.length === 1) {
        await tx.person.update({
          where: { id: candidates[0].id },
          data: { userId: newUser.id },
        });
      } else if (candidates.length > 1) {
        console.warn(
          `[auth] Auto-link skipped: múltiplos Persons (${candidates.length}+) com email ${normalizedEmail}. Resolva manualmente.`,
        );
      }
    }

    return tx.user.findUniqueOrThrow({
      where: { id: newUser.id },
      include: { person: true },
    });
  });
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(roles: Role | Role[]) {
  const user = await requireUser();
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(user.role)) redirect("/");
  return user;
}

export function canManage(role: Role): boolean {
  return role === "DIRECTOR" || role === "ADMIN";
}

export function isAdmin(role: Role): boolean {
  return role === "ADMIN";
}
