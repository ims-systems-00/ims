import { z } from "zod";
import {
  ACCESS_TYPES,
  isBusinessAccessType,
  isComplianceAccessType,
} from "../types";

export const accessTypeSchema = z.enum(ACCESS_TYPES);

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id format");

export const createFunctionalUnitBodySchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    accessType: accessTypeSchema,
    responsibility: z.string().trim().min(1, "Responsibility is required"),
    operatingLocation: z.string().trim().optional(),
    standards: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (isBusinessAccessType(value.accessType)) {
      if (!value.operatingLocation || value.operatingLocation.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["operatingLocation"],
          message: "Operating location is required for business function types",
        });
      }
    }
    if (isComplianceAccessType(value.accessType)) {
      if (!value.standards || value.standards.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["standards"],
          message: "Standards are required for compliance function types",
        });
      }
    }
  });

export const updateFunctionalUnitBodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    responsibility: z.string().trim().min(1).optional(),
    operatingLocation: z.string().trim().optional(),
    standards: z.string().trim().optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided"
  );

export const listFunctionalUnitsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  accessType: accessTypeSchema.optional(),
});

export const idParamSchema = z.object({
  id: objectIdSchema,
});

export const attachPolicyBodySchema = z.object({
  policyId: z.string().trim().min(1, "policyId is required"),
});

export const assignToolkitsBodySchema = z.object({
  complianceToolkits: z.array(z.string().trim().min(1)).default([]),
});

export const memberIdParamSchema = z.object({
  id: objectIdSchema,
  userId: objectIdSchema,
});

export const addMembersBodySchema = z.object({
  userIds: z
    .array(objectIdSchema)
    .min(1, "At least one user id is required"),
});

export const eligibleMembersQuerySchema = z.object({
  search: z.string().trim().optional(),
});
