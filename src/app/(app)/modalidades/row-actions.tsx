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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function runDelete() {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const result = await deleteModality(modality.id);
        if (result.status === "error") {
          toast.error(result.formError ?? "Não foi possível excluir.");
        } else if (result.status === "success") {
          toast.success("Modalidade excluída");
        }
        resolve();
      });
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              disabled={pending}
              aria-label={`Ações para ${modality.name}`}
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
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Excluir modalidade "${modality.name}"?`}
        description="Eventos vinculados precisam ser excluídos ou reatribuídos antes."
        confirmLabel="Excluir"
        onConfirm={runDelete}
      />
    </>
  );
}
