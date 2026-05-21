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
import type { ModalityFormValues } from "@/lib/validations/modality";
import { ModalityDialog } from "./modality-dialog";
import { deleteModality } from "./actions";

type Props = {
  modality: {
    id: string;
    name: string;
    category: ModalityFormValues["category"];
    priority: ModalityFormValues["priority"];
    notes: string | null;
  };
};

export function ModalityRowActions({ modality }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Excluir modalidade "${modality.name}"?`)) return;
    startTransition(async () => {
      const result = await deleteModality(modality.id);
      if (result.status === "error") {
        toast.error(result.formError ?? "Não foi possível excluir.");
      } else if (result.status === "success") {
        toast.success("Modalidade excluída");
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" disabled={pending} />}>
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>Editar</DropdownMenuItem>
          <DropdownMenuItem onClick={handleDelete} variant="destructive">
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ModalityDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={{
          id: modality.id,
          name: modality.name,
          category: modality.category,
          priority: modality.priority,
          notes: modality.notes ?? "",
        }}
      />
    </>
  );
}
