"use client";

import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhoneInput } from "@/components/phone-input";
import { COURSE_OPTIONS } from "@/lib/format";
import {
  profileSchema,
  type ProfileFormValues,
} from "@/lib/validations/profile";
import { useFormAction } from "@/lib/validations/use-form-action";
import { saveOwnProfile } from "./actions";

type ModalityOption = { id: string; name: string };

type Props = {
  personId: string | null;
  modalities: ModalityOption[];
  initial: ProfileFormValues;
};

const SEMESTERS = Array.from({ length: 10 }, (_, i) => i + 1);
const SEMESTER_LABELS: Record<string, string> = Object.fromEntries(
  SEMESTERS.map((s) => [String(s), `${s}º`]),
);

export function ProfileForm({ personId, modalities, initial }: Props) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: initial,
  });

  const { onSubmit, pending } = useFormAction(saveOwnProfile, form, {
    successMessage: personId ? "Perfil atualizado" : "Perfil criado",
    onSuccess: () => form.reset(form.getValues()),
  });

  const modalityOptions = modalities.map((m) => ({
    value: m.id,
    label: m.name,
  }));

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome completo *</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
          <FormField
            control={form.control}
            name="course"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Curso</FormLabel>
                <FormControl>
                  <Combobox
                    options={COURSE_OPTIONS.map((c) => ({
                      value: c.value,
                      label: c.label,
                    }))}
                    value={(field.value as string) ?? ""}
                    onChange={field.onChange}
                    placeholder="— sem curso —"
                    clearable
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="semester"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Semestre</FormLabel>
                <Select
                  items={SEMESTER_LABELS}
                  value={field.value === "" ? undefined : String(field.value)}
                  onValueChange={(v) => field.onChange(v ? Number(v) : "")}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SEMESTERS.map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        {s}º
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
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

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {pending ? "Salvando…" : "Salvar alterações"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
