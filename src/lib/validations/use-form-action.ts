"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import { idleState, type FormState } from "./_action-result";

type ActionFn<TInput> = (prev: FormState, input: TInput) => Promise<FormState>;

type Options = {
  /** Callback disparado quando a action retorna `status: "success"`. */
  onSuccess?: (data: unknown) => void;
  /** Toast.success exibido em caso de sucesso. */
  successMessage?: string;
};

/**
 * Combina React Hook Form (validação client + estado do form) com `useActionState`
 * (estado da Server Action). Erros por campo voltam mapeados em `form.setError`,
 * erros globais aparecem como toast.error.
 *
 * Uso:
 *
 * ```tsx
 * const form = useForm<EventFormValues>({
 *   resolver: zodResolver(eventSchema),
 *   defaultValues: { ... },
 * });
 * const { onSubmit, pending } = useFormAction(saveEvent, form, {
 *   successMessage: "Evento salvo",
 *   onSuccess: () => onOpenChange(false),
 * });
 * return <form onSubmit={onSubmit}>...</form>;
 * ```
 */
export function useFormAction<TValues extends FieldValues>(
  action: ActionFn<TValues>,
  form: UseFormReturn<TValues>,
  options: Options = {},
) {
  const [state, formAction] = useActionState<FormState, TValues>(action, idleState);
  const [pending, startTransition] = useTransition();

  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    if (state.status === "error") {
      if (state.fieldErrors) {
        for (const [field, message] of Object.entries(state.fieldErrors)) {
          form.setError(field as Path<TValues>, {
            type: "server",
            message,
          });
        }
      }
      if (state.formError) {
        toast.error(state.formError);
      }
    } else if (state.status === "success") {
      if (optionsRef.current.successMessage) {
        toast.success(optionsRef.current.successMessage);
      }
      optionsRef.current.onSuccess?.(state.data);
    }
  }, [state, form]);

  const onSubmit = form.handleSubmit((values) => {
    form.clearErrors();
    startTransition(() => formAction(values));
  });

  return { state, onSubmit, pending };
}
