import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  E2E_AUTH_COOKIE,
  encodeE2EAuth,
  isE2EMode,
} from "@/lib/supabase/e2e-shim";

// Endpoint só ativo em modo E2E. Em produção retorna 404.
// Aceita qualquer senha — para validação real use Supabase.
export async function POST(req: Request) {
  if (!isE2EMode()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, error: "Email obrigatório" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.authUserId) {
    return NextResponse.json({ ok: false, error: "Usuário não encontrado" }, { status: 401 });
  }

  const cookie = encodeE2EAuth({ id: user.authUserId, email });
  const res = NextResponse.json({ ok: true, userId: user.id, email });
  res.cookies.set(E2E_AUTH_COOKIE, cookie, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return res;
}
