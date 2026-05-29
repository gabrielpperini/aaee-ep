import { z } from "zod";

/** Inscrição serializada do `PushSubscription` do browser. */
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(1000),
  p256dh: z.string().min(1).max(500),
  auth: z.string().min(1).max(500),
  userAgent: z.string().max(500).optional(),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

export const unsubscribeSchema = z.object({
  endpoint: z.string().url().max(1000),
});

/** Categorias de notificação que a pessoa pode ligar/desligar. */
export const notificationPreferenceSchema = z.object({
  allocation: z.boolean(),
  eventReminder: z.boolean(),
  captainCall: z.boolean(),
});

export type NotificationPreferenceInput = z.infer<
  typeof notificationPreferenceSchema
>;

/** Mensagem livre do "chamado da torcida" (B6). */
export const callSupportersSchema = z.object({
  eventId: z.string().min(1),
  message: z.string().trim().min(1, "Escreva uma mensagem.").max(100),
});
