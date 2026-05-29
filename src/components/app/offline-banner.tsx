"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";

/** Barra fina no topo do conteúdo quando o dispositivo está offline. */
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-destructive px-4 py-1.5 text-xs font-medium text-destructive-foreground"
    >
      <WifiOff className="h-3.5 w-3.5" />
      Você está offline — suas alterações sincronizam ao reconectar.
    </div>
  );
}
