"use client";

import { useEffect, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Role } from "@/generated/prisma/client";
import { linkUserToPerson, updateUserRole } from "./actions";

const NONE_VALUE = "__none__";

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

type FormValues = {
  role: Role;
  personId: string; // "__none__" para sem vínculo
};

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "USER", label: "Membro" },
  { value: "DIRECTOR", label: "Diretor" },
  { value: "ADMIN", label: "Admin" },
];

function personLabel(p: { name: string; nickname: string | null }) {
  return p.nickname ? `${p.name} (${p.nickname})` : p.name;
}

export function UserEditDialog({
  open,
  onOpenChange,
  user,
  unlinkedPersons,
}: Props) {
  const [pending, startTransition] = useTransition();

  const initialPersonId = user.person?.id ?? NONE_VALUE;

  const { control, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      role: user.role,
      personId: initialPersonId,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        role: user.role,
        personId: user.person?.id ?? NONE_VALUE,
      });
    }
  }, [open, user, reset]);

  // Lista de opções para o select de Person: a person atual (se houver)
  // + todas que estão sem vínculo. Ordenamos por nome.
  const personOptions: PersonOption[] = (() => {
    const list: PersonOption[] = [...unlinkedPersons];
    if (
      user.person &&
      !unlinkedPersons.some((p) => p.id === user.person?.id)
    ) {
      list.push({
        id: user.person.id,
        name: user.person.name,
        nickname: user.person.nickname,
        email: null,
      });
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  })();

  function onSubmit(values: FormValues) {
    const initialRole = user.role;
    const newRole = values.role;
    const newPersonId = values.personId === NONE_VALUE ? null : values.personId;
    const currentPersonId = user.person?.id ?? null;

    const roleChanged = newRole !== initialRole;
    const personChanged = newPersonId !== currentPersonId;

    if (!roleChanged && !personChanged) {
      toast.success("Nada a salvar");
      onOpenChange(false);
      return;
    }

    startTransition(async () => {
      if (roleChanged) {
        const result = await updateUserRole(user.id, newRole);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
      }
      if (personChanged) {
        const result = await linkUserToPerson(user.id, newPersonId);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
      }
      toast.success("Usuário atualizado");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
            <DialogDescription>
              {user.email ?? "Sem email"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Função</Label>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v as Role)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Pessoa vinculada</Label>
              <Controller
                control={control}
                name="personId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>
                        — sem vínculo —
                      </SelectItem>
                      {personOptions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {personLabel(p)}
                          {p.email ? ` · ${p.email}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-muted-foreground">
                Somente pessoas sem vínculo aparecem aqui. Trocar o vínculo
                libera a pessoa anterior.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
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
