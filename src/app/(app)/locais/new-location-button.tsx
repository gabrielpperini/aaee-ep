"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocationDialog } from "./location-dialog";

export function NewLocationButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" />
        Novo local
      </Button>
      <LocationDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
