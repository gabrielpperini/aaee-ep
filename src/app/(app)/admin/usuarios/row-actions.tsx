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
import type { Role } from "@/generated/prisma/client";
import { UserEditDialog } from "./user-edit-dialog";
import { createPersonFromUser } from "./actions";

type PersonOption = {
  id: string;
  name: string;
  nickname: string | null;
  email: string | null;
};

type Props = {
  user: {
    id: string;
    email: string | null;
    role: Role;
    person: { id: string; name: string; nickname: string | null } | null;
  };
  unlinkedPersons: PersonOption[];
};

export function UserRowActions({ user, unlinkedPersons }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleCreatePerson = () => {
    startTransition(async () => {
      const r = await createPersonFromUser(user.id);
      if (r.status === "error") toast.error(r.formError ?? "Não foi possível criar.");
      else toast.success("Pessoa criada com os dados do login.");
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            Editar
          </DropdownMenuItem>
          {!user.person && (
            <DropdownMenuItem onClick={handleCreatePerson} disabled={pending}>
              {pending ? "Criando…" : "Criar pessoa do login"}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <UserEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        user={user}
        unlinkedPersons={unlinkedPersons}
      />
    </>
  );
}
