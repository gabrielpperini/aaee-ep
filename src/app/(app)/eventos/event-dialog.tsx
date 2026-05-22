"use client";

import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PHASE_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "@/lib/format";
import { eventSchema, type EventFormValues } from "@/lib/validations/event";
import { useFormAction } from "@/lib/validations/use-form-action";
import { saveEvent } from "./actions";

type Option = { id: string; name: string };
type PersonOption = { id: string; name: string; nickname: string | null };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modalities: Option[];
  locations: Option[];
  athletes: PersonOption[];
  initial?: Partial<EventFormValues> & { id?: string };
};

const empty: EventFormValues = {
  modalityId: "",
  title: "",
  description: "",
  day: 1,
  startTime: "",
  endTime: "",
  locationId: "",
  opponent: "",
  phase: "OTHER",
  priority: "NORMAL",
  status: "CONFIRMED",
  isConditional: false,
  desiredSupportersCount: 0,
  athleteIds: [],
};

export function EventDialog({
  open,
  onOpenChange,
  modalities,
  locations,
  athletes,
  initial,
}: Props) {
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: { ...empty, ...initial },
  });

  useEffect(() => {
    if (open) form.reset({ ...empty, ...initial });
  }, [open, initial, form]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  const { onSubmit, pending } = useFormAction(saveEvent, form, {
    successMessage: initial?.id ? "Evento atualizado" : "Evento criado",
    onSuccess: close,
  });

  const modalityOptions = modalities.map((m) => ({
    value: m.id,
    label: m.name,
  }));
  const locationOptions = locations.map((l) => ({
    value: l.id,
    label: l.name,
  }));
  const athleteOptions = athletes.map((a) => ({
    value: a.id,
    label: a.nickname ? `${a.name} (${a.nickname})` : a.name,
    hint: a.nickname ? undefined : a.name,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <Form {...form}>
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>
                {initial?.id ? "Editar evento" : "Novo evento"}
              </DialogTitle>
              <DialogDescription>
                Jogo, luta, prova, atividade da torcida ou evento geral.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 px-1 -mx-1 max-h-[65vh] overflow-y-auto">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título *</FormLabel>
                    <FormControl>
                      <Input autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="modalityId"
                  render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>Modalidade *</FormLabel>
                      <FormControl>
                        <Combobox
                          options={modalityOptions}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Selecione…"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="locationId"
                  render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>Local</FormLabel>
                      <FormControl>
                        <Combobox
                          options={locationOptions}
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          placeholder="— sem local —"
                          clearable
                          clearLabel="— sem local —"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="day"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={String(field.value)}
                        onValueChange={(v) => field.onChange(Number(v))}
                        className="flex flex-wrap gap-3"
                      >
                        {[
                          { v: -1, label: "Ida" },
                          { v: 0, label: "Véspera" },
                          { v: 1, label: "Dia 1" },
                          { v: 2, label: "Dia 2" },
                          { v: 3, label: "Dia 3" },
                          { v: 4, label: "Volta" },
                        ].map(({ v, label }) => (
                          <label
                            key={v}
                            className="flex items-center gap-2 text-sm cursor-pointer"
                          >
                            <RadioGroupItem value={String(v)} />
                            {label}
                          </label>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>Início *</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Início"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>Fim *</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Fim"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="opponent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adversário</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="desiredSupportersCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Torcida desejada</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          value={field.value}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? 0 : Number(e.target.value),
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="phase"
                  render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>Fase</FormLabel>
                      <Select
                        items={PHASE_LABELS}
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(PHASE_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>Prioridade</FormLabel>
                      <Select
                        items={PRIORITY_LABELS}
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>Status</FormLabel>
                      <Select
                        items={STATUS_LABELS}
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(STATUS_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isConditional"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-3 rounded-lg border border-border p-3 space-y-0">
                    <div className="space-y-0.5">
                      <FormLabel>Evento condicional</FormLabel>
                      <FormDescription>
                        Depende da classificação em fase anterior.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(v) => field.onChange(v === true)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {athletes.length > 0 && (
                <FormField
                  control={form.control}
                  name="athleteIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Atletas envolvidos</FormLabel>
                      <FormControl>
                        <MultiSelect
                          options={athleteOptions}
                          value={field.value ?? []}
                          onChange={field.onChange}
                          placeholder="Selecione atletas…"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={close}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
