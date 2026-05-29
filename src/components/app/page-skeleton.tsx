import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Skeleton de página com a mesma silhueta do conteúdo real: cabeçalho no
 * estilo do `PageHeader` (eyebrow, título, descrição, divisória) seguido de
 * uma lista de cards. Use em `loading.tsx` pra eliminar o "pulo" de layout
 * quando os dados do servidor chegam.
 */
export function PageSkeleton({
  rows = 6,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("animate-in fade-in duration-300", className)}>
      {/* Cabeçalho — espelha o PageHeader */}
      <div className="mb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 max-w-2xl space-y-3">
            <Skeleton className="h-2.5 w-32" />
            <Skeleton className="h-9 w-64 sm:w-80" />
            <Skeleton className="h-4 w-72 sm:w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        </div>
        <div className="mt-6 flex items-center gap-3" aria-hidden>
          <span className="h-px flex-1 bg-gradient-to-r from-border via-border/60 to-transparent" />
          <span className="h-1.5 w-1.5 rounded-full bg-border" />
          <span className="h-px w-12 bg-border" />
        </div>
      </div>

      {/* Linhas de card */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}

/** Uma linha de card: avatar/ícone + duas linhas de texto + meta à direita. */
function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4">
      <Skeleton className="h-11 w-11 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3 min-w-[120px]" />
        <Skeleton className="h-3 w-2/3 min-w-[160px]" />
      </div>
      <Skeleton className="hidden h-6 w-16 rounded-full sm:block" />
    </div>
  );
}
