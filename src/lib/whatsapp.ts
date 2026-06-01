import "server-only";

/**
 * Cliente do microserviço WhatsApp (baileys) — ver `whatsapp-service/`.
 *
 * O app roda em Vercel serverless e NÃO consegue rodar baileys (precisa de
 * processo always-on + WebSocket + sessão em disco). Então delegamos o envio
 * para o microserviço via HTTP. Texto livre, sem templates da Meta.
 *
 * Best-effort: NUNCA lança — WhatsApp é complementar ao push/UI in-app.
 * Sem `WHATSAPP_SERVICE_URL`/`_TOKEN` configurados → no-op silencioso.
 */

type Config = { url: string; token: string };

function getConfig(): Config | null {
  const url = process.env.WHATSAPP_SERVICE_URL;
  const token = process.env.WHATSAPP_SERVICE_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/$/u, ""), token };
}

/**
 * POST único pro serviço. `to` pode ser um número ou uma lista — o serviço
 * dedup/normaliza, enfileira e envia com pacing. Retorna `accepted` (quantos
 * números válidos entraram na fila), 0 em qualquer falha.
 */
async function postSend(
  to: string | string[],
  message: string,
): Promise<number> {
  const config = getConfig();
  if (!config) return 0;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${config.url}/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, message }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return 0;
    const data = (await res.json().catch(() => null)) as {
      accepted?: number;
    } | null;
    return data?.accepted ?? 0;
  } catch {
    // Rede/timeout/serviço fora — WhatsApp nunca quebra o fluxo.
    return 0;
  }
}

/** Envia texto livre pra um telefone BR (10/11 dígitos). */
export async function sendWhatsAppText(
  phone: string | null | undefined,
  message: string,
): Promise<{ sent: number }> {
  if (!phone) return { sent: 0 };
  return { sent: await postSend(phone, message) };
}

/** Envia o mesmo texto pra vários telefones num único POST (serviço faz o pacing). */
export async function sendWhatsAppTextBatch(
  phones: Array<string | null | undefined>,
  message: string,
): Promise<{ sent: number }> {
  const list = phones.filter((p): p is string => Boolean(p));
  if (list.length === 0) return { sent: 0 };
  return { sent: await postSend(list, message) };
}
