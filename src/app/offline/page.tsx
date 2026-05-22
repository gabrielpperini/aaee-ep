import Link from "next/link";
import type { Metadata } from "next";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Offline",
  description: "Você está sem conexão.",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <BrandMark size={72} />
      <div className="space-y-2 max-w-sm">
        <h1 className="font-heading text-2xl font-semibold">
          Você está sem conexão
        </h1>
        <p className="text-muted-foreground text-sm">
          Algumas telas ficam disponíveis offline depois da primeira visita.
          Tente novamente quando voltar pra rede.
        </p>
      </div>
      <Button render={<Link href="/" />}>Tentar novamente</Button>
    </div>
  );
}
