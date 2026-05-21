"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from "@/lib/validations/auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [pending, startTransition] = useTransition();

  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [done, setDone] = useState(false);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setAuthenticated(true);
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setAuthenticated(true);
      }
      setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const submit = form.handleSubmit((values) => {
    startTransition(async () => {
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });
      if (error) {
        toast.error("Não consegui atualizar a senha", {
          description: error.message,
        });
        return;
      }
      setDone(true);
      toast.success("Senha atualizada");
      setTimeout(() => {
        router.replace("/");
        router.refresh();
      }, 800);
    });
  });

  return (
    <div className="relative flex flex-1 min-h-screen items-center justify-center p-5 sm:p-8">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md rise-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark size={72} priority />
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Redefinir senha
          </p>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            Crie uma senha nova.
          </h1>
        </div>

        {!ready ? (
          <p className="text-center text-sm text-muted-foreground">Carregando…</p>
        ) : !authenticated ? (
          <div className="space-y-4 text-sm text-center">
            <p className="text-muted-foreground">
              Link inválido ou expirado. Volte ao login e peça um novo email de
              redefinição.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
            >
              Voltar para o login
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : done ? (
          <p className="text-center text-sm text-muted-foreground">
            Tudo certo. Redirecionando…
          </p>
        ) : (
          <Form {...form}>
            <form onSubmit={submit} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova senha</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        placeholder="8+ com letra e número"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar senha</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Atualizando…" : "Salvar nova senha"}
              </Button>
            </form>
          </Form>
        )}
      </div>
    </div>
  );
}
