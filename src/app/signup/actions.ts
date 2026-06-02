"use server";

import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  failure,
  fieldErrorsFromZod,
  fieldFailure,
  success,
  type FormState,
} from "@/lib/validations/_action-result";
import {
  setupAccountSchema,
  type SetupAccountValues,
} from "@/lib/validations/auth";
import { phoneDigits } from "@/lib/validations/_primitives";
import { resolveLinkablePerson } from "@/lib/auth-link";

/**
 * Após `supabase.auth.signUp` no cliente devolver uma sessão (cookies já setados),
 * o front chama esta server action passando o nome + extras do formulário.
 */
export async function setupNewAccount(
  input: SetupAccountValues,
): Promise<FormState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser)
    return failure("Sessão não encontrada — faça login novamente.");

  const parsed = setupAccountSchema.safeParse(input);
  if (!parsed.success) {
    return fieldFailure(fieldErrorsFromZod(parsed.error));
  }

  const { name, nickname, phone, course, semester } = parsed.data;
  const normalizedEmail = authUser.email?.trim().toLowerCase() ?? null;
  const phoneNum = phone ? phoneDigits(phone) || null : null;

  const personData = {
    name: name.trim(),
    nickname: nickname?.trim() || null,
    phone: phoneNum,
    course: course === "" ? null : course,
    semester: semester === "" ? null : semester,
  };

  await prisma.$transaction(async (tx) => {
    // `upsert` em vez de findUnique+create: o `getCurrentUser` (layout) pode
    // criar o User concorrentemente no primeiro login e estourar P2002 no
    // `authUserId @unique`. O upsert torna a criação idempotente.
    let user = await tx.user.upsert({
      where: { authUserId: authUser.id },
      update: {},
      create: {
        authUserId: authUser.id,
        email: normalizedEmail,
        phone: phoneNum || authUser.phone || null,
      },
    });
    if (phoneNum && !user.phone) {
      user = await tx.user.update({
        where: { id: user.id },
        data: { phone: phoneNum },
      });
    }

    // Auto-link por email ou telefone — pega quem foi importado da planilha
    // (que tem telefone mas não email) além de quem casa por email.
    const match = await resolveLinkablePerson(tx, {
      email: normalizedEmail,
      phone: phoneNum,
      authUserId: authUser.id,
    });

    if (match) {
      const target = await tx.person.findUniqueOrThrow({ where: { id: match.id } });
      await tx.person.update({
        where: { id: target.id },
        data: {
          userId: user.id,
          // Dados do cadastro prevalecem; campo não preenchido cai pro que
          // veio da planilha (importado). Flags de participação não são
          // coletadas no cadastro, então ficam as do importado.
          name: personData.name || target.name,
          nickname: personData.nickname ?? target.nickname,
          phone: personData.phone ?? target.phone,
          course: personData.course ?? target.course,
          semester: personData.semester ?? target.semester,
          email: normalizedEmail ?? target.email,
        },
      });
      return;
    }

    const existing = await tx.person.findUnique({ where: { userId: user.id } });
    if (existing) {
      // Mesma regra: o que a pessoa preencheu prevalece; vazio mantém o atual.
      await tx.person.update({
        where: { id: existing.id },
        data: {
          name: personData.name || existing.name,
          nickname: personData.nickname ?? existing.nickname,
          phone: personData.phone ?? existing.phone,
          course: personData.course ?? existing.course,
          semester: personData.semester ?? existing.semester,
        },
      });
      return;
    }

    await tx.person.create({
      data: {
        ...personData,
        userId: user.id,
        email: normalizedEmail,
      },
    });
  });

  return success();
}
