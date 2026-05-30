import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { resolveLinkablePerson } from "@/lib/auth-link";
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
  // Dados que vieram do cadastro (salvos no metadata do signUp: name/nickname/phone).
  const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
  const metaName =
    (typeof meta.name === "string" && meta.name.trim()) ||
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    null;
  const metaNickname =
    (typeof meta.nickname === "string" && meta.nickname.trim()) || null;
  const metaPhoneRaw =
    authUser.phone ||
    (typeof meta.phone === "string" ? meta.phone : "") ||
    "";
  const phoneDigits = metaPhoneRaw.replace(/\D/g, "") || null;

  return prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        authUserId: authUser.id,
        email: normalizedEmail,
        phone: phoneDigits,
      },
    });

    // Auto-link por email, telefone ou nome (importados têm telefone, não email).
    const match = await resolveLinkablePerson(tx, {
      email: normalizedEmail,
      phone: phoneDigits,
      name: metaName,
      authUserId: authUser.id,
    });

    if (match) {
      // Ao vincular, os dados do cadastro prevalecem; campo sem valor no
      // cadastro mantém o que veio da planilha (importado).
      await tx.person.update({
        where: { id: match.id },
        data: {
          userId: newUser.id,
          ...(metaName ? { name: metaName } : {}),
          ...(metaNickname ? { nickname: metaNickname } : {}),
          ...(phoneDigits ? { phone: phoneDigits } : {}),
          ...(!match.email && normalizedEmail ? { email: normalizedEmail } : {}),
        },
      });
    } else {
      // Sem vínculo → cria a Person com o que o cadastro/Supabase tem.
      await tx.person.create({
        data: {
          userId: newUser.id,
          name: metaName || normalizedEmail || "Membro",
          nickname: metaNickname,
          email: normalizedEmail,
          phone: phoneDigits,
        },
      });
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
