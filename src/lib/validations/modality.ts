import { z } from "zod";
import {
  eventPriorityEnum,
  modalityCategoryEnum,
  optionalText,
  requiredText,
} from "./_primitives";

export const modalitySchema = z.object({
  id: z.string().optional(),
  name: requiredText("Nome", 120),
  category: modalityCategoryEnum,
  priority: eventPriorityEnum,
  notes: optionalText(500),
});

export type ModalityFormValues = z.infer<typeof modalitySchema>;
