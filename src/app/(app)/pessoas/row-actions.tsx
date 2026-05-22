"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { PersonDialog } from "./person-dialog";
import type { PersonFormValues } from "@/lib/validations/person";
import { deletePerson } from "./actions";

type Props = {
  person: {
    id: string;
    name: string;
    nickname: string | null;
    email: string | null;
    phone: string | null;
    isAthlete: boolean;
    isSupporter: boolean;
    isDirector: boolean;
    isSupport: boolean;
    notes: string | null;
    modalityIds: string[];
  };
  modalities: { id: string; name: string }[];
};

export function PersonRowActions({ person, modalities }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function runDelete() {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const result = await deletePerson(person.id);
        if (result.status === "error") {
          toast.error(result.formError ?? "Não foi possível excluir.");
        } else if (result.status === "success") {
          toast.success("Pessoa excluída");
        }
        resolve();
      });
    });
  }

  const initial: Partial<PersonFormValues> & { id: string } = {
    id: person.id,
    name: person.name,
    nickname: person.nickname ?? "",
    email: person.email ?? "",
    phone: person.phone ?? "",
    isAthlete: person.isAthlete,
    isSupporter: person.isSupporter,
    isDirector: person.isDirector,
    isSupport: person.isSupport,
    notes: person.notes ?? "",
    modalityIds: person.modalityIds,
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              disabled={pending}
              aria-label={`Ações para ${person.name}`}
            />
          }
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>Editar</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setConfirmOpen(true)} variant="destructive">
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <PersonDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        modalities={modalities}
        initial={initial}
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Excluir "${person.name}"?`}
        description="Esta ação remove o cadastro permanentemente. Eventos e check-ins ficam órfãos."
        confirmLabel="Excluir"
        onConfirm={runDelete}
      />
    </>
  );
}
