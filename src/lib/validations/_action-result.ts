import { z } from "zod";

/**
 * Estado de retorno padrão para Server Actions usadas com useActionState.
 * - `idle`: ainda não disparada
 * - `success`: ação completou; opcionalmente carrega `data`
 * - `error`: ou um erro global (`formError`) ou erros por campo (`fieldErrors`)
 */
export type FormState<TData = unknown> =
  | { status: "idle" }
  | { status: "success"; data?: TData }
  | {
      status: "error";
      formError?: string;
      fieldErrors?: Record<string, string>;
    };

export const idleState: FormState = { status: "idle" };

/** Converte ZodError em fieldErrors achatado (primeira mensagem por path). */
export function fieldErrorsFromZod(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (path && !out[path]) {
      out[path] = issue.message;
    }
  }
  return out;
}

/** Helper para retornar erro global do servidor. */
export function failure(formError: string): FormState {
  return { status: "error", formError };
}

/** Helper para retornar erro de campo. */
export function fieldFailure(fieldErrors: Record<string, string>, formError?: string): FormState {
  return { status: "error", fieldErrors, formError };
}

/** Helper para sucesso. */
export function success<T>(data?: T): FormState<T> {
  return { status: "success", data };
}
