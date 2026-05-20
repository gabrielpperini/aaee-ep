"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Role } from "@/generated/prisma/client";
import { UserEditDialog } from "./user-edit-dialog";

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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            Editar
          </DropdownMenuItem>
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
