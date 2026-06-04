import "server-only";

import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppText, sendWhatsAppTextBatch } from "@/lib/whatsapp";

/**
 * Categorias de notificação. Mapeiam 1:1 com os campos de
 * `NotificationPreference` — usado pra respeitar o opt-out do usuário.
 */
export type PushCategory =
  | "allocation"
  | "eventReminder"
  | "captainCall"
  | "syncConflict";

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

/** Resolve o telefone de um usuário (Person.phone tem prioridade sobre User.phone). */
async function resolveUserPhone(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true, person: { select: { phone: true } } },
  });
  if (!user) return null;
  return user.person?.phone ?? user.phone;
}

/** Resolve os telefones de vários usuários numa única query. */
async function resolveUserPhones(userIds: string[]): Promise<(string | null)[]> {
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { phone: true, person: { select: { phone: true } } },
  });
  return users.map((u) => u.person?.phone ?? u.phone);
}

/**
 * Envia push pra todos os dispositivos de um usuário.
 * - Respeita `NotificationPreference` quando `payload.category` é passada.
 * - Limpa subscriptions inválidas (HTTP 410/404).
 * - Best-effort: NUNCA lança — push é complementar à UI in-app.
 */
async function pushOnlyToUser(
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
            // urgency "high" → apns-priority 10 (Apple) / Urgency: high (FCM):
            // entrega imediata. Sem isso o padrão "normal" deixa o iOS atrasar
            // a notificação (até dezenas de segundos) pra poupar bateria.
            // TTL curto: estes avisos são pontuais; não vale guardar por semanas.
            { urgency: "high", TTL: 3600 },
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

// Base dos links das notificações. NÃO usar VERCEL_URL: em deploy ela aponta
// pra URL única do deployment (ex: aaee-xxxx.vercel.app), que muda a cada build
// e não é o domínio público. Default sempre o domínio de produção.
const PROD_SITE_URL = "https://ep.aaee.com.br";
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : PROD_SITE_URL);

/** Link relativo (ex: "/agenda") → absoluto, pra abrir fora do app. */
function absoluteUrl(url?: string): string | null {
  if (!url) return null;
  if (/^https?:\/\//u.test(url)) return url;
  return `${siteUrl.replace(/\/$/u, "")}/${url.replace(/^\//u, "")}`;
}

/** Monta o texto livre da mensagem WhatsApp a partir do payload do push. */
function buildWhatsAppMessage(payload: PushPayload): string {
  const base = `*${payload.title}*\n\n${payload.body}`;
  const link = absoluteUrl(payload.url);
  return link ? `${base}\n\n${link}` : base;
}

/**
 * Notifica um usuário: WhatsApp (sempre, ignora opt-out) + push (respeita
 * `category`). Best-effort: NUNCA lança.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; cleaned: number; whatsappSent: number }> {
  const phone = await resolveUserPhone(userId).catch(() => null);
  const { sent: whatsappSent } = await sendWhatsAppText(
    phone,
    buildWhatsAppMessage(payload),
  );
  const push = await pushOnlyToUser(userId, payload);
  return { ...push, whatsappSent };
}

/**
 * Notifica vários usuários (dedup): WhatsApp em lote paralelo (sempre) + push
 * por usuário (respeita opt-out). Best-effort.
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<{ sent: number; cleaned: number; whatsappSent: number }> {
  const unique = [...new Set(userIds)];

  // WhatsApp: 1 query batelada de telefones + envio paralelo, sempre.
  const phones = await resolveUserPhones(unique).catch(() => []);
  const { sent: whatsappSent } = await sendWhatsAppTextBatch(
    phones,
    buildWhatsAppMessage(payload),
  );

  // Push: loop por usuário, respeitando preferências por categoria.
  let sent = 0;
  let cleaned = 0;
  for (const userId of unique) {
    const r = await pushOnlyToUser(userId, payload);
    sent += r.sent;
    cleaned += r.cleaned;
  }
  return { sent, cleaned, whatsappSent };
}
