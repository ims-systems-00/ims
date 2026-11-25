import { z } from "zod";
import {
  INVENTORY_CHECK_RESULTS,
  INVENTORY_CRITICALITIES,
  INVENTORY_DISPOSAL_ROUTES,
  INVENTORY_STAGES,
  STOCK_MOVE_TYPES,
} from "../types";

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, "Invalid id");

export const idParamSchema = z.object({ id: objectIdSchema });

export const publicScanParamSchema = z.object({
  organizationId: z.string().trim().min(1),
  tag: z.string().trim().min(1).max(40),
});

const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .nullable()
  .optional()
  .or(z.literal(""));

const boolQuery = z
  .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
  .optional()
  .transform((v) =>
    v === undefined ? undefined : v === true || v === "true" || v === "1"
  );

export const listInventoryAssetsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  stage: z.enum(INVENTORY_STAGES).optional(),
  site: z.string().trim().optional(),
  issue: boolQuery,
  includeDisposed: boolQuery,
});

export const listScheduleQuerySchema = z.object({
  due: z.enum(["over", "soon", ""]).optional(),
  checkType: z.string().trim().optional(),
});

export const createInventoryAssetBodySchema = z.object({
  tag: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(100),
  location: z.string().trim().max(200).optional(),
  custodian: z.string().trim().max(200).optional(),
  stage: z.enum(INVENTORY_STAGES).optional(),
  criticality: z.enum(INVENTORY_CRITICALITIES).optional(),
  makeModel: z.string().trim().max(200).optional(),
  serial: z.string().trim().max(120).optional(),
  purchaseDate: isoDateSchema,
  cost: z.number().nonnegative().nullable().optional(),
  supplier: z.string().trim().max(200).optional(),
  warrantyEnds: isoDateSchema,
  informationAsset: z.boolean().optional(),
  safetyNotes: z.string().trim().max(4000).optional(),
  labelPrinted: z.boolean().optional(),
});

export const updateInventoryAssetBodySchema =
  createInventoryAssetBodySchema.partial();

export const moveStageBodySchema = z.object({
  stage: z.enum(INVENTORY_STAGES),
  reason: z.string().trim().max(1000).optional(),
  approvedBy: z.string().trim().max(200).optional(),
  route: z
    .union([z.enum(INVENTORY_DISPOSAL_ROUTES), z.string().trim().max(200)])
    .optional(),
  evidence: z.string().trim().max(500).optional(),
  wipeCert: z.string().trim().max(500).optional(),
});

export const recordCheckBodySchema = z.object({
  checkName: z.string().trim().min(1).max(120),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  result: z.enum(INVENTORY_CHECK_RESULTS),
  by: z.string().trim().min(1).max(200),
  ref: z.string().trim().max(500).optional(),
  fileId: z.string().trim().max(500).nullable().optional(),
  note: z.string().trim().max(2000).optional(),
});

export const reportFaultBodySchema = z.object({
  note: z.string().trim().min(1).max(2000),
});

export const moveLocationBodySchema = z.object({
  location: z.string().trim().min(1).max(200),
});

export const confirmSightingBodySchema = z.object({
  note: z.string().trim().max(2000).optional(),
});

export const recordEachUseBodySchema = z.object({
  checkName: z.string().trim().min(1).max(120),
  note: z.string().trim().max(2000).optional(),
});

export const markLabelledBodySchema = z.object({
  ids: z.array(objectIdSchema).min(1).max(500),
});

export const updateInventorySettingsBodySchema = z.object({
  leadDays: z.number().int().min(1).max(365).optional(),
  requireLoginForScanActions: z.boolean().optional(),
  scanBase: z.string().trim().url().nullable().optional().or(z.literal("")),
  categoryOverrides: z
    .record(
      z.string(),
      z.array(
        z.object({
          name: z.string().trim().min(1).max(120),
          intervalMonths: z.number().int().min(0).max(120),
          basis: z.string().trim().max(500),
          requiresCompetence: z.boolean().optional(),
        })
      )
    )
    .optional(),
  competentPersons: z.array(z.string().trim().min(1).max(200)).max(200).optional(),
});

export const createStockBodySchema = z.object({
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(200),
  location: z.string().trim().max(200).optional(),
  qty: z.number().nonnegative().optional(),
  min: z.number().nonnegative().optional(),
  max: z.number().nonnegative().optional(),
  batch: z.string().trim().max(120).optional(),
  expiry: isoDateSchema,
});

export const updateStockBodySchema = createStockBodySchema.partial();

export const stockMoveBodySchema = z.object({
  type: z.enum(STOCK_MOVE_TYPES),
  qty: z.number().nonnegative(),
  batch: z.string().trim().max(120).optional(),
  expiry: isoDateSchema,
  ref: z.string().trim().max(500).optional(),
});
