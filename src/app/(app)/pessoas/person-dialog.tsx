"use client";

import { useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { PhoneInput } from "@/components/phone-input";
import { Textarea } from "@/components/ui/textarea";
import { personSchema, type PersonFormValues } from "@/lib/validations/person";
import { useFormAction } from "@/lib/validations/use-form-action";
import { savePerson } from "./actions";

type ModalityOption = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modalities: ModalityOption[];
  initial?: Partial<PersonFormValues> & { id?: string };
};

const FLAG_FIELDS = [
  { name: "isAthlete" as const, label: "Atleta" },
  { name: "isSupporter" as const, label: "Torcida" },
  { name: "isDirector" as const, label: "Diretor(a)" },
  { name: "isSupport" as const, label: "Apoio" },
];

const empty: PersonFormValues = {
  name: "",
  nickname: "",
  email: "",
  phone: "",
  isAthlete: false,
  isSupporter: true,
  isDirector: false,
  isSupport: false,
  notes: "",
  modalityIds: [],
};

export function PersonDialog({ open, onOpenChange, modalities, initial }: Props) {
  const form = useForm<PersonFormValues>({
    resolver: zodResolver(personSchema),
    defaultValues: { ...empty, ...initial },
  });

  useEffect(() => {
    if (open) form.reset({ ...empty, ...initial });
  }, [open, initial, form]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  const { onSubmit, pending } = useFormAction(savePerson, form, {
    successMessage: initial?.id ? "Pessoa atualizada" : "Pessoa cadastrada",
    onSuccess: close,
  });

  const modalityOptions = modalities.map((m) => ({
    value: m.id,
    label: m.name,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <Form {...form}>
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>
                {initial?.id ? "Editar pessoa" : "Nova pessoa"}
              </DialogTitle>
              <DialogDescription>
                Cadastro de pessoas da delegação. Categorias não são excludentes.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 px-1 -mx-1 max-h-[60vh] overflow-y-auto">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo *</FormLabel>
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
                  name="nickname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apelido</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <PhoneInput
                          value={field.value ?? ""}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label>Participação</Label>
                <div className="grid grid-cols-2 gap-3">
                  {FLAG_FIELDS.map((f) => (
                    <FormField
                      key={f.name}
                      control={form.control}
                      name={f.name}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center gap-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(v) => field.onChange(v === true)}
                            />
                          </FormControl>
                          <FormLabel className="cursor-pointer font-normal">
                            {f.label}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>

              {modalities.length > 0 && (
                <FormField
                  control={form.control}
                  name="modalityIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modalidades em que compete</FormLabel>
                      <FormControl>
                        <MultiSelect
                          options={modalityOptions}
                          value={field.value ?? []}
                          onChange={field.onChange}
                          placeholder="Selecione modalidades…"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
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
                {pending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                {pending ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
