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
import { MODALITY_CATEGORY_LABELS, PRIORITY_LABELS } from "@/lib/format";
import { saveModality, type ModalityFormValues } from "./actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<ModalityFormValues> & { id?: string };
};

const DEFAULTS: ModalityFormValues = {
  name: "",
  category: "SPORT",
  priority: "NORMAL",
  notes: "",
};

export function ModalityDialog({ open, onOpenChange, initial }: Props) {
  const [pending, startTransition] = useTransition();

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<ModalityFormValues>({
    defaultValues: { ...DEFAULTS, ...initial },
  });

  useEffect(() => {
    if (open) reset({ ...DEFAULTS, ...initial });
  }, [open, initial, reset]);

  function onSubmit(values: ModalityFormValues) {
    startTransition(async () => {
      const result = await saveModality(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(initial?.id ? "Modalidade atualizada" : "Modalidade criada");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{initial?.id ? "Editar modalidade" : "Nova modalidade"}</DialogTitle>
            <DialogDescription>
              Modalidades esportivas, culturais ou atividades de torcida.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" {...register("name", { required: true })} autoFocus />
              {errors.name && <p className="text-xs text-destructive">Obrigatório</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(MODALITY_CATEGORY_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Prioridade padrão</Label>
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
            </div>

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
