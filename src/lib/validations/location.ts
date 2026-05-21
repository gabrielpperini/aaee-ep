import { z } from "zod";
import { optionalText, requiredText } from "./_primitives";

export const locationSchema = z.object({
  id: z.string().optional(),
  name: requiredText("Nome", 120),
  address: optionalText(240),
  description: optionalText(500),
  notes: optionalText(500),
});

export type LocationFormValues = z.infer<typeof locationSchema>;
