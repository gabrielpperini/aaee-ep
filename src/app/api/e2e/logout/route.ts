import { NextResponse } from "next/server";
import { E2E_AUTH_COOKIE, isE2EMode } from "@/lib/supabase/e2e-shim";

export async function POST() {
  if (!isE2EMode()) {
    return new NextResponse("Not Found", { status: 404 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(E2E_AUTH_COOKIE);
  return res;
}
