"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { callSupporters } from "./actions";

const MAX = 100;
const DEFAULT_MESSAGE = "Bora torcida! Todo mundo na arquibancada 📣";

export function CallSupportersButton({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [pending, startTransition] = useTransition();

  const handleSend = () => {
    startTransition(async () => {
      const result = await callSupporters({ eventId, message: message.trim() });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Chamado enviado para a torcida!");
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="secondary" size="sm" />}>
        <Megaphone className="mr-1.5 h-4 w-4" />
        Chamar torcida
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chamar a torcida</DialogTitle>
          <DialogDescription>
            Envia uma notificação push para todos que estão escalados neste
            evento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX))}
            rows={3}
            placeholder="Escreva uma mensagem curta…"
          />
          <div className="text-right text-xs text-muted-foreground tabular-nums">
            {message.length}/{MAX}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={pending || message.trim().length === 0}>
            {pending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {pending ? "Enviando…" : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
