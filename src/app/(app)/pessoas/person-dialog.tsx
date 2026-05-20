"use client";

import { useEffect, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { savePerson, type PersonFormValues } from "./actions";

type ModalityOption = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modalities: ModalityOption[];
  initial?: Partial<PersonFormValues> & { id?: string };
};

const FLAG_FIELDS = [
  { name: "isAthlete", label: "Atleta" },
  { name: "isSupporter", label: "Torcida" },
  { name: "isDirector", label: "Diretor(a)" },
  { name: "isSupport", label: "Apoio" },
] as const;

const DEFAULTS: PersonFormValues = {
  name: "",
  nickname: "",
  phone: "",
  isAthlete: false,
  isSupporter: true,
  isDirector: false,
  isSupport: false,
  notes: "",
  modalityIds: [],
};

export function PersonDialog({ open, onOpenChange, modalities, initial }: Props) {
  const [pending, startTransition] = useTransition();

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<PersonFormValues>({
    defaultValues: { ...DEFAULTS, ...initial },
  });

  useEffect(() => {
    if (open) reset({ ...DEFAULTS, ...initial });
  }, [open, initial, reset]);

  function onSubmit(values: PersonFormValues) {
    startTransition(async () => {
      const result = await savePerson(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(initial?.id ? "Pessoa atualizada" : "Pessoa cadastrada");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{initial?.id ? "Editar pessoa" : "Nova pessoa"}</DialogTitle>
            <DialogDescription>
              Cadastro de pessoas da delegação. Categorias não são excludentes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo *</Label>
              <Input id="name" {...register("name", { required: true })} autoFocus />
              {errors.name && <p className="text-xs text-destructive">Obrigatório</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="nickname">Apelido</Label>
                <Input id="nickname" {...register("nickname")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" {...register("phone")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Participação</Label>
              <div className="grid grid-cols-2 gap-2">
                {FLAG_FIELDS.map((f) => (
                  <Controller
                    key={f.name}
                    control={control}
                    name={f.name}
                    render={({ field }) => (
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-input"
                          checked={Boolean(field.value)}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                        {f.label}
                      </label>
                    )}
                  />
                ))}
              </div>
            </div>

            {modalities.length > 0 && (
              <Controller
                control={control}
                name="modalityIds"
                render={({ field }) => {
                  const value = (field.value ?? []) as string[];
                  return (
                    <div className="space-y-2">
                      <Label>Modalidades em que compete</Label>
                      <div className="grid grid-cols-2 gap-2 border rounded-md p-3 max-h-40 overflow-y-auto">
                        {modalities.map((m) => {
                          const checked = value.includes(m.id);
                          return (
                            <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-input"
                                checked={checked}
                                onChange={(e) => {
                                  field.onChange(
                                    e.target.checked
                                      ? [...value, m.id]
                                      : value.filter((id) => id !== m.id),
                                  );
                                }}
                              />
                              {m.name}
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
              <Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" rows={2} {...register("notes")} />
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
