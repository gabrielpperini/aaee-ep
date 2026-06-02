/**
 * MCP da plataforma — transporte HTTP remoto (Streamable HTTP) pra usar no app
 * do Claude no celular como "conector".
 *
 * As mesmas 26 tools do stdio (mcp/tools.ts) são registradas aqui via mcp-handler.
 * Endpoint resultante (com basePath "/api"): POST /api/mcp
 *
 * Proteção: URL-capacidade. A URL do conector carrega um segredo
 * (?key=… ou header x-mcp-key) que precisa bater com MCP_SHARED_SECRET. Chave
 * errada/ausente → 404 (some o endpoint, sem disparar fluxo de OAuth do Claude).
 * Pra revogar o acesso depois do evento: troque/remova MCP_SHARED_SECRET.
 *
 * Sem login por usuário: é um segredo compartilhado de uso único (você). Ver a
 * justificativa e o trade-off em mcp/README.md.
 */

import { createMcpHandler } from "mcp-handler";
import { registerTools } from "../../../../mcp/tools";

// Prisma precisa do runtime Node (não Edge); MCP é sempre dinâmico.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const handler = createMcpHandler(
  (server) => {
    registerTools(server);
  },
  { serverInfo: { name: "aaee-ep", version: "0.1.0" } },
  { basePath: "/api", disableSse: true, maxDuration: 60 },
);

/** Confere o segredo da URL-capacidade. */
function authorized(request: Request): boolean {
  const secret = process.env.MCP_SHARED_SECRET;
  if (!secret) return false; // sem segredo configurado → endpoint fechado
  const url = new URL(request.url);
  const provided = url.searchParams.get("key") ?? request.headers.get("x-mcp-key");
  return provided === secret;
}

async function guarded(request: Request): Promise<Response> {
  if (!authorized(request)) {
    // 404 (não 401): não queremos sinalizar "autentique-se" e disparar OAuth.
    return new Response("Not found", { status: 404 });
  }
  return handler(request);
}

export { guarded as GET, guarded as POST, guarded as DELETE };
