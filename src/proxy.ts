import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Tudo exceto arquivos estáticos, rotas internas do Next e metadados públicos
    // (manifest, OG/Twitter image, favicons).
    // `api/mcp` também fica de fora: tem auth própria (URL-capacidade) e não pode
    // ser redirecionada pro /login — e evita um getUser() do Supabase por tool call.
    "/((?!api/mcp|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw\\.js|offline|opengraph-image|twitter-image|icon\\.png|apple-icon\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
