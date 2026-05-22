"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
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
import { EventDialog } from "./event-dialog";
import type { EventFormValues } from "@/lib/validations/event";
import { deleteEvent } from "./actions";

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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function runDelete() {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const result = await deleteEvent(event.id);
        if (result.status === "error") {
          toast.error(result.formError ?? "Não foi possível excluir.");
        } else if (result.status === "success") {
          toast.success("Evento excluído");
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
              aria-label={`Ações para ${event.title}`}
            />
          }
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href={`/eventos/${event.id}`} />}>
            Abrir detalhe
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>Editar</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setConfirmOpen(true)} variant="destructive">
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
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Excluir evento "${event.title}"?`}
        description="Assignments e check-ins deste evento serão removidos em cascata."
        confirmLabel="Excluir"
        onConfirm={runDelete}
      />
    </>
  );
}
