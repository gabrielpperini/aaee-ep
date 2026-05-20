"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Step = "email" | "otp";

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

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createSupabaseBrowserClient();

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) {
      toast.error("Não consegui enviar o código", { description: error.message });
      return;
    }
    toast.success("Código enviado", { description: `Verifique a caixa de entrada de ${email}.` });
    setStep("otp");
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

  return (
    <div className="relative flex flex-1 items-center justify-center p-6">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <BrandMark size={88} priority className="mb-3" />
          <CardTitle className="text-xl">Delegação EP</CardTitle>
          <CardDescription>
            {step === "email"
              ? "Informe seu email para receber um código de acesso."
              : `Digite o código de 6 dígitos enviado para ${email}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" ? (
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
            </form>
          ) : (
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
                  setStep("email");
                  setOtp("");
                }}
              >
                Usar outro email
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
