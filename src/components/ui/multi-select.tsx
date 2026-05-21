"use client"

import * as React from "react"
import { ChevronsUpDownIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
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

export type MultiSelectOption = {
  value: string
  label: string
  hint?: string
}

type MultiSelectProps = {
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  emptyMessage?: string
  searchPlaceholder?: string
  maxBadges?: number
  disabled?: boolean
  className?: string
  id?: string
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Selecione…",
  emptyMessage = "Nada encontrado.",
  searchPlaceholder = "Buscar…",
  maxBadges,
  disabled,
  className,
  id,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedby,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const selectedOptions = React.useMemo(
    () => value.map((v) => options.find((o) => o.value === v)).filter(Boolean) as MultiSelectOption[],
    [value, options],
  )

  function toggle(optionValue: string) {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  function remove(optionValue: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onChange(value.filter((v) => v !== optionValue))
  }

  const visible = maxBadges ? selectedOptions.slice(0, maxBadges) : selectedOptions
  const overflow = maxBadges ? selectedOptions.length - maxBadges : 0

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
              "flex min-h-9 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[invalid=true]:border-destructive data-[invalid=true]:ring-3 data-[invalid=true]:ring-destructive/20 dark:bg-input/30 dark:hover:bg-input/50 dark:data-[invalid=true]:border-destructive/50 dark:data-[invalid=true]:ring-destructive/40",
              className,
            )}
          />
        }
      >
        <div className="flex flex-1 flex-wrap items-center gap-1 py-0.5">
          {selectedOptions.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            <>
              {visible.map((opt) => (
                <Badge
                  key={opt.value}
                  variant="secondary"
                  className="h-6 gap-1 pr-1"
                >
                  <span className="truncate max-w-[14ch]">{opt.label}</span>
                  <span
                    role="button"
                    tabIndex={-1}
                    aria-label={`Remover ${opt.label}`}
                    onClick={(e) => remove(opt.value, e)}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="grid size-4 place-items-center rounded-sm hover:bg-background/60"
                  >
                    <XIcon className="size-3" />
                  </span>
                </Badge>
              ))}
              {overflow > 0 && (
                <Badge variant="outline" className="h-6">
                  +{overflow}
                </Badge>
              )}
            </>
          )}
        </div>
        <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--anchor-width) min-w-[var(--radix-popover-trigger-width)] p-0"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const checked = value.includes(opt.value)
                return (
                  <CommandItem
                    key={opt.value}
                    value={`${opt.label} ${opt.hint ?? ""}`}
                    data-checked={checked}
                    onSelect={() => toggle(opt.value)}
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
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
