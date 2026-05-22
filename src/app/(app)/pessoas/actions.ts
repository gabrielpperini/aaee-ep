"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";
import {
  failure,
  fieldErrorsFromZod,
  fieldFailure,
  success,
  type FormState,
} from "@/lib/validations/_action-result";
import { personSchema, type PersonFormValues } from "@/lib/validations/person";
import { phoneDigits } from "@/lib/validations/_primitives";

export async function savePerson(
  _prev: FormState,
  input: PersonFormValues,
): Promise<FormState> {
  await requireRole(["DIRECTOR", "ADMIN"]);

  const parsed = personSchema.safeParse(input);
  if (!parsed.success) {
    return fieldFailure(fieldErrorsFromZod(parsed.error));
  }

  const { id, modalityIds, name, nickname, email, phone, notes, ...flags } = parsed.data;
  const data = {
    name,
    nickname: nickname?.trim() || null,
    email: email?.trim().toLowerCase() || null,
    phone: phone ? phoneDigits(phone) || null : null,
    notes: notes?.trim() || null,
    ...flags,
  };

  try {
    if (id) {
      await prisma.$transaction([
        prisma.person.update({ where: { id }, data }),
        prisma.modalityAthlete.deleteMany({ where: { personId: id } }),
        ...(modalityIds.length > 0
          ? [prisma.modalityAthlete.createMany({
              data: modalityIds.map((modalityId) => ({ personId: id, modalityId })),
            })]
          : []),
      ]);
    } else {
      await prisma.person.create({
        data: {
          ...data,
          modalityAthlete: {
            create: modalityIds.map((modalityId) => ({ modalityId })),
          },
        },
      });
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = (e.meta?.target ?? []) as string[];
      if (target.includes("email")) {
        return fieldFailure({ email: "Já existe uma pessoa com esse email." });
      }
    }
    throw e;
  }

  revalidatePath("/pessoas");
  return success();
}

export async function deletePerson(id: string): Promise<FormState> {
  await requireRole(["DIRECTOR", "ADMIN"]);
  try {
    await prisma.person.delete({ where: { id } });
  } catch {
    return failure("Não foi possível excluir.");
  }
  revalidatePath("/pessoas");
  return success();
}
