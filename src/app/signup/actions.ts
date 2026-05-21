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
    let user = await tx.user.findUnique({ where: { authUserId: authUser.id } });
    if (!user) {
      user = await tx.user.create({
        data: {
          authUserId: authUser.id,
          email: normalizedEmail,
          phone: phoneNum || authUser.phone || null,
        },
      });
    } else if (phoneNum && !user.phone) {
      user = await tx.user.update({
        where: { id: user.id },
        data: { phone: phoneNum },
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
        const target = candidates[0];
        await tx.person.update({
          where: { id: target.id },
          data: {
            userId: user.id,
            name: target.name || personData.name,
            nickname: target.nickname ?? personData.nickname,
            phone: target.phone ?? personData.phone,
            course: target.course ?? personData.course,
            semester: target.semester ?? personData.semester,
          },
        });
        return;
      }
    }

    const existing = await tx.person.findUnique({ where: { userId: user.id } });
    if (existing) {
      await tx.person.update({
        where: { id: existing.id },
        data: {
          name: existing.name || personData.name,
          nickname: existing.nickname ?? personData.nickname,
          phone: existing.phone ?? personData.phone,
          course: existing.course ?? personData.course,
          semester: existing.semester ?? personData.semester,
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
