"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WhatsAppButton } from "@/components/ui/whatsapp-button";
import { PersonRowActions } from "./row-actions";

type ModalityRef = { id: string; name: string };

export type PersonRow = {
  id: string;
  name: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  isAthlete: boolean;
  isSupporter: boolean;
  isDirector: boolean;
  isSupport: boolean;
  notes: string | null;
  modalities: ModalityRef[];
};

type Props = {
  people: PersonRow[];
  modalities: ModalityRef[];
  busyPersonIds: string[];
};

export function PeopleTable({ people, modalities, busyPersonIds }: Props) {
  const [onlyFree, setOnlyFree] = useState(false);
  const busySet = useMemo(() => new Set(busyPersonIds), [busyPersonIds]);

  const visible = onlyFree ? people.filter((p) => !busySet.has(p.id)) : people;
  const freeCount = people.length - busySet.size;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={onlyFree ? "default" : "outline"}
          size="sm"
          onClick={() => setOnlyFree((v) => !v)}
          title={
            onlyFree
              ? "Mostrando só quem não está em evento agora."
              : "Mostrar só quem não está em evento neste momento."
          }
        >
          {onlyFree ? `Só livres agora (${freeCount})` : `Filtrar livres agora (${freeCount})`}
        </Button>
        <span className="text-xs text-muted-foreground">
          {visible.length} de {people.length}
        </span>
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Apelido</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Participação</TableHead>
              <TableHead>Modalidades</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  Ninguém livre no momento.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((p) => {
                const tags = [
                  p.isAthlete && "Atleta",
                  p.isSupporter && "Torcida",
                  p.isDirector && "Diretor",
                  p.isSupport && "Apoio",
                ].filter(Boolean) as string[];
                const isBusy = busySet.has(p.id);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        <span>{p.name}</span>
                        {isBusy && (
                          <Badge variant="outline" className="text-[10px]">
                            Em evento
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.nickname || "—"}</TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      <div className="flex items-center gap-1.5">
                        <span>{p.phone || "—"}</span>
                        {p.phone && <WhatsAppButton phone={p.phone} size="icon-xs" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.email || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {tags.length === 0 ? (
                          <span className="text-muted-foreground text-xs">—</span>
                        ) : (
                          tags.map((t) => (
                            <Badge key={t} variant="secondary">
                              {t}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {p.modalities.length === 0 ? (
                          <span className="text-muted-foreground text-xs">—</span>
                        ) : (
                          p.modalities.map((m) => (
                            <Badge key={m.id} variant="outline">
                              {m.name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <PersonRowActions
                        person={{
                          id: p.id,
                          name: p.name,
                          nickname: p.nickname,
                          email: p.email,
                          phone: p.phone,
                          isAthlete: p.isAthlete,
                          isSupporter: p.isSupporter,
                          isDirector: p.isDirector,
                          isSupport: p.isSupport,
                          notes: p.notes,
                          modalityIds: p.modalities.map((m) => m.id),
                        }}
                        modalities={modalities}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
