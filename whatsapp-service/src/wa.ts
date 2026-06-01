import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion,
  type WASocket,
} from "baileys";
import qrcode from "qrcode-terminal";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

/** Diretório PERSISTENTE da sessão — não pode ser efêmero (senão repareia sempre). */
const AUTH_DIR = process.env.WA_AUTH_DIR ?? "./auth_info";

let sock: WASocket | null = null;
let ready = false;

export function isReady(): boolean {
  return ready;
}

// ---------------------------------------------------------------------------
// Fila de envio com pacing — baileys precisa enviar em ritmo "humano" pra
// reduzir risco de ban. Uma única fila sequencial pro processo todo.
// ---------------------------------------------------------------------------

type Job = { number: string; message: string };
const jobs: Job[] = [];
let working = false;

export function queueSize(): number {
  return jobs.length;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Delay aleatório entre envios (1–3s). */
function jitter(min = 1000, max = 3000): number {
  return Math.floor(min + Math.random() * (max - min));
}

/** 10/11 dígitos BR → com DDI 55. null se claramente inválido. */
function normalize(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length < 10) return null;
  return d.startsWith("55") ? d : `55${d}`;
}

/**
 * Enfileira o envio do `message` para cada número (dedup + normalização).
 * Retorna quantos números válidos foram aceitos na fila. Processa em background.
 */
export function enqueue(numbers: string[] | string, message: string): number {
  const arr = Array.isArray(numbers) ? numbers : [numbers];
  const unique = [
    ...new Set(arr.map(normalize).filter((n): n is string => n !== null)),
  ];
  for (const number of unique) jobs.push({ number, message });
  void drain();
  return unique.length;
}

async function drain(): Promise<void> {
  if (working) return;
  working = true;
  try {
    while (jobs.length > 0) {
      // Sem conexão: para o loop; `connection.update` (open) chama drain de novo.
      if (!ready || !sock) break;

      const job = jobs.shift()!;
      try {
        // onWhatsApp resolve o JID real (corrige o nono dígito BR) e diz se existe.
        const [hit] = (await sock.onWhatsApp(job.number)) ?? [];
        if (hit?.exists && hit.jid) {
          await sock.sendMessage(hit.jid, { text: job.message });
          logger.info({ to: job.number }, "sent");
        } else {
          logger.warn({ to: job.number }, "skipped (sem WhatsApp)");
        }
      } catch (err) {
        logger.error({ to: job.number, err: String(err) }, "send failed");
      }
      await delay(jitter());
    }
  } finally {
    working = false;
  }
}

// ---------------------------------------------------------------------------
// Conexão baileys
// ---------------------------------------------------------------------------

export async function start(): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    browser: Browsers.ubuntu("AAEE EP"),
    logger,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info(
        "Escaneie o QR abaixo no WhatsApp do número dedicado (Aparelhos conectados → Conectar):",
      );
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      ready = true;
      logger.info("WhatsApp conectado.");
      void drain(); // retoma fila pendente
    }

    if (connection === "close") {
      ready = false;
      const statusCode = (
        lastDisconnect?.error as { output?: { statusCode?: number } } | undefined
      )?.output?.statusCode;

      if (statusCode === DisconnectReason.loggedOut) {
        logger.error(
          "Sessão deslogada. Apague WA_AUTH_DIR e reinicie pra reparear (novo QR).",
        );
      } else {
        logger.warn({ statusCode }, "Conexão caiu — reconectando…");
        void start();
      }
    }
  });
}
