"use client";

import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  epEditionSchema,
  type EpEditionFormValues,
} from "@/lib/validations/ep-edition";
import { useFormAction } from "@/lib/validations/use-form-action";
import { EP_DAY_LONG_LABEL } from "@/lib/ep-edition";
import { saveEpEdition } from "./actions";

type Props = {
  initial: EpEditionFormValues;
};

const FIELDS: Array<{
  name: keyof EpEditionFormValues;
  day: number;
}> = [
  { name: "day0", day: 0 },
  { name: "day1", day: 1 },
  { name: "day2", day: 2 },
  { name: "day3", day: 3 },
  { name: "day4", day: 4 },
];

export function EpEditionForm({ initial }: Props) {
  const form = useForm<EpEditionFormValues>({
    resolver: zodResolver(epEditionSchema),
    defaultValues: initial,
  });

  const { onSubmit, pending } = useFormAction(saveEpEdition, form, {
    successMessage: "Edição atualizada",
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da edição</FormLabel>
              <FormControl>
                <Input placeholder="EP 2026 — Pelotas" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FIELDS.map(({ name, day }) => (
            <FormField
              key={name}
              control={form.control}
              name={name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{EP_DAY_LONG_LABEL[day]}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="Notas internas da diretoria…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
