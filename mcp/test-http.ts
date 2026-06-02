/**
 * Teste local da rota HTTP do MCP (sem subir o Next inteiro). Importa o handler
 * guardado da rota e dispara Requests JSON-RPC, validando a guarda de
 * URL-capacidade + initialize + tools/list + um tools/call.
 *
 * Rodar:  tsx mcp/test-http.ts
 */
import "./load-env";
import { POST } from "@/app/api/[transport]/route";

const KEY = process.env.MCP_SHARED_SECRET ?? "";
const BASE = "https://local.test/api/mcp";

function rpc(body: unknown, key = KEY) {
  const url = key ? `${BASE}?key=${encodeURIComponent(key)}` : BASE;
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      // Streamable HTTP exige aceitar JSON e SSE.
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify(body),
  });
}

/** Extrai o objeto JSON-RPC, seja resposta JSON pura ou frame SSE. */
async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  // SSE: linhas "data: {...}"
  const dataLines = trimmed
    .split("\n")
    .filter((l) => l.startsWith("data:"))
    .map((l) => l.slice(5).trim());
  const last = dataLines[dataLines.length - 1];
  return last ? JSON.parse(last) : text;
}

async function main() {
  console.log("KEY presente:", KEY ? `sim (${KEY.length} chars)` : "NÃO");

  // 1) Guarda: chave errada → 404
  const bad = await POST(rpc({ jsonrpc: "2.0", id: 0, method: "ping" }, "errada"));
  console.log("\n[guarda] chave errada → status", bad.status, bad.status === 404 ? "✓" : "✗ (esperado 404)");

  // 2) initialize
  const initRes = await POST(
    rpc({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "smoke", version: "0" } },
    }),
  );
  console.log("\n[initialize] status", initRes.status);
  const init = (await readBody(initRes)) as { result?: { serverInfo?: { name?: string } } };
  console.log("  serverInfo:", init.result?.serverInfo?.name);

  // 3) tools/list
  const listRes = await POST(rpc({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }));
  const list = (await readBody(listRes)) as { result?: { tools?: { name: string }[] } };
  const names = list.result?.tools?.map((t) => t.name) ?? [];
  console.log("\n[tools/list] status", listRes.status, "→", names.length, "tools");
  console.log("  ", names.join(", "));

  // 4) tools/call dashboard_summary (leitura, não muta nada)
  const callRes = await POST(
    rpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "dashboard_summary", arguments: {} } }),
  );
  const call = (await readBody(callRes)) as { result?: { content?: { text?: string }[]; isError?: boolean } };
  console.log("\n[tools/call dashboard_summary] status", callRes.status, call.result?.isError ? "(isError)" : "");
  console.log("  ", call.result?.content?.[0]?.text?.slice(0, 300));

  process.exit(0);
}

main().catch((e) => {
  console.error("falha:", e);
  process.exit(1);
});
