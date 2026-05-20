"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
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
import { saveLocation, type LocationFormValues } from "./actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<LocationFormValues> & { id?: string };
};

export function LocationDialog({ open, onOpenChange, initial }: Props) {
  const [pending, startTransition] = useTransition();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<LocationFormValues>({
    defaultValues: {
      id: initial?.id,
      name: initial?.name ?? "",
      address: initial?.address ?? "",
      description: initial?.description ?? "",
      notes: initial?.notes ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        id: initial?.id,
        name: initial?.name ?? "",
        address: initial?.address ?? "",
        description: initial?.description ?? "",
        notes: initial?.notes ?? "",
      });
    }
  }, [open, initial, reset]);

  function onSubmit(values: LocationFormValues) {
    startTransition(async () => {
      const result = await saveLocation(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(initial?.id ? "Local atualizado" : "Local criado");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{initial?.id ? "Editar local" : "Novo local"}</DialogTitle>
            <DialogDescription>
              Locais onde acontecem jogos, lutas, provas e atividades.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" {...register("name", { required: true })} autoFocus />
              {errors.name && <p className="text-xs text-destructive">Obrigatório</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" {...register("address")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" rows={2} {...register("description")} />
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
