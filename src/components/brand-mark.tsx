"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Brasão AAEE Engenharia UFRGS. Renderiza `/logo.png` (deve estar em /public).
 * Enquanto o arquivo não estiver no projeto, mostra um placeholder com as iniciais
 * para o layout não ficar quebrado.
 */
export function BrandMark({
  size = 32,
  className,
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold tracking-tight",
          className,
        )}
        style={{ width: size, height: size, fontSize: size * 0.32 }}
        aria-label="AAEE Engenharia UFRGS"
      >
        AAEE
      </div>
    );
  }

  return (
    <Image
      src="/logo.png"
      alt="AAEE Engenharia UFRGS"
      width={size}
      height={size}
      priority={priority}
      className={cn("rounded-md object-contain", className)}
      onError={() => setFailed(true)}
    />
  );
}
