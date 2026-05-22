import { MapPin } from "lucide-react";
import { mapsUrlForAddress } from "@/lib/maps";
import { cn } from "@/lib/utils";

type Variant = "button" | "inline" | "icon";

export function MapsLink({
  address,
  label,
  variant = "button",
  className,
}: {
  address: string | null | undefined;
  label?: string;
  variant?: Variant;
  className?: string;
}) {
  const url = mapsUrlForAddress(address);
  if (!url) return null;

  const text = label ?? "Ver no mapa";

  if (variant === "icon") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={`Abrir ${address} no Google Maps`}
        aria-label={`Abrir ${address} no Google Maps`}
        className={cn(
          "inline-grid h-7 w-7 place-items-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          className,
        )}
      >
        <MapPin className="h-3.5 w-3.5" />
      </a>
    );
  }

  if (variant === "inline") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline",
          className,
        )}
      >
        <MapPin className="h-3.5 w-3.5" />
        {text}
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-foreground transition-colors hover:bg-accent",
        className,
      )}
    >
      <MapPin className="h-3.5 w-3.5" />
      {text}
    </a>
  );
}
