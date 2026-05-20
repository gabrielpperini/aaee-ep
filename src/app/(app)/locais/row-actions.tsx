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
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Excluir "${location.name}"?`)) return;
    startTransition(async () => {
      const result = await deleteLocation(location.id);
      if (!result.ok) toast.error(result.error);
      else toast.success("Local excluído");
    });
  }

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
    </>
  );
}
