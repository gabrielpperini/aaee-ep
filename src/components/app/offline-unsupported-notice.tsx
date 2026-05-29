"use client";

import { CloudOff } from "lucide-react";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";

/**
 * Aviso pras telas que NÃO funcionam offline (gestão/admin). Some quando online.
 * Coloque no topo do conteúdo da página.
 */
export function OfflineUnsupportedNotice() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-dashed border-border bg-card/60 p-4 text-sm">
      <CloudOff className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="font-medium">Esta tela precisa de conexão</p>
        <p className="mt-0.5 text-muted-foreground">
          Os dados aqui não ficam disponíveis offline. Reconecte para ver as
          informações atualizadas.
        </p>
      </div>
    </div>
  );
}
