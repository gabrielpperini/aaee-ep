import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";

/**
 * Tela de carregamento branded (brasão + barra cyan animada), reutilizável.
 *
 * - `fullScreen` (padrão): ocupa a viewport inteira — use em rotas fora do
 *   layout com sidebar (login, telas públicas) ou como fallback de Suspense.
 * - Sem `fullScreen`: preenche o container pai — use dentro da área de
 *   conteúdo do app (ex.: `loading.tsx` do segmento autenticado).
 *
 * Para skeletons que imitam o layout final, prefira blocos `Skeleton`.
 * Esta tela é o fallback genérico quando não há forma de conteúdo a imitar.
 */
export function LoadingScreen({
  label = "Carregando…",
  fullScreen = true,
  className,
}: {
  label?: string;
  fullScreen?: boolean;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-5",
        fullScreen ? "min-h-screen" : "min-h-[60vh] w-full",
        className,
      )}
    >
      <BrandMark size={72} className="animate-pulse" priority />
      <div className="relative h-[3px] w-28 overflow-hidden rounded-full bg-muted">
        <span className="loading-bar absolute inset-y-0 left-0 w-2/5 rounded-full bg-cyan" />
      </div>
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
