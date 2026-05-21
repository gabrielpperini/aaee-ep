"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import type { Course } from "@/generated/prisma/client";
import {
  fieldErrorsFromZod,
  fieldFailure,
  success,
  type FormState,
} from "@/lib/validations/_action-result";
import {
  profileSchema,
  type ProfileFormValues,
} from "@/lib/validations/profile";
import { phoneDigits } from "@/lib/validations/_primitives";

export async function saveOwnProfile(
  _prev: FormState,
  input: ProfileFormValues,
): Promise<FormState> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return fieldFailure(fieldErrorsFromZod(parsed.error));
  }

  const { name, nickname, email, phone, course, semester, modalityIds } = parsed.data;

  const data = {
    name: name.trim(),
    nickname: nickname?.trim() || null,
    email: email?.trim().toLowerCase() || null,
    phone: phone ? phoneDigits(phone) || null : null,
    course: (course || null) as Course | null,
    semester: typeof semester === "number" ? semester : null,
  };

  if (user.person) {
    const personId = user.person.id;
    await prisma.$transaction([
      prisma.person.update({ where: { id: personId }, data }),
      prisma.modalityAthlete.deleteMany({ where: { personId } }),
      ...(modalityIds.length > 0
        ? [
            prisma.modalityAthlete.createMany({
              data: modalityIds.map((modalityId) => ({ personId, modalityId })),
            }),
          ]
        : []),
    ]);
  } else {
    await prisma.person.create({
      data: {
        ...data,
        userId: user.id,
        modalityAthlete: {
          create: modalityIds.map((modalityId) => ({ modalityId })),
        },
      },
    });
  }

  revalidatePath("/perfil");
  return success();
}
