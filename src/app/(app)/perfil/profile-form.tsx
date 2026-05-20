"use client";

import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveOwnProfile, type ProfileFormValues } from "./actions";

type ModalityOption = { id: string; name: string };

type Props = {
  personId: string | null;
  modalities: ModalityOption[];
  initial: ProfileFormValues;
};

export function ProfileForm({ personId, modalities, initial }: Props) {
  const [pending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    defaultValues: initial,
  });

  function onSubmit(values: ProfileFormValues) {
    startTransition(async () => {
      const result = await saveOwnProfile(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(personId ? "Perfil atualizado" : "Perfil criado");
      reset(values);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome completo *</Label>
        <Input id="name" {...register("name", { required: true })} />
        {errors.name && <p className="text-xs text-destructive">Obrigatório</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register("email")} />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border rounded-md p-3 max-h-60 overflow-y-auto">
                  {modalities.map((m) => {
                    const checked = value.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
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

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
