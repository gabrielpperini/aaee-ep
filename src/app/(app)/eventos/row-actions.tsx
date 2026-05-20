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
import { EventDialog } from "./event-dialog";
import { deleteEvent, type EventFormValues } from "./actions";

type Option = { id: string; name: string };
type PersonOption = { id: string; name: string; nickname: string | null };

type Props = {
  event: Partial<EventFormValues> & {
    id: string;
    title: string;
  };
  modalities: Option[];
  locations: Option[];
  athletes: PersonOption[];
};

export function EventRowActions({ event, modalities, locations, athletes }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Excluir evento "${event.title}"?`)) return;
    startTransition(async () => {
      const result = await deleteEvent(event.id);
      if (!result.ok) toast.error(result.error);
      else toast.success("Evento excluído");
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
      <EventDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        modalities={modalities}
        locations={locations}
        athletes={athletes}
        initial={event}
      />
    </>
  );
}
