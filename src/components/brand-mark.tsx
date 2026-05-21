"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Brasão AAEE Engenharia UFRGS — renderiza `/logo.png`.
 * O brasão tem silhueta própria (engrenagem), então o componente NÃO recorta
 * em quadrado. Para hospedar o brasão sobre fundos claros, use `tone="light"`.
 * Para superfícies escuras, use `tone="dark"` ou o padrão (transparente).
 */
export function BrandMark({
  size = 40,
  className,
  priority = false,
  alt = "AAEE Engenharia UFRGS",
}: {
  size?: number;
  className?: string;
  priority?: boolean;
  alt?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-md bg-primary text-primary-foreground font-display font-semibold tracking-tight",
          className,
        )}
        style={{ width: size, height: size, fontSize: size * 0.28 }}
        aria-label={alt}
      >
        AAEE
      </div>
    );
  }

  return (
    <Image
      src="/logo.png"
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={cn("object-contain select-none", className)}
      onError={() => setFailed(true)}
      draggable={false}
    />
  );
}
