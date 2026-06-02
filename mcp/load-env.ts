/**
 * Carrega o .env do projeto ANTES de qualquer import que leia process.env
 * (em especial @/lib/prisma, que cria o client no import lendo DATABASE_URL).
 *
 * Por isso este módulo é o PRIMEIRO import de server.ts: módulos ES são
 * avaliados na ordem das declarações de import, então o .env já está em
 * process.env quando o prisma client é instanciado.
 *
 * Resolve o caminho a partir do próprio script (process.argv[1]), não do cwd —
 * assim funciona independente de onde o Claude Desktop lançar o processo.
 */
import { config } from "dotenv";
import { dirname, resolve } from "node:path";

const scriptDir = dirname(process.argv[1] ?? "");
// quiet: o banner "tip:" do dotenv v17 vai pro stdout e corromperia o
// JSON-RPC do transporte stdio. Silencia.
config({ path: resolve(scriptDir, "..", ".env"), quiet: true });

if (!process.env.DATABASE_URL) {
  console.error(
    "[aaee-ep mcp] DATABASE_URL ausente. Verifique o .env na raiz do projeto.",
  );
}
