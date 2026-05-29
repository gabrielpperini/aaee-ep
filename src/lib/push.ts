import "server-only";

import webpush from "web-push";
import { prisma } from "@/lib/prisma";

/**
 * Categorias de notificação. Mapeiam 1:1 com os campos de
 * `NotificationPreference` — usado pra respeitar o opt-out do usuário.
 */
export type PushCategory = "allocation" | "eventReminder" | "captainCall";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  /** Se omitida, o envio ignora preferências (ex: testes). */
  category?: PushCategory;
};

let configured = false;

/** Configura o web-push lazy (1ª chamada). Sem VAPID → no-op silencioso. */
function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

/** True se a categoria está ligada (ou se não há categoria a checar). */
async function categoryEnabled(
  userId: string,
  category?: PushCategory,
): Promise<boolean> {
  if (!category) return true;
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId },
  });
  // Sem registro → default tudo ligado.
  if (!pref) return true;
  return pref[category];
}

/**
 * Envia push pra todos os dispositivos de um usuário.
 * - Respeita `NotificationPreference` quando `payload.category` é passada.
 * - Limpa subscriptions inválidas (HTTP 410/404).
 * - Best-effort: NUNCA lança — push é complementar à UI in-app.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; cleaned: number }> {
  let sent = 0;
  let cleaned = 0;
  try {
    if (!ensureConfigured()) return { sent, cleaned };
    if (!(await categoryEnabled(userId, payload.category))) {
      return { sent, cleaned };
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });
    if (subscriptions.length === 0) return { sent, cleaned };

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url,
      tag: payload.tag,
    });

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            body,
          );
          sent += 1;
          await prisma.pushSubscription.update({
            where: { id: sub.id },
            data: { lastSeenAt: new Date() },
          });
        } catch (err) {
          const statusCode = (err as { statusCode?: number })?.statusCode;
          if (statusCode === 410 || statusCode === 404) {
            await prisma.pushSubscription
              .delete({ where: { id: sub.id } })
              .catch(() => undefined);
            cleaned += 1;
          }
          // Outros erros: ignora (rede, etc.) — best-effort.
        }
      }),
    );
  } catch {
    // Falha global (ex: DB indisponível) — push nunca quebra o fluxo.
  }
  return { sent, cleaned };
}

/** Envia o mesmo payload pra vários usuários (dedup). */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<{ sent: number; cleaned: number }> {
  const unique = [...new Set(userIds)];
  let sent = 0;
  let cleaned = 0;
  for (const userId of unique) {
    const r = await sendPushToUser(userId, payload);
    sent += r.sent;
    cleaned += r.cleaned;
  }
  return { sent, cleaned };
}
