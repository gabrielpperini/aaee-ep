"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { sendPushToUsers } from "@/lib/push";
import {
  fieldErrorsFromZod,
  fieldFailure,
  success,
  type FormState,
} from "@/lib/validations/_action-result";
import {
  broadcastSchema,
  type BroadcastFormValues,
} from "@/lib/validations/broadcast";

type Audience = Pick<
  BroadcastFormValues,
  "toEveryone" | "modalityIds" | "eventIds"
>;

/**
 * Resolve o público em uma lista de `User.id` (dedup).
 * - `toEveryone` → todas as pessoas com conta.
 * - senão, união de: atletas das modalidades + atletas dos eventos +
 *   pessoas escaladas (torcida/apoio) nos eventos.
 * Reutilizado pelo preview e pelo envio.
 */
async function resolveRecipientUserIds(audience: Audience): Promise<string[]> {
  const ids = new Set<string>();

  if (audience.toEveryone) {
    const people = await prisma.person.findMany({
      where: { userId: { not: null } },
      select: { userId: true },
    });
    for (const p of people) if (p.userId) ids.add(p.userId);
    return [...ids];
  }

  const { modalityIds, eventIds } = audience;

  const [modalityAthletes, eventAthletes, assignments] = await Promise.all([
    modalityIds.length
      ? prisma.modalityAthlete.findMany({
          where: { modalityId: { in: modalityIds } },
          select: { person: { select: { userId: true } } },
        })
      : [],
    eventIds.length
      ? prisma.eventAthlete.findMany({
          where: { eventId: { in: eventIds } },
          select: { person: { select: { userId: true } } },
        })
      : [],
    eventIds.length
      ? prisma.assignment.findMany({
          where: { eventId: { in: eventIds } },
          select: { person: { select: { userId: true } } },
        })
      : [],
  ]);

  for (const row of [...modalityAthletes, ...eventAthletes, ...assignments]) {
    if (row.person.userId) ids.add(row.person.userId);
  }
  return [...ids];
}

/**
 * Conta quantas pessoas receberiam o aviso, sem enviar nada.
 * Chamada direta pelo client (confirm dialog) — valida o público e role.
 */
export async function previewRecipientCount(
  audience: Audience,
): Promise<{ count: number }> {
  await requireRole(["DIRECTOR", "ADMIN"]);
  const userIds = await resolveRecipientUserIds({
    toEveryone: Boolean(audience.toEveryone),
    modalityIds: audience.modalityIds ?? [],
    eventIds: audience.eventIds ?? [],
  });
  return { count: userIds.length };
}

/**
 * Envia o aviso da diretoria via push para o público escolhido e registra
 * o envio em `Broadcast`. Sem `category` → ignora opt-out (aviso oficial).
 */
export async function sendBroadcast(
  _prev: FormState,
  input: BroadcastFormValues,
): Promise<FormState> {
  const user = await requireRole(["DIRECTOR", "ADMIN"]);

  const parsed = broadcastSchema.safeParse(input);
  if (!parsed.success) {
    return fieldFailure(fieldErrorsFromZod(parsed.error));
  }

  const v = parsed.data;
  const title = v.title.trim();
  const body = v.body.trim();
  const url = v.url?.trim() || null;

  const userIds = await resolveRecipientUserIds(v);

  // Best-effort: nunca lança. Sem category → bypassa NotificationPreference.
  const { sent } = await sendPushToUsers(userIds, {
    title,
    body,
    url: url ?? "/agenda",
  });

  await prisma.broadcast.create({
    data: {
      sentById: user.id,
      title,
      body,
      url,
      toEveryone: v.toEveryone,
      modalityIds: v.toEveryone ? [] : v.modalityIds,
      eventIds: v.toEveryone ? [] : v.eventIds,
      recipientCount: userIds.length,
      sentCount: sent,
    },
  });

  revalidatePath("/admin/notificacoes");
  return success({ recipientCount: userIds.length, sentCount: sent });
}
