import { z } from "zod";
import { cuid, roleEnum } from "./_primitives";

export const updateUserRoleSchema = z.object({
  userId: cuid,
  role: roleEnum,
});

export const linkUserToPersonSchema = z.object({
  userId: cuid,
  personId: z.union([cuid, z.null()]),
});

export const userEditSchema = z.object({
  userId: cuid,
  role: roleEnum,
  personId: z.string().nullable(),
});

export type UserEditFormValues = z.infer<typeof userEditSchema>;
