/**
 * MCP da plataforma AAEE-EP — transporte STDIO (uso local no Claude Desktop).
 *
 * As tools vivem em ./tools.ts e são compartilhadas com a rota HTTP remota
 * (src/app/api/[transport]/route.ts). Aqui só montamos o McpServer no stdio.
 *
 * Rodar:  pnpm mcp     (tsx mcp/server.ts)
 * Config Claude Desktop e deploy remoto: ver mcp/README.md
 */

import "./load-env"; // PRIMEIRO: popula process.env antes de @/lib/prisma

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools";

async function main() {
  const server = new McpServer({ name: "aaee-ep", version: "0.1.0" });
  registerTools(server);
  await server.connect(new StdioServerTransport());
  // stdout é reservado pro JSON-RPC; logs vão pro stderr.
  console.error("[aaee-ep mcp] servidor stdio pronto");
}

main().catch((e) => {
  console.error("[aaee-ep mcp] falha ao iniciar:", e);
  process.exit(1);
});
