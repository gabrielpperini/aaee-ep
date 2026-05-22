import { z } from "zod";
import { optionalText } from "./_primitives";

const optionalDate = z
  .string()
  .trim()
  .refine((v) => v === "" || !Number.isNaN(new Date(v).getTime()), {
    message: "Data inválida",
  })
  .optional()
  .or(z.literal(""));

export const epEditionSchema = z.object({
  name: optionalText(120),
  day0: optionalDate,
  day1: optionalDate,
  day2: optionalDate,
  day3: optionalDate,
  day4: optionalDate,
  notes: optionalText(500),
});

export type EpEditionFormValues = z.infer<typeof epEditionSchema>;
