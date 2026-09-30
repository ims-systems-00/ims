import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id format");

const subjectIdSchema = z.string().trim().min(1, "Invalid user id");

const attachmentInputSchema = z.object({
  fileName: z.string().trim().min(1, "fileName is required"),
  mimeType: z.string().trim().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  storageKey: z.string().trim().optional(),
  url: z.string().trim().url().optional().or(z.literal("")),
});

const dateInputSchema = z.coerce.date();

const csvList = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    const parts = Array.isArray(value)
      ? value
      : value.split(",").map((part) => part.trim());
    return parts.filter((part) => part.length > 0);
  });

const booleanQuery = z
  .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (typeof value === "boolean") return value;
    return value === "true" || value === "1";
  });

export const createSupplierBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  accountManager: z.string().trim().min(1, "Account manager is required"),
  accountNumber: z.string().trim().min(1, "Account number is required"),
  email: z.string().trim().email("Valid email is required"),
  serviceProvision: z.string().trim().min(1, "Service provision is required"),
  contractValue: z.coerce.number().nonnegative("Contract value must be ≥ 0"),
  contractStartDate: dateInputSchema,
  businessUnitId: objectIdSchema.optional(),
  buyerId: subjectIdSchema.optional(),
  contractEndDate: dateInputSchema.nullable().optional(),
  reviewDate: dateInputSchema.nullable().optional(),
  slaFiles: z.array(attachmentInputSchema).optional(),
  contractFiles: z.array(attachmentInputSchema).optional(),
  onboardingFiles: z.array(attachmentInputSchema).optional(),
});

export const updateSupplierBodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    accountManager: z.string().trim().min(1).optional(),
    accountNumber: z.string().trim().min(1).optional(),
    email: z.string().trim().email().optional(),
    serviceProvision: z.string().trim().min(1).optional(),
    contractValue: z.coerce.number().nonnegative().optional(),
    contractStartDate: dateInputSchema.optional(),
    buyerId: subjectIdSchema.nullable().optional(),
    contractEndDate: dateInputSchema.nullable().optional(),
    reviewDate: dateInputSchema.nullable().optional(),
    slaFiles: z.array(attachmentInputSchema).optional(),
    contractFiles: z.array(attachmentInputSchema).optional(),
    onboardingFiles: z.array(attachmentInputSchema).optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided"
  );

export const listSuppliersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  businessUnitIds: csvList.pipe(z.array(objectIdSchema).optional()),
  createdByIds: csvList.pipe(z.array(subjectIdSchema).optional()),
  buyerIds: csvList.pipe(z.array(subjectIdSchema).optional()),
  isCompliant: booleanQuery,
  sort: z
    .enum([
      "createdOn",
      "name",
      "updatedAt",
      "reference",
      "contractValue",
      "contractEndDate",
      "reviewDate",
    ])
    .default("createdOn"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export const idParamSchema = z.object({
  id: objectIdSchema,
});

export const fileIdParamSchema = z.object({
  id: objectIdSchema,
  fileId: z.string().trim().min(1),
});

export const kpiIdParamSchema = z.object({
  id: objectIdSchema,
  kpiId: z.string().trim().min(1),
});

export const addAttachmentsBodySchema = z.object({
  files: z.array(attachmentInputSchema).min(1, "At least one file is required"),
});

export const addKpiObjectiveBodySchema = z.object({
  value: z.string().trim().min(1, "KPI objective value is required"),
});
