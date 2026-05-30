import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Tudo exceto arquivos estáticos, rotas internas do Next e metadados públicos
    // (manifest, OG/Twitter image, favicons).
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw\\.js|offline|opengraph-image|twitter-image|icon\\.png|apple-icon\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
