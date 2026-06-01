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
import { syncPersonRoster } from "@/lib/roster";

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

  await prisma.$transaction(async (tx) => {
    let personId = user.person?.id;
    if (personId) {
      await tx.person.update({ where: { id: personId }, data });
      await tx.modalityAthlete.deleteMany({ where: { personId } });
      if (modalityIds.length > 0) {
        await tx.modalityAthlete.createMany({
          data: modalityIds.map((modalityId) => ({ personId: personId!, modalityId })),
        });
      }
    } else {
      const person = await tx.person.create({
        data: {
          ...data,
          userId: user.id,
          modalityAthlete: {
            create: modalityIds.map((modalityId) => ({ modalityId })),
          },
        },
      });
      personId = person.id;
    }
    // escalação automática nos eventos das modalidades da pessoa
    await syncPersonRoster(tx, personId, modalityIds);
  });

  revalidatePath("/perfil");
  return success();
}
