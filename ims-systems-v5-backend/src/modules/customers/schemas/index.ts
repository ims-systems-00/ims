import { z } from "zod";
import {
  CUSTOMER_PROBABILITIES,
  CUSTOMER_STAGES,
  CUSTOMER_STATUSES,
} from "../types";

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

const logoInputSchema = z.object({
  fileName: z.string().trim().optional(),
  storageKey: z.string().trim().optional(),
  url: z.string().trim().url().optional().or(z.literal("")),
  src: z.string().trim().url().optional().or(z.literal("")),
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

const stageSchema = z.enum(CUSTOMER_STAGES);
const statusSchema = z.enum(CUSTOMER_STATUSES);
const probabilitySchema = z
  .number()
  .refine(
    (value) =>
      (CUSTOMER_PROBABILITIES as readonly number[]).includes(value),
    "Probability must be 10–90 in steps of 10"
  );

export const createCustomerBodySchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    primaryEmail: z.string().trim().email("Valid primary email is required"),
    businessUnitId: objectIdSchema.optional(),
    categoryId: objectIdSchema.optional(),
    companyNumber: z.string().trim().optional(),
    stage: stageSchema.optional(),
    status: statusSchema.optional(),
    probability: probabilitySchema.optional(),
    source: z.string().trim().optional(),
    phoneNumber: z.string().trim().optional(),
    buildingName: z.string().trim().optional(),
    streetName: z.string().trim().optional(),
    town: z.string().trim().optional(),
    postCode: z.string().trim().optional(),
    primaryContact: z.string().trim().optional(),
    secondaryContact: z.string().trim().optional(),
    secondaryEmail: z
      .string()
      .trim()
      .email()
      .optional()
      .or(z.literal("")),
    serviceProvision: z.string().trim().optional(),
    contractValue: z.coerce.number().nonnegative().optional(),
    accountManager: subjectIdSchema.optional(),
    accountNumber: z.string().trim().optional(),
    contractStartDate: dateInputSchema.nullable().optional(),
    contractEndDate: dateInputSchema.nullable().optional(),
    reviewDate: dateInputSchema.nullable().optional(),
    notes: z.string().trim().optional(),
    reasonForLoss: z.string().trim().optional(),
    isChampion: z.boolean().optional(),
    logo: logoInputSchema.optional(),
    attachments: z.array(attachmentInputSchema).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.secondaryContact?.trim() && !value.secondaryEmail?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["secondaryEmail"],
        message: "Secondary email is required when secondary contact is set",
      });
    }
    const stage = value.stage ?? "Prospect";
    if (stage === "Live") {
      if (!value.contractStartDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["contractStartDate"],
          message: "Contract start date is required for Live customers",
        });
      }
      if (!value.contractEndDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["contractEndDate"],
          message: "Contract end date is required for Live customers",
        });
      }
      if (!value.reviewDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["reviewDate"],
          message: "Review date is required for Live customers",
        });
      }
    }
    const status = value.status ?? "Open";
    if (status === "Lost" && !value.reasonForLoss?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reasonForLoss"],
        message: "Reason for loss is required when status is Lost",
      });
    }
  });

export const updateCustomerBodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    primaryEmail: z.string().trim().email().optional(),
    businessUnitId: objectIdSchema.nullable().optional(),
    categoryId: objectIdSchema.nullable().optional(),
    companyNumber: z.string().trim().nullable().optional(),
    stage: stageSchema.optional(),
    status: statusSchema.optional(),
    probability: probabilitySchema.optional(),
    source: z.string().trim().nullable().optional(),
    phoneNumber: z.string().trim().nullable().optional(),
    buildingName: z.string().trim().nullable().optional(),
    streetName: z.string().trim().nullable().optional(),
    town: z.string().trim().nullable().optional(),
    postCode: z.string().trim().nullable().optional(),
    primaryContact: z.string().trim().nullable().optional(),
    secondaryContact: z.string().trim().nullable().optional(),
    secondaryEmail: z
      .string()
      .trim()
      .email()
      .nullable()
      .optional()
      .or(z.literal("")),
    serviceProvision: z.string().trim().nullable().optional(),
    contractValue: z.coerce.number().nonnegative().optional(),
    accountManager: subjectIdSchema.nullable().optional(),
    accountNumber: z.string().trim().nullable().optional(),
    contractStartDate: dateInputSchema.nullable().optional(),
    contractEndDate: dateInputSchema.nullable().optional(),
    reviewDate: dateInputSchema.nullable().optional(),
    notes: z.string().trim().nullable().optional(),
    reasonForLoss: z.string().trim().nullable().optional(),
    isChampion: z.boolean().optional(),
    logo: logoInputSchema.nullable().optional(),
    attachments: z.array(attachmentInputSchema).optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided"
  );

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  stages: csvList.pipe(z.array(stageSchema).optional()),
  statuses: csvList.pipe(z.array(statusSchema).optional()),
  businessUnitIds: csvList.pipe(z.array(objectIdSchema).optional()),
  accountManagerIds: csvList.pipe(z.array(subjectIdSchema).optional()),
  categoryIds: csvList.pipe(z.array(objectIdSchema).optional()),
  myCustomers: booleanQuery,
  sort: z
    .enum([
      "createdOn",
      "updatedAt",
      "name",
      "reference",
      "stage",
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

export const attachmentIdParamSchema = z.object({
  id: objectIdSchema,
  attachmentId: z.string().trim().min(1),
});

export const managerIdParamSchema = z.object({
  managerId: subjectIdSchema,
});
