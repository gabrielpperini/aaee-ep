"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPersonFromUser } from "./actions";

export function CreatePersonButton({ userId }: { userId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      className="h-7 text-xs"
      onClick={() =>
        startTransition(async () => {
          const r = await createPersonFromUser(userId);
          if (r.status === "error") toast.error(r.formError ?? "Não foi possível criar.");
          else toast.success("Pessoa criada com os dados do login.");
        })
      }
    >
      {pending ? (
        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
      ) : (
        <UserPlus className="mr-1 h-3.5 w-3.5" />
      )}
      Criar pessoa
    </Button>
  );
}
