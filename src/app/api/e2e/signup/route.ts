import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  E2E_AUTH_COOKIE,
  encodeE2EAuth,
  isE2EMode,
} from "@/lib/supabase/e2e-shim";

// Replica o efeito de `supabase.auth.signUp`: cria um auth user fake
// (UUID) e seta o cookie. A criação do registro User local é feita por
// `getCurrentUser` na primeira request autenticada — exatamente como em prod.
export async function POST(req: Request) {
  if (!isE2EMode()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, error: "Email obrigatório" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ ok: false, error: "Email já cadastrado" }, { status: 400 });
  }

  const authUserId = randomUUID();
  const cookie = encodeE2EAuth({ id: authUserId, email });
  const res = NextResponse.json({ ok: true, email });
  res.cookies.set(E2E_AUTH_COOKIE, cookie, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return res;
}
