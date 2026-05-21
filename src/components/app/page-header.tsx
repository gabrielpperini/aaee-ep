import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-8", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          {eyebrow && (
            <p className="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              <span className="h-px w-6 bg-foreground/40" aria-hidden />
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-sm sm:text-base text-muted-foreground text-pretty">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>
        )}
      </div>
      <div className="mt-6 flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-gradient-to-r from-border via-border/60 to-transparent" />
        <span className="h-1.5 w-1.5 rounded-full bg-gold" />
        <span className="h-px w-12 bg-border" />
      </div>
    </div>
  );
}
