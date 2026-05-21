import { z } from "zod";
import {
  datetimeLocal,
  eventPhaseEnum,
  eventPriorityEnum,
  eventStatusEnum,
  idList,
  optionalText,
  requiredText,
} from "./_primitives";

export const eventSchema = z
  .object({
    id: z.string().optional(),
    modalityId: z.string().min(1, "Selecione uma modalidade"),
    title: requiredText("Título", 180),
    description: optionalText(1000),
    day: z.number().int().min(1).max(3),
    startTime: datetimeLocal,
    endTime: datetimeLocal,
    locationId: z.string(),
    opponent: z.string().trim().max(180),
    phase: eventPhaseEnum,
    priority: eventPriorityEnum,
    status: eventStatusEnum,
    isConditional: z.boolean(),
    desiredSupportersCount: z.number().int().min(0),
    athleteIds: idList,
  })
  .refine(
    (data) => new Date(data.endTime).getTime() > new Date(data.startTime).getTime(),
    {
      message: "Horário final deve ser depois do inicial",
      path: ["endTime"],
    },
  );

export type EventFormValues = z.infer<typeof eventSchema>;
