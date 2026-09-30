import { z } from "zod";
import {
  CUSTOMER_PROBABILITIES,
  CUSTOMER_STAGES,
  CUSTOMER_STATUSES,
} from "./types";

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id format");

const optionalObjectId = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))
  .pipe(objectIdSchema.optional());

const optionalSubjectId = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))
  .refine(
    (value) => value === undefined || !Number.isNaN(Date.parse(value)),
    "Invalid date"
  );

const probabilitySchema = z.coerce
  .number()
  .refine(
    (value) =>
      (CUSTOMER_PROBABILITIES as readonly number[]).includes(value),
    "Probability must be 10–90 in steps of 10"
  );

const stageSchema = z.enum(CUSTOMER_STAGES);
const statusSchema = z.enum(CUSTOMER_STATUSES);

const baseCustomerFields = {
  name: z.string().trim().min(1, "Organisation name is required"),
  primaryEmail: z.string().trim().email("Valid primary email is required"),
  businessUnitId: optionalObjectId,
  companyNumber: z.string().trim().optional(),
  stage: stageSchema.default("Prospect"),
  status: statusSchema.default("Open"),
  probability: probabilitySchema.default(10),
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
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined))
    .refine(
      (value) => value === undefined || z.string().email().safeParse(value).success,
      "Valid secondary email is required"
    ),
  serviceProvision: z.string().trim().optional(),
  contractValue: z.coerce.number().nonnegative("Contract value must be ≥ 0"),
  accountManager: optionalSubjectId,
  accountNumber: z.string().trim().optional(),
  contractStartDate: optionalDate,
  contractEndDate: optionalDate,
  reviewDate: optionalDate,
  notes: z.string().trim().optional(),
  reasonForLoss: z.string().trim().optional(),
};

function refineCustomerRules(
  value: {
    stage: string;
    status: string;
    secondaryContact?: string;
    secondaryEmail?: string;
    contractStartDate?: string;
    contractEndDate?: string;
    reviewDate?: string;
    reasonForLoss?: string;
  },
  ctx: z.RefinementCtx
) {
  if (value.secondaryContact?.trim() && !value.secondaryEmail?.trim()) {
    ctx.addIssue({
      code: "custom",
      path: ["secondaryEmail"],
      message: "Secondary email is required when secondary contact is set",
    });
  }
  if (value.stage === "Live") {
    if (!value.contractStartDate) {
      ctx.addIssue({
        code: "custom",
        path: ["contractStartDate"],
        message: "Contract start date is required for Live customers",
      });
    }
    if (!value.contractEndDate) {
      ctx.addIssue({
        code: "custom",
        path: ["contractEndDate"],
        message: "Contract end date is required for Live customers",
      });
    }
    if (!value.reviewDate) {
      ctx.addIssue({
        code: "custom",
        path: ["reviewDate"],
        message: "Review date is required for Live customers",
      });
    }
  }
  if (value.status === "Lost" && !value.reasonForLoss?.trim()) {
    ctx.addIssue({
      code: "custom",
      path: ["reasonForLoss"],
      message: "Reason for loss is required when status is Lost",
    });
  }
}

export const createCustomerFormSchema = z
  .object(baseCustomerFields)
  .superRefine(refineCustomerRules);

export type CreateCustomerFormValues = z.infer<typeof createCustomerFormSchema>;

export const updateCustomerFormSchema = z
  .object({
    ...baseCustomerFields,
    accountManager: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
    businessUnitId: z
      .string()
      .trim()
      .optional()
      .transform((value) => {
        if (!value || value.length === 0) return null;
        return value;
      })
      .refine(
        (value) =>
          value === null || /^[a-fA-F0-9]{24}$/.test(value),
        "Invalid id format"
      ),
  })
  .superRefine(refineCustomerRules);

export type UpdateCustomerFormValues = z.infer<typeof updateCustomerFormSchema>;

export const attachmentFormSchema = z.object({
  fileName: z.string().trim().min(1, "File name is required"),
  url: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
});
