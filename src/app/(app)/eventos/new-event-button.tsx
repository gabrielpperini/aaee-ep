"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventDialog } from "./event-dialog";

type Option = { id: string; name: string };
type PersonOption = { id: string; name: string; nickname: string | null };

export function NewEventButton({
  modalities,
  locations,
  athletes,
}: {
  modalities: Option[];
  locations: Option[];
  athletes: PersonOption[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" />
        Novo evento
      </Button>
      <EventDialog
        open={open}
        onOpenChange={setOpen}
        modalities={modalities}
        locations={locations}
        athletes={athletes}
      />
    </>
  );
}
