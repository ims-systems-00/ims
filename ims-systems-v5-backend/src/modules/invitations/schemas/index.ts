import { z } from "zod";
import { ORGANISATION_ROLES } from "../../organisation/types";

export const invitationIdParamSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid id format"),
});

export const invitationTokenParamSchema = z.object({
  token: z.string().trim().min(1, "Invitation token is required"),
});

export const createInvitationBodySchema = z.object({
  email: z
    .string()
    .trim()
    .email("Valid email is required")
    .transform((value) => value.toLowerCase()),
  role: z.enum(ORGANISATION_ROLES),
});

export const listInvitationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
});

export const acceptInvitationBodySchema = z.object({
  token: z.string().trim().min(1, "Invitation token is required"),
});
