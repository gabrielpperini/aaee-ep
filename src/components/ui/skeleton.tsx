import { cn } from "@/lib/utils";

/**
 * Bloco de carregamento com shimmer. Use para imitar a forma do conteúdo
 * final (texto, avatar, card) enquanto os dados do servidor chegam, evitando
 * o "pulo" de layout quando a tela hidrata.
 *
 * O shimmer (`.skeleton-shimmer`) é definido em globals.css e respeita
 * `prefers-reduced-motion`.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("skeleton-shimmer rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
