import { z } from "zod";
import {
  idList,
  optionalEmail,
  optionalPhoneBR,
  optionalText,
  requiredText,
} from "./_primitives";

export const personSchema = z.object({
  id: z.string().optional(),
  name: requiredText("Nome", 120),
  nickname: z.string().trim().max(60).optional().or(z.literal("")),
  email: optionalEmail,
  phone: optionalPhoneBR,
  isAthlete: z.boolean(),
  isSupporter: z.boolean(),
  isDirector: z.boolean(),
  isSupport: z.boolean(),
  isBateria: z.boolean(),
  notes: optionalText(500),
  modalityIds: idList,
});

export type PersonFormValues = z.infer<typeof personSchema>;
