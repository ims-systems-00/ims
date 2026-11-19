import { z } from "zod";
import {
  ASL_CATEGORIES,
  ASL_CRITICALITIES,
  ASL_DOC_TYPES,
  ASL_STATUSES,
} from "../types";

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, "Invalid id");

export const idParamSchema = z.object({ id: objectIdSchema });
export const docIdParamSchema = z.object({
  id: objectIdSchema,
  docId: z.string().trim().min(1),
});
export const tokenParamSchema = z.object({
  token: z.string().trim().min(10),
});

export const listAslSuppliersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  crit: z.enum(ASL_CRITICALITIES).optional(),
  status: z.enum(ASL_STATUSES).optional(),
  issue: z
    .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
    .optional()
    .transform((v) =>
      v === undefined ? undefined : v === true || v === "true" || v === "1"
    ),
  includeRemoved: z
    .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
    .optional()
    .transform((v) =>
      v === undefined ? undefined : v === true || v === "true" || v === "1"
    ),
});

export const createAslSupplierBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  cat: z.string().trim().min(1).max(100).optional(),
  crit: z.enum(ASL_CRITICALITIES).optional(),
  contact: z.string().trim().max(200).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  stds: z.array(z.string().trim().min(1)).max(20).optional(),
  scope: z.string().trim().max(4000).optional(),
  reqs: z.string().trim().max(4000).optional(),
});

export const updateAslSupplierBodySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  cat: z.string().trim().min(1).max(100).optional(),
  crit: z.enum(ASL_CRITICALITIES).optional(),
  status: z.enum(ASL_STATUSES).optional(),
  contact: z.string().trim().max(200).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  stds: z.array(z.string().trim().min(1)).max(20).optional(),
  scope: z.string().trim().max(4000).optional(),
  reqs: z.string().trim().max(4000).optional(),
  appby: z.string().trim().max(200).optional(),
  appon: z.string().trim().nullable().optional(),
});

const fileMetaSchema = z.object({
  Name: z.string().trim().min(1),
  Key: z.string().trim().min(1),
  key: z.string().trim().optional(),
  Bucket: z.string().trim().min(1),
  Size: z.number().nonnegative().optional(),
});

export const upsertAslDocumentBodySchema = z.object({
  type: z.string().trim().min(1).max(200),
  exp: z.string().trim().nullable().optional(),
  ref: z.string().trim().max(500).optional(),
  req: z.boolean().optional(),
  storageInfo: fileMetaSchema.nullable().optional(),
});

export const createAslEvaluationBodySchema = z.object({
  scores: z.record(z.string(), z.number().int().min(1).max(5)),
  note: z.string().trim().max(4000).optional(),
});

export const notifyAslBodySchema = z.object({
  ids: z.array(objectIdSchema).min(1).max(100),
});

export const updateAslSettingsBodySchema = z.object({
  lead: z.number().int().min(1).max(365).optional(),
  follow: z.number().int().min(1).max(365).optional(),
  esc: z.number().int().min(1).max(365).optional(),
  from: z.string().trim().email().optional(),
  interval: z
    .object({
      Critical: z.number().int().min(1).max(60).optional(),
      High: z.number().int().min(1).max(60).optional(),
      Standard: z.number().int().min(1).max(60).optional(),
    })
    .optional(),
  criteria: z
    .array(
      z.object({
        k: z.string().trim().min(1).max(40),
        n: z.string().trim().min(1).max(200),
        w: z.number().int().min(0).max(100),
      })
    )
    .min(1)
    .max(20)
    .optional(),
});

export const shareAslBodySchema = z.object({
  expiresInDays: z.number().int().min(1).max(90).default(30),
});

export const publicUploadBodySchema = z.object({
  type: z.string().trim().min(1).max(200).optional(),
  exp: z.string().trim().nullable().optional(),
  ref: z.string().trim().max(500).optional(),
  storageInfo: fileMetaSchema,
});

export const preparePublicUploadBodySchema = z.object({
  fileName: z.string().trim().min(1).max(500),
  contentType: z.string().trim().max(200).optional(),
  fileSize: z.number().int().nonnegative().optional(),
});

export const auditorPackQuerySchema = z.object({
  format: z.enum(["html", "pdf"]).default("html"),
});

export const ASL_CATEGORY_VALUES = ASL_CATEGORIES;
export const ASL_DOC_TYPE_VALUES = ASL_DOC_TYPES;
