"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  pushSubscriptionSchema,
  unsubscribeSchema,
  notificationPreferenceSchema,
} from "@/lib/validations/push";
import type {
  PushSubscriptionInput,
  NotificationPreferenceInput,
} from "@/lib/validations/push";

export type ActionResult<TData = undefined> =
  | { ok: true; data?: TData }
  | { ok: false; error: string };

/**
 * Registra (ou atualiza) a inscrição de push do dispositivo atual.
 * `endpoint` é único — re-subscrição do mesmo device faz upsert e re-associa
 * ao user logado. Garante uma NotificationPreference (default tudo ligado).
 */
export async function subscribePush(
  input: PushSubscriptionInput,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = pushSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { endpoint, p256dh, auth, userAgent } = parsed.data;

  await prisma.$transaction([
    prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId: user.id, endpoint, p256dh, auth, userAgent },
      update: { userId: user.id, p256dh, auth, userAgent, lastSeenAt: new Date() },
    }),
    prisma.notificationPreference.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    }),
  ]);

  revalidatePath("/perfil");
  return { ok: true };
}

/** Remove a inscrição de um endpoint (só do próprio user). */
export async function unsubscribePush(input: {
  endpoint: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = unsubscribeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Endpoint inválido." };
  }

  await prisma.pushSubscription.deleteMany({
    where: { endpoint: parsed.data.endpoint, userId: user.id },
  });

  revalidatePath("/perfil");
  return { ok: true };
}

/** Atualiza as preferências de categoria do usuário (B7). */
export async function updateNotificationPreferences(
  input: NotificationPreferenceInput,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = notificationPreferenceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Preferências inválidas." };
  }

  await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...parsed.data },
    update: parsed.data,
  });

  revalidatePath("/perfil");
  return { ok: true };
}
