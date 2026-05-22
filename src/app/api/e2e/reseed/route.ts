import { NextResponse } from "next/server";
import { isE2EMode } from "@/lib/supabase/e2e-shim";
import { runSeed } from "@/lib/e2e-seed";

// Reset + reseed do banco. Chamado pelos testes E2E pra garantir isolamento.
// Em produção retorna 404.
export async function POST() {
  if (!isE2EMode()) {
    return new NextResponse("Not Found", { status: 404 });
  }
  const summary = await runSeed();
  return NextResponse.json({ ok: true, ...summary });
}
