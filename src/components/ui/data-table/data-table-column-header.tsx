"use client";

import type { Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  align = "left",
  className,
}: {
  column: Column<TData, TValue>;
  title: string;
  align?: "left" | "right";
  className?: string;
}) {
  if (!column.getCanSort()) {
    return <span className={className}>{title}</span>;
  }

  const sorted = column.getIsSorted();

  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(sorted === "asc")}
      className={cn(
        "-ml-1 inline-flex h-7 items-center gap-1 rounded-md px-1 transition-colors select-none hover:bg-muted/60",
        align === "right" && "-mr-1 ml-auto flex-row-reverse",
        className,
      )}
    >
      <span>{title}</span>
      {sorted === "asc" ? (
        <ArrowUp className="size-3.5 text-muted-foreground" />
      ) : sorted === "desc" ? (
        <ArrowDown className="size-3.5 text-muted-foreground" />
      ) : (
        <ChevronsUpDown className="size-3.5 text-muted-foreground/50" />
      )}
    </button>
  );
}
