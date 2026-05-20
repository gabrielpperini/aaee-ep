"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModalityDialog } from "./modality-dialog";

export function NewModalityButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" />
        Nova modalidade
      </Button>
      <ModalityDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
