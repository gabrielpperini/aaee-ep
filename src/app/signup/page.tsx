"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { setupNewAccount } from "./actions";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const supabase = createSupabaseBrowserClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("Senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não conferem.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) {
      setLoading(false);
      toast.error("Não consegui criar a conta", { description: error.message });
      return;
    }

    if (!data.session) {
      setLoading(false);
      setEmailSent(true);
      return;
    }

    const result = await setupNewAccount({ name });
    setLoading(false);

    if (!result.ok) {
      toast.error("Conta criada, mas falhou ao salvar perfil", { description: result.error });
      router.replace("/perfil");
      router.refresh();
      return;
    }

    toast.success("Bem-vindo à delegação!");
    router.replace("/perfil");
    router.refresh();
  }

  return (
    <div className="relative flex flex-1 min-h-screen">
      <BrandSide />
      <div className="relative flex flex-1 items-center justify-center p-5 sm:p-8">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        {emailSent ? (
          <div className="w-full max-w-md text-center rise-in">
            <div className="mb-6 flex flex-col items-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl border border-cyan/40 bg-cyan/15 text-foreground">
                <MailCheck className="h-7 w-7" />
              </div>
              <h1 className="mt-5 font-display text-3xl sm:text-4xl font-semibold tracking-tight">
                Confirme seu email
              </h1>
              <p className="mt-3 max-w-sm text-pretty text-muted-foreground">
                Enviamos um link para <strong className="text-foreground">{email}</strong>.
                Clique nele para ativar sua conta — depois você entra com a senha que acabou de criar.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              Voltar para o login
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
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
                Criar conta
              </p>
              <h1 className="mt-2 font-display text-3xl sm:text-4xl font-semibold leading-tight tracking-tight text-balance">
                Junte-se à delegação.
              </h1>
              <p className="mt-2 text-sm text-muted-foreground text-pretty">
                Cadastro rápido pra atletas, torcida, apoio e diretoria.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Maria Silva"
                />
              </div>
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    autoComplete="new-password"
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="mín. 8 caracteres"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirmar</Label>
                  <Input
                    id="confirm"
                    type="password"
                    required
                    autoComplete="new-password"
                    minLength={8}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !name || !email || !password}
              >
                {loading ? "Criando…" : "Criar conta"}
                {!loading && <ArrowRight className="ml-1 h-4 w-4" />}
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              Já tem conta?{" "}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                Entrar
              </Link>
            </p>
          </div>
        )}
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
          Convocação aberta
        </p>
        <h2 className="mt-3 font-display text-5xl xl:text-6xl font-semibold leading-[0.95] tracking-tight text-balance">
          Faça parte do{" "}
          <span className="relative inline-block">
            <span className="relative z-10">time</span>
            <span aria-hidden className="absolute inset-x-0 bottom-1 h-3 -z-0 bg-cyan/70" />
          </span>
          .
        </h2>
        <p className="mt-5 text-sm text-sidebar-foreground/75 text-pretty">
          Atletas, torcida, apoio e diretoria — todo mundo cabe no painel. Você se cadastra,
          a gente sincroniza com o time da delegação.
        </p>
      </div>

      <div className="relative z-10 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.22em] text-sidebar-foreground/55">
        <span>EP · 2026</span>
        <span>cadastro · 30s</span>
      </div>
    </aside>
  );
}
