"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./env";
import {
  E2E_AUTH_COOKIE,
  decodeE2EAuthBrowser,
  isE2EMode,
} from "./e2e-shim";

type ApiAuthResponse = { ok: boolean; error?: string; userId?: string; email?: string };

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

async function postJson(url: string, body: unknown): Promise<ApiAuthResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
  });
  return res.json().catch(() => ({ ok: false, error: "invalid_response" }));
}

function ok<T>(data: T) {
  return { data, error: null };
}
function err(message: string) {
  return { data: null, error: { message } };
}

function currentUser() {
  const raw = readCookie(E2E_AUTH_COOKIE);
  const payload = decodeE2EAuthBrowser(raw);
  if (!payload) return null;
  return {
    id: payload.id,
    email: payload.email,
    phone: null,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date(0).toISOString(),
  };
}

function createE2EBrowserClient(): SupabaseClient {
  return {
    auth: {
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        const res = await postJson("/api/e2e/login", { email, password });
        if (!res.ok) return err(res.error ?? "Falha no login");
        const user = currentUser();
        return ok({ user, session: user ? { user } : null });
      },
      async signUp({ email, password }: { email: string; password: string; options?: unknown }) {
        const res = await postJson("/api/e2e/signup", { email, password });
        if (!res.ok) return err(res.error ?? "Falha no signup");
        const user = currentUser();
        return ok({ user, session: user ? { user } : null });
      },
      async signInWithOtp(_args: unknown) {
        return err("OTP desabilitado em modo E2E");
      },
      async verifyOtp(_args: unknown) {
        return err("OTP desabilitado em modo E2E");
      },
      async resetPasswordForEmail(_email: string, _opts?: unknown) {
        return ok({});
      },
      async getUser() {
        return ok({ user: currentUser() });
      },
      async getSession() {
        const user = currentUser();
        return ok({ session: user ? { user } : null });
      },
      onAuthStateChange(_cb: unknown) {
        return { data: { subscription: { unsubscribe() {} } } };
      },
      async updateUser(_args: unknown) {
        return ok({ user: currentUser() });
      },
      async signOut() {
        await fetch("/api/e2e/logout", { method: "POST", credentials: "same-origin" });
        return { error: null };
      },
    },
  } as unknown as SupabaseClient;
}

export function createSupabaseBrowserClient(): SupabaseClient {
  if (isE2EMode()) return createE2EBrowserClient();
  return createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}
