import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import pino from "pino";

import { start, isReady, queueSize, enqueue } from "./wa";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

const PORT = Number(process.env.PORT ?? 9173);
const TOKEN = process.env.WA_SERVICE_TOKEN;

function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(payload);
}

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) reject(new Error("payload too large"));
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("invalid json"));
      }
    });
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  // Health não exige auth (usado por health-check do host).
  if (req.method === "GET" && req.url === "/health") {
    return json(res, 200, { ok: true, ready: isReady(), queued: queueSize() });
  }

  // Tudo além de /health exige o token.
  const auth = req.headers["authorization"];
  if (!TOKEN || auth !== `Bearer ${TOKEN}`) {
    return json(res, 401, { error: "unauthorized" });
  }

  if (req.method === "POST" && req.url === "/send") {
    if (!isReady()) return json(res, 503, { error: "not_ready" });

    let body: { to?: string | string[]; message?: string };
    try {
      body = (await readJson(req)) as typeof body;
    } catch {
      return json(res, 400, { error: "bad_json" });
    }

    const { to, message } = body ?? {};
    if (
      !to ||
      (Array.isArray(to) && to.length === 0) ||
      typeof message !== "string" ||
      message.trim().length === 0
    ) {
      return json(res, 400, { error: "missing_to_or_message" });
    }

    // Enfileira e responde já — o envio roda em background com pacing.
    const accepted = enqueue(to, message);
    return json(res, 202, { accepted });
  }

  return json(res, 404, { error: "not_found" });
});

server.listen(PORT, () => {
  logger.info(`whatsapp-service HTTP em :${PORT}`);
  if (!TOKEN) {
    logger.warn("WA_SERVICE_TOKEN não definido — /send vai recusar tudo (401).");
  }
});

void start();
