import { z } from "zod";
import { CAMPAIGN_STATUSES, CUSTOMER_STAGES } from "../types";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id format");

const attachmentInputSchema = z.object({
  fileName: z.string().trim().min(1, "fileName is required"),
  mimeType: z.string().trim().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  storageKey: z.string().trim().optional(),
  url: z.string().trim().url().optional().or(z.literal("")),
});

const customAudienceSchema = z.object({
  customerId: objectIdSchema,
  name: z.string().trim().min(1),
  reference: z.string().trim().min(1),
});

const stageSchema = z.enum(CUSTOMER_STAGES);
const statusSchema = z.enum(CAMPAIGN_STATUSES);

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

function assertAudience(
  value: { target?: string[]; customAudience?: unknown[] },
  ctx: z.RefinementCtx
): void {
  const hasTarget = (value.target?.length ?? 0) > 0;
  const hasCustom = (value.customAudience?.length ?? 0) > 0;
  if (!hasTarget && !hasCustom) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["target"],
      message:
        "Select at least one target audience stage or additional customer",
    });
  }
}

export const createEmailCampaignBodySchema = z
  .object({
    name: z.string().trim().min(1, "Campaign name is required"),
    businessUnitId: objectIdSchema,
    target: z.array(stageSchema).optional(),
    customAudience: z.array(customAudienceSchema).optional(),
    subject: z.string().trim().min(1, "Subject is required"),
    message: z.string().trim().min(1, "Message is required"),
    attachments: z.array(attachmentInputSchema).optional(),
    bundleId: z.string().uuid().optional(),
  })
  .superRefine(assertAudience);

export const updateEmailCampaignBodySchema = z.object({
  businessUnitId: objectIdSchema.optional(),
  target: z.array(stageSchema).optional(),
  customAudience: z.array(customAudienceSchema).optional(),
  subject: z.string().trim().min(1).optional(),
  message: z.string().trim().min(1).optional(),
  attachments: z.array(attachmentInputSchema).optional(),
});

export const listEmailCampaignsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional(),
  statuses: csvList.pipe(z.array(statusSchema).optional()),
  businessUnitIds: csvList.pipe(z.array(objectIdSchema).optional()),
  closed: booleanQuery,
  sort: z
    .enum(["createdOn", "updatedAt", "reference", "status", "launchedAt"])
    .optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});

export const idParamSchema = z.object({
  id: objectIdSchema,
});

export const attachmentIdParamSchema = z.object({
  id: objectIdSchema,
  attachmentId: z.string().trim().min(1),
});

export const listDeliveriesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(10),
});
