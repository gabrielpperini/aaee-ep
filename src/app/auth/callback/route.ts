import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Troca o `?code` do fluxo PKCE (magic link, confirmação de signup, link de
 * OTP) por uma sessão e redireciona pro app.
 *
 * Sem essa rota o link de verificação do Supabase cai na raiz `/` (protegida)
 * e o middleware redireciona pra `/login` ANTES de trocar o code por sessão —
 * descartando o `?code` no caminho. `/auth` já é público em `PUBLIC_PATHS`,
 * então a troca acontece aqui sem o middleware atrapalhar.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeNext(searchParams.get("next"));
  const authError =
    searchParams.get("error_description") ?? searchParams.get("error");

  if (authError) {
    return redirectTo(request, origin, `/login?error=${encodeURIComponent(authError)}`);
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return redirectTo(request, origin, next);
    }
    return redirectTo(request, origin, `/login?error=${encodeURIComponent(error.message)}`);
  }

  return redirectTo(request, origin, "/login");
}

/**
 * Em produção (Vercel) o `origin` de `request.url` pode ser o host interno;
 * usa o `x-forwarded-host` pra preservar o domínio público (ep.aaee.com.br).
 */
function redirectTo(request: NextRequest, origin: string, path: string) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";
  const base = !isLocal && forwardedHost ? `https://${forwardedHost}` : origin;
  return NextResponse.redirect(`${base}${path}`);
}

/** Só aceita paths internos — bloqueia open redirect via `?next=`. */
function sanitizeNext(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  return raw;
}
