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
import { LocationDialog } from "./location-dialog";
import { deleteLocation } from "./actions";

type Props = {
  location: {
    id: string;
    name: string;
    address: string | null;
    description: string | null;
    notes: string | null;
  };
};

export function LocationRowActions({ location }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function runDelete() {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const result = await deleteLocation(location.id);
        if (result.status === "error") {
          toast.error(result.formError ?? "Não foi possível excluir.");
        } else if (result.status === "success") {
          toast.success("Local excluído");
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
              aria-label={`Ações para ${location.name}`}
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
      <LocationDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={{
          id: location.id,
          name: location.name,
          address: location.address ?? "",
          description: location.description ?? "",
          notes: location.notes ?? "",
        }}
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Excluir "${location.name}"?`}
        description="Esta ação não pode ser desfeita. Eventos vinculados precisam ser reatribuídos antes."
        confirmLabel="Excluir"
        onConfirm={runDelete}
      />
    </>
  );
}
