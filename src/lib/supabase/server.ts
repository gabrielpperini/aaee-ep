import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./env";
import {
  E2E_AUTH_COOKIE,
  decodeE2EAuth,
  isE2EMode,
} from "./e2e-shim";

export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  if (isE2EMode()) {
    return {
      auth: {
        async getUser() {
          const raw = cookieStore.get(E2E_AUTH_COOKIE)?.value;
          const payload = decodeE2EAuth(raw);
          if (!payload) return { data: { user: null }, error: null };
          return {
            data: {
              user: {
                id: payload.id,
                email: payload.email,
                phone: null,
                app_metadata: {},
                user_metadata: {},
                aud: "authenticated",
                created_at: new Date(0).toISOString(),
              },
            },
            error: null,
          };
        },
        async signOut() {
          try {
            cookieStore.delete(E2E_AUTH_COOKIE);
          } catch {
            // chamado de server component — middleware/route handler cuidam
          }
          return { error: null };
        },
      },
    } as unknown as SupabaseClient;
  }

  return createServerClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // chamado dentro de Server Component — ignorar (middleware cuida da renovação).
          }
        },
      },
    },
  );
}
