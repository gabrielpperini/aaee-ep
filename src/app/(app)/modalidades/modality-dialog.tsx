"use client";

import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MODALITY_CATEGORY_LABELS, PRIORITY_LABELS } from "@/lib/format";
import {
  modalitySchema,
  type ModalityFormValues,
} from "@/lib/validations/modality";
import { useFormAction } from "@/lib/validations/use-form-action";
import { saveModality } from "./actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<ModalityFormValues> & { id?: string };
};

const empty: ModalityFormValues = {
  name: "",
  category: "SPORT",
  priority: "NORMAL",
  notes: "",
};

export function ModalityDialog({ open, onOpenChange, initial }: Props) {
  const form = useForm<ModalityFormValues>({
    resolver: zodResolver(modalitySchema),
    defaultValues: { ...empty, ...initial },
  });

  useEffect(() => {
    if (open) form.reset({ ...empty, ...initial });
  }, [open, initial, form]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  const { onSubmit, pending } = useFormAction(saveModality, form, {
    successMessage: initial?.id ? "Modalidade atualizada" : "Modalidade criada",
    onSuccess: close,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>
                {initial?.id ? "Editar modalidade" : "Nova modalidade"}
              </DialogTitle>
              <DialogDescription>
                Modalidades esportivas, culturais ou atividades de torcida.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
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
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select
                        items={MODALITY_CATEGORY_LABELS}
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(MODALITY_CATEGORY_LABELS).map(
                            ([k, v]) => (
                              <SelectItem key={k} value={k}>
                                {v}
                              </SelectItem>
                            ),
                          )}
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
                    <FormItem>
                      <FormLabel>Prioridade padrão</FormLabel>
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
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
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
