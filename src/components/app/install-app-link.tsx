"use client";

import { Button } from "@/components/ui/button";
import { openInstallPrompt } from "@/components/app/install-prompt";
import { useStandaloneMode } from "@/lib/hooks/use-standalone-mode";

/**
 * Botão pra reabrir o modal de instalação a partir do /perfil.
 * Some quando o app já está rodando standalone.
 */
export function InstallAppLink() {
  const standalone = useStandaloneMode();

  if (standalone) return null;

  return (
    <div className="border-t pt-3">
      <div className="text-muted-foreground text-xs mb-1.5">Instalar app</div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => openInstallPrompt()}
      >
        Ver instruções de instalação
      </Button>
    </div>
  );
}
