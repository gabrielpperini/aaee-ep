export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-dashed border-border bg-card/60 py-14 px-6 text-center">
      <div aria-hidden className="field-lines absolute inset-0 text-foreground/30 opacity-[0.08]" />
      <p className="relative font-display text-lg font-semibold">{title}</p>
      {description && (
        <p className="relative mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="relative mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
