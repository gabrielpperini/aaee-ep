/**
 * Shim do Supabase Auth pra testes E2E. Ativado quando `E2E_TEST_MODE=true`.
 *
 * O Supabase real é substituído por um objeto que lê/escreve um único cookie
 * `e2e-auth` contendo `{ id, email }` em JSON base64url. Assim o resto do app
 * (middleware, `getCurrentUser`, server actions) continua funcionando sem
 * sequer saber que está em modo teste.
 *
 * Login/signup do client side são roteados pra `/api/e2e/login` e
 * `/api/e2e/signup` — endpoints só registrados quando `E2E_TEST_MODE=true`.
 */

export const E2E_AUTH_COOKIE = "e2e-auth";

export type E2EAuthPayload = { id: string; email: string };

export function isE2EMode(): boolean {
  // Server-side usa E2E_TEST_MODE; client lê NEXT_PUBLIC_E2E_TEST_MODE
  // (inlinado pelo Next no bundle do browser). Mantemos ambos por simetria.
  return (
    process.env.E2E_TEST_MODE === "true" ||
    process.env.NEXT_PUBLIC_E2E_TEST_MODE === "true"
  );
}

export function encodeE2EAuth(payload: E2EAuthPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeE2EAuth(raw: string | undefined | null): E2EAuthPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (typeof parsed?.id === "string" && typeof parsed?.email === "string") {
      return parsed;
    }
  } catch {
    // malformado — trata como deslogado
  }
  return null;
}

/** Versão browser-safe do decode (sem Buffer). */
export function decodeE2EAuthBrowser(raw: string | undefined | null): E2EAuthPayload | null {
  if (!raw) return null;
  try {
    const json = atob(raw.replace(/-/g, "+").replace(/_/g, "/"));
    const parsed = JSON.parse(json);
    if (typeof parsed?.id === "string" && typeof parsed?.email === "string") {
      return parsed;
    }
  } catch {
    // malformado
  }
  return null;
}

/**
 * Resposta no formato `{ data, error }` do Supabase SDK pra reuso pelo client
 * shim sem importar o type real.
 */
type AuthResponse<T> = { data: T; error: null } | { data: null; error: { message: string } };

export function authOk<T>(data: T): AuthResponse<T> {
  return { data, error: null };
}

export function authErr(message: string): AuthResponse<never> {
  return { data: null, error: { message } };
}
