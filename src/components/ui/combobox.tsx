"use client"

import * as React from "react"
import { ChevronsUpDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export type ComboboxOption = {
  value: string
  label: string
  hint?: string
}

type ComboboxProps = {
  options: ComboboxOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  emptyMessage?: string
  searchPlaceholder?: string
  disabled?: boolean
  className?: string
  id?: string
  clearable?: boolean
  clearLabel?: string
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Selecione…",
  emptyMessage = "Nada encontrado.",
  searchPlaceholder = "Buscar…",
  disabled,
  className,
  id,
  clearable = false,
  clearLabel = "— Limpar —",
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedby,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selected = options.find((o) => o.value === value)

  function pick(next: string) {
    onChange(next)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            id={id}
            disabled={disabled}
            data-invalid={ariaInvalid || undefined}
            aria-describedby={ariaDescribedby}
            className={cn(
              "flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[invalid=true]:border-destructive data-[invalid=true]:ring-3 data-[invalid=true]:ring-destructive/20 dark:bg-input/30 dark:hover:bg-input/50 dark:data-[invalid=true]:border-destructive/50 dark:data-[invalid=true]:ring-destructive/40",
              className,
            )}
          />
        }
      >
        <span
          className={cn(
            "flex-1 truncate text-left",
            !selected && "text-muted-foreground",
          )}
        >
          {selected?.label ?? placeholder}
        </span>
        <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {clearable && (
                <CommandItem
                  value="__clear__"
                  data-checked={value === ""}
                  onSelect={() => pick("")}
                >
                  <span className="flex-1 text-muted-foreground">{clearLabel}</span>
                </CommandItem>
              )}
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={`${opt.label} ${opt.hint ?? ""}`}
                  data-checked={opt.value === value}
                  onSelect={() => pick(opt.value)}
                >
                  <span className="flex-1">
                    {opt.label}
                    {opt.hint && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {opt.hint}
                      </span>
                    )}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
