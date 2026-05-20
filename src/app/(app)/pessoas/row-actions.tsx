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
import { PersonDialog } from "./person-dialog";
import { deletePerson, type PersonFormValues } from "./actions";

type Props = {
  person: {
    id: string;
    name: string;
    nickname: string | null;
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
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Excluir "${person.name}"?`)) return;
    startTransition(async () => {
      const result = await deletePerson(person.id);
      if (!result.ok) toast.error(result.error);
      else toast.success("Pessoa excluída");
    });
  }

  const initial: Partial<PersonFormValues> & { id: string } = {
    id: person.id,
    name: person.name,
    nickname: person.nickname ?? "",
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
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" disabled={pending} />}>
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>Editar</DropdownMenuItem>
          <DropdownMenuItem onSelect={handleDelete} variant="destructive">
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
    </>
  );
}
