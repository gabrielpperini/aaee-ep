"use client";

import { useState } from "react";
import { Loader2, Megaphone, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  MultiSelect,
  type MultiSelectOption,
} from "@/components/ui/multi-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  broadcastSchema,
  type BroadcastFormValues,
} from "@/lib/validations/broadcast";
import { useFormAction } from "@/lib/validations/use-form-action";
import { previewRecipientCount, sendBroadcast } from "./actions";

const BODY_MAX = 300;

const DEFAULTS: BroadcastFormValues = {
  title: "",
  body: "",
  url: "",
  toEveryone: false,
  modalityIds: [],
  eventIds: [],
};

type Props = {
  modalityOptions: MultiSelectOption[];
  eventOptions: MultiSelectOption[];
};

export function BroadcastForm({ modalityOptions, eventOptions }: Props) {
  const form = useForm<BroadcastFormValues>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: DEFAULTS,
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  const { onSubmit, pending } = useFormAction(sendBroadcast, form, {
    onSuccess: (data) => {
      const d = data as
        | {
            recipientCount: number;
            sentCount: number;
            whatsappSentCount: number;
          }
        | undefined;
      setConfirmOpen(false);
      if (d && d.sentCount === 0 && d.whatsappSentCount === 0) {
        toast.info(
          `Aviso registrado, mas ninguém recebeu (${d.recipientCount} pessoa(s) no público).`,
        );
      } else if (d) {
        toast.success(
          `Enviado para ${d.recipientCount} pessoa(s) · push: ${d.sentCount} dispositivo(s) · WhatsApp: ${d.whatsappSentCount}.`,
        );
      }
      form.reset(DEFAULTS);
    },
  });

  const toEveryone = form.watch("toEveryone");
  const bodyLength = form.watch("body")?.length ?? 0;

  async function handleReview() {
    const valid = await form.trigger();
    if (!valid) return;
    const v = form.getValues();
    setPreviewCount(null);
    setPreviewing(true);
    setConfirmOpen(true);
    try {
      const { count } = await previewRecipientCount({
        toEveryone: v.toEveryone,
        modalityIds: v.modalityIds,
        eventIds: v.eventIds,
      });
      setPreviewCount(count);
    } catch {
      setPreviewCount(null);
    } finally {
      setPreviewing(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleReview();
        }}
        className="space-y-6"
      >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Ônibus sai às 7h" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mensagem</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Escreva o aviso…"
                  {...field}
                  onChange={(e) =>
                    field.onChange(e.target.value.slice(0, BODY_MAX))
                  }
                />
              </FormControl>
              <div className="flex items-center justify-between">
                <FormMessage />
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {bodyLength}/{BODY_MAX}
                </span>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Link (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="/agenda" {...field} />
              </FormControl>
              <FormDescription>
                Para onde a notificação leva ao ser tocada. Padrão: a agenda.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="toEveryone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Público</FormLabel>
              <FormControl>
                <RadioGroup
                  value={field.value ? "all" : "groups"}
                  onValueChange={(v) => field.onChange(v === "all")}
                  className="gap-3"
                >
                  <label className="flex items-center gap-2.5 text-sm">
                    <RadioGroupItem value="all" />
                    Todo mundo (toda a delegação com conta)
                  </label>
                  <label className="flex items-center gap-2.5 text-sm">
                    <RadioGroupItem value="groups" />
                    Selecionar grupos por modalidade / evento
                  </label>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!toEveryone && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="modalityIds"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel>Modalidades</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={modalityOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Nenhuma"
                      searchPlaceholder="Buscar modalidade…"
                      maxBadges={4}
                    />
                  </FormControl>
                  <FormDescription>Atletas vinculados.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="eventIds"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel>Eventos</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={eventOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Nenhum"
                      searchPlaceholder="Buscar evento…"
                      maxBadges={4}
                    />
                  </FormControl>
                  <FormDescription>Atletas + escalados.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            <Megaphone className="mr-1.5 h-4 w-4" />
            Revisar e enviar
          </Button>
        </div>
      </form>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar envio</DialogTitle>
            <DialogDescription>
              A notificação será enviada imediatamente e não pode ser
              cancelada.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
            <Users className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div>
              {previewing ? (
                <span className="text-muted-foreground">
                  Calculando destinatários…
                </span>
              ) : previewCount === null ? (
                <span className="text-muted-foreground">
                  Não foi possível estimar o público.
                </span>
              ) : (
                <>
                  <span className="font-medium tabular-nums">
                    {previewCount}
                  </span>{" "}
                  pessoa(s) no público.
                  {previewCount === 0 && (
                    <span className="block text-xs text-muted-foreground">
                      Ninguém para notificar com esta seleção.
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => onSubmit()}
              disabled={pending || previewing || previewCount === 0}
            >
              {pending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {pending ? "Enviando…" : "Enviar agora"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
