"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const SetupSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(120),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Após `supabase.auth.signUp` no cliente devolver uma sessão (cookies já setados),
 * o front chama esta server action passando o nome digitado no formulário.
 *
 * - Garante que existe um User no nosso banco (auto-cria igual `getCurrentUser`)
 * - Tenta auto-linkar com um Person pré-cadastrado pelo email (mesma lógica do
 *   `getCurrentUser`); se achar exatamente um, vincula e seta o nome se vazio
 * - Caso contrário, cria um Person novo já vinculado ao User
 */
export async function setupNewAccount(input: { name: string }): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return { ok: false, error: "Sessão não encontrada — faça login novamente." };

  const parsed = SetupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const name = parsed.data.name.trim();
  const normalizedEmail = authUser.email?.trim().toLowerCase() ?? null;

  await prisma.$transaction(async (tx) => {
    let user = await tx.user.findUnique({ where: { authUserId: authUser.id } });
    if (!user) {
      user = await tx.user.create({
        data: {
          authUserId: authUser.id,
          email: normalizedEmail,
          phone: authUser.phone ?? null,
        },
      });
    }

    if (normalizedEmail) {
      const candidates = await tx.person.findMany({
        where: {
          userId: null,
          email: { equals: normalizedEmail, mode: "insensitive" },
        },
        take: 2,
      });

      if (candidates.length === 1) {
        await tx.person.update({
          where: { id: candidates[0].id },
          data: { userId: user.id },
        });
        return;
      }
    }

    const existing = await tx.person.findUnique({ where: { userId: user.id } });
    if (existing) return;

    await tx.person.create({
      data: {
        userId: user.id,
        name,
        email: normalizedEmail,
      },
    });
  });

  return { ok: true };
}
