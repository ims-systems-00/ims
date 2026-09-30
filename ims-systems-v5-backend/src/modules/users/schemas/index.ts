import { z } from "zod";
import { USER_TYPES } from "../types";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id format");

export const idParamSchema = z.object({
  id: objectIdSchema,
});

export const locationIdParamSchema = z.object({
  id: objectIdSchema,
  locationId: objectIdSchema,
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
});

/** Direct HTTP create is deprecated; schema retained for clear validation errors. */
export const createUserBodySchema = z.object({
  type: z.enum(USER_TYPES).default("Internal"),
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Valid email is required"),
  password: z.string().min(8).optional(),
  systemAccessPeriod: z.string().trim().optional(),
});

export const updateUserProfileBodySchema = z
  .object({
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided"
  );

export const changePasswordBodySchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .superRefine((value, ctx) => {
    if (value.newPassword !== value.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }
  });

export const preferencesBodySchema = z
  .object({
    darkMode: z.boolean().optional(),
    activeTheme: z.string().trim().min(1).optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one preference must be provided"
  );

export const systemAccessBodySchema = z.object({
  status: z.enum(["Active", "Blocked"]),
});

export const profileImageBodySchema = z.object({
  url: z.string().trim().url("Valid image URL is required"),
  fileName: z.string().trim().optional(),
  storageKey: z.string().trim().optional(),
});

export const signatureBodySchema = z
  .object({
    url: z.string().trim().url().optional(),
    fileName: z.string().trim().optional(),
    storageKey: z.string().trim().optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one signature field must be provided"
  );

export const addLocationBodySchema = z.object({
  type: z.string().trim().min(1, "Location type is required"),
  address: z.string().trim().min(1, "Address is required"),
});

export const expiredUsersBodySchema = z.object({
  userIds: z
    .array(objectIdSchema)
    .min(1, "At least one user id is required"),
});

export const assignToolkitsBodySchema = z.object({
  toolkitIds: z.array(z.string().trim().min(1)).default([]),
});

export const ownershipTransferBodySchema = z.object({
  destinationUserId: objectIdSchema,
});
