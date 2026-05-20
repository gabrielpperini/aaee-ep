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

  return prisma.user.create({
    data: {
      authUserId: authUser.id,
      email: authUser.email,
      phone: authUser.phone,
    },
    include: { person: true },
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
