import { z } from "zod";
import {
  courseEnum,
  idList,
  requiredText,
} from "./_primitives";

export const profileSchema = z.object({
  name: requiredText("Nome", 120),
  nickname: z.string().trim().max(60),
  email: z.string().trim().toLowerCase().email("Email inválido").or(z.literal("")),
  phone: z
    .string()
    .refine(
      (v) => v === "" || /^\d{10,11}$/u.test(v.replace(/\D/g, "")),
      "Telefone deve ter 10 ou 11 dígitos",
    ),
  course: z.union([courseEnum, z.literal("")]),
  semester: z.union([
    z.number().int().min(1).max(10),
    z.literal(""),
  ]),
  modalityIds: idList,
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
