"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatBrPhone } from "@/lib/phone";

type Props = Omit<React.ComponentProps<"input">, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
};

/** Input controlado que aplica máscara `(51) 99999-9999` enquanto o usuário digita. */
export function PhoneInput({ value, onChange, ...rest }: Props) {
  return (
    <Input
      {...rest}
      inputMode="tel"
      autoComplete="tel-national"
      placeholder={rest.placeholder ?? "(51) 99999-9999"}
      value={formatBrPhone(value ?? "")}
      onChange={(e) => onChange(formatBrPhone(e.target.value))}
    />
  );
}
