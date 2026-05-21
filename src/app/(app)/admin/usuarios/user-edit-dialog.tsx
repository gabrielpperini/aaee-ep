"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Role } from "@/generated/prisma/client";
import { userEditSchema, type UserEditFormValues } from "@/lib/validations/user";
import { useFormAction } from "@/lib/validations/use-form-action";
import { saveUserEdit } from "./actions";

type PersonOption = {
  id: string;
  name: string;
  nickname: string | null;
  email: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string | null;
    role: Role;
    person: { id: string; name: string; nickname: string | null } | null;
  };
  unlinkedPersons: PersonOption[];
};

const ROLE_LABELS: Record<Role, string> = {
  USER: "Membro",
  DIRECTOR: "Diretor",
  ADMIN: "Admin",
};

const ROLE_OPTIONS: { value: Role; label: string }[] = (
  Object.entries(ROLE_LABELS) as [Role, string][]
).map(([value, label]) => ({ value, label }));

function personLabel(p: { name: string; nickname: string | null }) {
  return p.nickname ? `${p.name} (${p.nickname})` : p.name;
}

export function UserEditDialog({
  open,
  onOpenChange,
  user,
  unlinkedPersons,
}: Props) {
  const form = useForm<UserEditFormValues>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      userId: user.id,
      role: user.role,
      personId: user.person?.id ?? null,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        userId: user.id,
        role: user.role,
        personId: user.person?.id ?? null,
      });
    }
  }, [open, user, form]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  const { onSubmit, pending } = useFormAction(saveUserEdit, form, {
    successMessage: "Usuário atualizado",
    onSuccess: close,
  });

  const personOptions = useMemo(() => {
    const list: PersonOption[] = [...unlinkedPersons];
    if (user.person && !unlinkedPersons.some((p) => p.id === user.person?.id)) {
      list.push({
        id: user.person.id,
        name: user.person.name,
        nickname: user.person.nickname,
        email: null,
      });
    }
    return list
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
      .map((p) => ({
        value: p.id,
        label: personLabel(p),
        hint: p.email ?? undefined,
      }));
  }, [unlinkedPersons, user.person]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>Editar usuário</DialogTitle>
              <DialogDescription>{user.email ?? "Sem email"}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Função</FormLabel>
                    <Select
                      items={ROLE_LABELS}
                      value={field.value}
                      onValueChange={(v) => field.onChange(v as Role)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ROLE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
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
                name="personId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pessoa vinculada</FormLabel>
                    <FormControl>
                      <Combobox
                        options={personOptions}
                        value={field.value ?? ""}
                        onChange={(v) => field.onChange(v === "" ? null : v)}
                        placeholder="— sem vínculo —"
                        clearable
                        clearLabel="— sem vínculo —"
                      />
                    </FormControl>
                    <FormDescription>
                      Somente pessoas sem vínculo aparecem aqui. Trocar o
                      vínculo libera a pessoa anterior.
                    </FormDescription>
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
