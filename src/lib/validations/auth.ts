import { z } from "zod";
import {
  courseEnum,
  email,
  password,
  phoneBR,
  requiredText,
  semester,
} from "./_primitives";

/* ---------- Login ---------- */

export const loginPasswordSchema = z.object({
  email,
  password: z.string().min(1, "Digite sua senha"),
});
export type LoginPasswordValues = z.infer<typeof loginPasswordSchema>;

export const requestOtpSchema = z.object({
  email,
});
export type RequestOtpValues = z.infer<typeof requestOtpSchema>;

export const otpVerifySchema = z.object({
  email,
  token: z
    .string()
    .min(8, "Código OTP tem 8 dígitos")
    .max(8, "Código OTP tem 8 dígitos")
    .regex(/^\d{8}$/u, "Código OTP deve ser numérico"),
});
export type OtpVerifyValues = z.infer<typeof otpVerifySchema>;

export const requestPasswordResetSchema = z.object({
  email,
});
export type RequestPasswordResetValues = z.infer<typeof requestPasswordResetSchema>;

/* ---------- Signup ---------- */

export const signupSchema = z
  .object({
    name: requiredText("Nome", 120),
    nickname: z.string().trim().max(60),
    phone: phoneBR,
    course: z.union([courseEnum, z.literal("")]),
    semester: z.union([semester, z.literal("")]),
    email,
    password,
    confirm: z.string().min(1, "Confirme a senha"),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirm) {
      ctx.addIssue({
        code: "custom",
        path: ["confirm"],
        message: "As senhas não conferem",
      });
    }
    if (data.course === "") {
      ctx.addIssue({
        code: "custom",
        path: ["course"],
        message: "Selecione seu curso",
      });
    }
    if (data.semester === "") {
      ctx.addIssue({
        code: "custom",
        path: ["semester"],
        message: "Selecione seu semestre",
      });
    }
  });

export type SignupValues = z.infer<typeof signupSchema>;

/** Subset que vai para a Server Action `setupNewAccount` após o Supabase signup. */
export const setupAccountSchema = z.object({
  name: requiredText("Nome", 120),
  nickname: z.string().trim().max(60),
  phone: z
    .string()
    .refine(
      (v) => v === "" || /^\d{10,11}$/u.test(v.replace(/\D/g, "")),
      "Telefone deve ter 10 ou 11 dígitos",
    ),
  course: z.union([courseEnum, z.literal("")]),
  semester: z.union([semester, z.literal("")]),
});
export type SetupAccountValues = z.infer<typeof setupAccountSchema>;

/* ---------- Reset de senha ---------- */

export const resetPasswordSchema = z
  .object({
    password,
    confirm: z.string().min(1, "Confirme a senha"),
  })
  .refine((data) => data.password === data.confirm, {
    message: "As senhas não conferem",
    path: ["confirm"],
  });

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
