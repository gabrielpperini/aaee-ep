"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PersonDialog } from "./person-dialog";

export function NewPersonButton({ modalities }: { modalities: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" />
        Nova pessoa
      </Button>
      <PersonDialog open={open} onOpenChange={setOpen} modalities={modalities} />
    </>
  );
}
