import { z } from "zod";

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id format");

const dateStringSchema = z
  .string()
  .trim()
  .min(1, "Date is required")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date");

function optionalEmptyString() {
  return z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));
}

export const createSupplierFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  accountManager: z.string().trim().min(1, "Account manager is required"),
  accountNumber: z.string().trim().min(1, "Account number is required"),
  email: z.string().trim().email("Valid email is required"),
  serviceProvision: z.string().trim().min(1, "Service provision is required"),
  contractValue: z.coerce.number().nonnegative("Contract value must be ≥ 0"),
  contractStartDate: dateStringSchema,
  businessUnitId: optionalEmptyString().pipe(objectIdSchema.optional()),
  buyerId: optionalEmptyString(),
  contractEndDate: optionalEmptyString().refine(
    (value) => value === undefined || !Number.isNaN(Date.parse(value)),
    "Invalid date"
  ),
  reviewDate: optionalEmptyString().refine(
    (value) => value === undefined || !Number.isNaN(Date.parse(value)),
    "Invalid date"
  ),
});

export type CreateSupplierFormValues = z.infer<typeof createSupplierFormSchema>;

export const updateSupplierFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  accountManager: z.string().trim().min(1, "Account manager is required"),
  accountNumber: z.string().trim().min(1, "Account number is required"),
  email: z.string().trim().email("Valid email is required"),
  serviceProvision: z.string().trim().min(1, "Service provision is required"),
  contractValue: z.coerce.number().nonnegative("Contract value must be ≥ 0"),
  contractStartDate: dateStringSchema,
  buyerId: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  contractEndDate: z.string().trim().optional(),
  reviewDate: z.string().trim().optional(),
});

export type UpdateSupplierFormValues = z.infer<typeof updateSupplierFormSchema>;

export const attachmentFormSchema = z.object({
  fileName: z.string().trim().min(1, "File name is required"),
  url: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
});

export const kpiObjectiveFormSchema = z.object({
  value: z.string().trim().min(1, "KPI objective is required"),
});
