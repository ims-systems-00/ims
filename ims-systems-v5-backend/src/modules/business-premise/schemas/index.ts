import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id format");

export const createBusinessPremiseBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  location: z.string().trim().min(1, "Location is required"),
  address: z.string().trim().min(1, "Address is required"),
  functionalUnitIds: z
    .array(objectIdSchema)
    .min(1, "At least one Functional Unit is required"),
});

export const updateBusinessPremiseBodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    location: z.string().trim().min(1).optional(),
    address: z.string().trim().min(1).optional(),
    functionalUnitIds: z.array(objectIdSchema).min(1).optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided"
  );

export const attachFunctionalUnitBodySchema = z.object({
  functionalUnitId: objectIdSchema,
});

export const listBusinessPremisesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  sort: z
    .enum(["createdOn", "name", "location", "updatedAt", "reference"])
    .default("createdOn"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export const idParamSchema = z.object({
  id: objectIdSchema,
});
