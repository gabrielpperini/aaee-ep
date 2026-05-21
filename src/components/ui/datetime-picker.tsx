"use client"

import * as React from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

function pad(n: number) {
  return n.toString().padStart(2, "0")
}

function toLocalIsoString(date: Date | undefined): string {
  if (!date) return ""
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromLocalIsoString(value: string): Date | undefined {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d
}

type DateTimePickerProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Selecione data e hora",
  disabled,
  className,
  id,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedby,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const current = fromLocalIsoString(value)
  const timeValue = current ? `${pad(current.getHours())}:${pad(current.getMinutes())}` : ""

  function setDate(next: Date | undefined) {
    if (!next) {
      onChange("")
      return
    }
    const base = current ?? new Date()
    next.setHours(base.getHours(), base.getMinutes(), 0, 0)
    onChange(toLocalIsoString(next))
  }

  function setTime(time: string) {
    if (!time) return
    const [h, m] = time.split(":").map((n) => parseInt(n, 10))
    const base = current ?? new Date()
    const next = new Date(base)
    next.setHours(h, m, 0, 0)
    onChange(toLocalIsoString(next))
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
            !current && "text-muted-foreground",
          )}
        >
          {current
            ? format(current, "dd/MM/yyyy HH:mm", { locale: ptBR })
            : placeholder}
        </span>
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <Calendar
          mode="single"
          selected={current}
          onSelect={setDate}
          locale={ptBR}
          captionLayout="dropdown"
        />
        <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
          <label className="text-xs text-muted-foreground" htmlFor={`${id}-time`}>
            Hora:
          </label>
          <Input
            id={`${id}-time`}
            type="time"
            value={timeValue}
            onChange={(e) => setTime(e.target.value)}
            className="h-7 w-32"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
