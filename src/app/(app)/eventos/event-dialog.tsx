"use client";

import { useEffect, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PHASE_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "@/lib/format";
import { saveEvent, type EventFormValues } from "./actions";

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

const DEFAULTS: EventFormValues = {
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

export function EventDialog({ open, onOpenChange, modalities, locations, athletes, initial }: Props) {
  const [pending, startTransition] = useTransition();

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<EventFormValues>({
    defaultValues: { ...DEFAULTS, ...initial },
  });

  useEffect(() => {
    if (open) reset({ ...DEFAULTS, ...initial });
  }, [open, initial, reset]);

  function onSubmit(values: EventFormValues) {
    startTransition(async () => {
      const result = await saveEvent(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(initial?.id ? "Evento atualizado" : "Evento criado");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{initial?.id ? "Editar evento" : "Novo evento"}</DialogTitle>
            <DialogDescription>
              Jogo, luta, prova, atividade da torcida ou evento geral.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[65vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input id="title" {...register("title", { required: true })} autoFocus />
              {errors.title && <p className="text-xs text-destructive">Obrigatório</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Modalidade *</Label>
                <Controller
                  control={control}
                  name="modalityId"
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                      <SelectContent>
                        {modalities.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.modalityId && <p className="text-xs text-destructive">Obrigatório</p>}
              </div>
              <div className="space-y-2">
                <Label>Local</Label>
                <Controller
                  control={control}
                  name="locationId"
                  render={({ field }) => (
                    <Select value={field.value || "__none__"} onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— sem local —</SelectItem>
                        {locations.map((l) => (
                          <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Dia *</Label>
                <Controller
                  control={control}
                  name="day"
                  render={({ field }) => (
                    <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Dia 1</SelectItem>
                        <SelectItem value="2">Dia 2</SelectItem>
                        <SelectItem value="3">Dia 3</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">Início *</Label>
                <Input id="startTime" type="datetime-local" {...register("startTime", { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">Fim *</Label>
                <Input id="endTime" type="datetime-local" {...register("endTime", { required: true })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="opponent">Adversário</Label>
                <Input id="opponent" {...register("opponent")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desiredSupportersCount">Torcida desejada</Label>
                <Input
                  id="desiredSupportersCount"
                  type="number"
                  min={0}
                  {...register("desiredSupportersCount", { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Fase</Label>
                <Controller
                  control={control}
                  name="phase"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PHASE_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Controller
                  control={control}
                  name="priority"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <Controller
              control={control}
              name="isConditional"
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={Boolean(field.value)}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                  Evento condicional (depende de classificação)
                </label>
              )}
            />

            {athletes.length > 0 && (
              <Controller
                control={control}
                name="athleteIds"
                render={({ field }) => {
                  const value = (field.value ?? []) as string[];
                  return (
                    <div className="space-y-2">
                      <Label>Atletas envolvidos</Label>
                      <div className="grid grid-cols-2 gap-2 border rounded-md p-3 max-h-40 overflow-y-auto">
                        {athletes.map((a) => {
                          const checked = value.includes(a.id);
                          const label = a.nickname ? `${a.name} (${a.nickname})` : a.name;
                          return (
                            <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-input"
                                checked={checked}
                                onChange={(e) => {
                                  field.onChange(
                                    e.target.checked
                                      ? [...value, a.id]
                                      : value.filter((id) => id !== a.id),
                                  );
                                }}
                              />
                              {label}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                }}
              />
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" rows={2} {...register("description")} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
