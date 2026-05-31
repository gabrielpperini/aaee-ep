import { z } from "zod";

import { idList, optionalText, requiredText } from "./_primitives";

/**
 * Aviso geral disparado pela diretoria (broadcast push manual).
 * Público: "todo mundo" OU grupos por modalidade e/ou evento.
 */
export const broadcastSchema = z
  .object({
    title: requiredText("Título", 80),
    body: requiredText("Mensagem", 300),
    /** Link opcional aberto ao tocar na notificação (ex: /eventos/123). */
    url: optionalText(500),
    toEveryone: z.boolean(),
    modalityIds: idList,
    eventIds: idList,
  })
  .refine(
    (d) =>
      d.toEveryone || d.modalityIds.length > 0 || d.eventIds.length > 0,
    {
      message: "Selecione ao menos um grupo ou marque 'Todo mundo'.",
      path: ["toEveryone"],
    },
  );

export type BroadcastFormValues = z.infer<typeof broadcastSchema>;
