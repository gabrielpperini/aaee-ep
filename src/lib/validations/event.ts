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
    day: z.number().int().min(0).max(4),
    // `startTime` é sempre obrigatório (carrega a DATA do evento, usada pra
    // ordenação e agrupamento por dia). `endTime` só é exigido quando há
    // horário definido — com `timeTbd`, o fim é ignorado.
    startTime: datetimeLocal,
    endTime: z.string(),
    timeTbd: z.boolean(),
    locationId: z.string(),
    opponent: z.string().trim().max(180),
    phase: eventPhaseEnum,
    priority: eventPriorityEnum,
    status: eventStatusEnum,
    isConditional: z.boolean(),
    desiredSupportersCount: z.number().int().min(0),
    athleteIds: idList,
  })
  .superRefine((data, ctx) => {
    if (data.timeTbd) return; // sem horário definido: não valida o fim
    if (!data.endTime || Number.isNaN(new Date(data.endTime).getTime())) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "Selecione data e hora" });
      return;
    }
    if (new Date(data.endTime).getTime() <= new Date(data.startTime).getTime()) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "Horário final deve ser depois do inicial",
      });
    }
  });

export type EventFormValues = z.infer<typeof eventSchema>;
