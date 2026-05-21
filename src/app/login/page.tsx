"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "password" | "otp-request" | "otp-verify";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/";

  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createSupabaseBrowserClient();

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Não conseguimos entrar", { description: error.message });
      return;
    }
    router.replace(redirectTo);
    router.refresh();
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (error) {
      toast.error("Não consegui enviar o código", { description: error.message });
      return;
    }
    toast.success("Código enviado", { description: `Verifique a caixa de entrada de ${email}.` });
    setMode("otp-verify");
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });
    setLoading(false);
    if (error) {
      toast.error("Código inválido", { description: error.message });
      return;
    }
    router.replace(redirectTo);
    router.refresh();
  }

  const headline =
    mode === "password"
      ? "Bem-vindo de volta à delegação."
      : mode === "otp-request"
        ? "Recupere o acesso em segundos."
        : "Só falta confirmar o código.";

  const subtitle =
    mode === "password"
      ? "Use email e senha. Sem senha à mão? Pedimos um código pro seu email."
      : mode === "otp-request"
        ? "Vamos enviar um código de 6 dígitos pro seu email."
        : `Digite o código de 6 dígitos enviado para ${email}.`;

  return (
    <div className="relative flex flex-1 min-h-screen">
      <BrandSide />
      <div className="relative flex flex-1 items-center justify-center p-5 sm:p-8">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md rise-in">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <div className="relative">
              <div
                aria-hidden
                className="absolute inset-0 -m-3 rounded-full blur-lg"
                style={{
                  background:
                    "radial-gradient(circle, color-mix(in oklch, var(--cyan) 38%, transparent), transparent 70%)",
                }}
              />
              <BrandMark size={92} priority className="relative drop-shadow-[0_8px_20px_rgba(14,30,46,0.25)]" />
            </div>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              AAEE · Engenharia UFRGS
            </p>
            <p className="font-display text-2xl font-semibold tracking-tight">
              Delegação EP
            </p>
          </div>

          <div className="mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {mode === "password" ? "Entrar" : mode === "otp-request" ? "Recuperar acesso" : "Verificação"}
            </p>
            <h1 className="mt-2 font-display text-3xl sm:text-4xl font-semibold leading-tight tracking-tight text-balance">
              {headline}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground text-pretty">{subtitle}</p>
          </div>

          {mode === "password" && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={() => setMode("otp-request")}
                  >
                    Esqueci a senha
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !email || !password}>
                {loading ? "Entrando…" : "Entrar"}
                {!loading && <ArrowRight className="ml-1 h-4 w-4" />}
              </Button>
              <div className="relative my-2">
                <span className="absolute inset-0 flex items-center" aria-hidden>
                  <span className="w-full border-t border-border" />
                </span>
                <span className="relative mx-auto block w-fit bg-background px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  ou
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setMode("otp-request")}
              >
                Entrar com código no email
              </Button>
            </form>
          )}

          {mode === "otp-request" && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !email}>
                {loading ? "Enviando…" : "Enviar código"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setMode("password")}
              >
                Voltar para senha
              </Button>
            </form>
          )}

          {mode === "otp-verify" && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Código</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="text-center text-2xl font-mono tracking-[0.5em]"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || otp.length < 6}>
                {loading ? "Verificando…" : "Entrar"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setMode("otp-request");
                  setOtp("");
                }}
              >
                Reenviar para outro email
              </Button>
            </form>
          )}

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Não tem conta?{" "}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function BrandSide() {
  return (
    <aside className="relative hidden lg:flex w-[44%] max-w-[640px] flex-col justify-between overflow-hidden bg-sidebar text-sidebar-foreground p-10">
      <div aria-hidden className="grain" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px circle at 100% 0%, color-mix(in oklch, var(--cyan) 28%, transparent), transparent 55%), radial-gradient(700px circle at 0% 100%, color-mix(in oklch, var(--primary) 60%, transparent), transparent 60%)",
        }}
      />
      <div aria-hidden className="field-lines pointer-events-none absolute inset-0 text-sidebar-foreground/40 opacity-[0.12]" />

      {/* Brasão gigante como assinatura visual, posicionado em destaque */}
      <div aria-hidden className="pointer-events-none absolute -top-10 -right-10 opacity-[0.10] select-none">
        <BrandMark size={420} alt="" />
      </div>

      <div className="relative z-10 flex items-center gap-3">
        <BrandMark size={52} priority className="drop-shadow-[0_4px_14px_rgba(0,0,0,0.45)]" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan">
            AAEE · UFRGS
          </p>
          <p className="font-display text-xl font-semibold leading-tight tracking-tight">
            Delegação EP
          </p>
        </div>
      </div>

      <div className="relative z-10 max-w-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan">
          Engenharia em campo
        </p>
        <h2 className="mt-3 font-display text-5xl xl:text-6xl font-semibold leading-[0.95] tracking-tight text-balance">
          Três dias.{" "}
          <span className="relative inline-block">
            <span className="relative z-10">Uma delegação.</span>
            <span aria-hidden className="absolute inset-x-0 bottom-1 h-3 -z-0 bg-cyan/70" />
          </span>{" "}
          Todo apoio.
        </h2>
        <p className="mt-5 text-sm text-sidebar-foreground/75 text-pretty">
          A plataforma da torcida da Engenharia UFRGS no EP: agenda, atletas, locais e a operação
          do grito numa só tela.
        </p>
      </div>

      <div className="relative z-10 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.22em] text-sidebar-foreground/55">
        <span>EP · 2026</span>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-pulse" />
          ao vivo em breve
        </span>
      </div>
    </aside>
  );
}
