import { z } from "zod";
import {
  INVENTORY_CHECK_RESULTS,
  INVENTORY_CRITICALITIES,
  INVENTORY_DISPOSAL_ROUTES,
  INVENTORY_STAGES,
} from "./types";

export const inventoryAssetFormSchema = z.object({
  tag: z
    .string()
    .trim()
    .min(1, "Tag is required")
    .max(40)
    .regex(
      /^[A-Za-z]{2,4}-\d{2,6}$/,
      "Tag must look like ME-0412 (2–4 letters, hyphen, 2–6 digits)"
    ),
  name: z.string().trim().min(1, "Name is required").max(200),
  category: z.string().trim().min(1, "Category is required").max(100),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  custodian: z.string().trim().max(200).optional().or(z.literal("")),
  stage: z.enum(INVENTORY_STAGES).optional(),
  criticality: z.enum(INVENTORY_CRITICALITIES),
  makeModel: z.string().trim().max(200).optional().or(z.literal("")),
  serial: z.string().trim().max(120).optional().or(z.literal("")),
  purchaseDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .nullable()
    .optional()
    .or(z.literal("")),
  cost: z.coerce.number().nonnegative().nullable().optional(),
  supplier: z.string().trim().max(200).optional().or(z.literal("")),
  warrantyEnds: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .nullable()
    .optional()
    .or(z.literal("")),
  informationAsset: z.boolean().optional(),
  safetyNotes: z.string().trim().max(4000).optional().or(z.literal("")),
  labelPrinted: z.boolean().optional(),
});

export type InventoryAssetFormValues = z.infer<typeof inventoryAssetFormSchema>;

export const moveStageFormSchema = z.object({
  stage: z.enum(INVENTORY_STAGES),
  reason: z.string().trim().max(1000).optional().or(z.literal("")),
  approvedBy: z.string().trim().max(200).optional().or(z.literal("")),
  route: z
    .union([z.enum(INVENTORY_DISPOSAL_ROUTES), z.string().trim().max(200)])
    .optional()
    .or(z.literal("")),
  evidence: z.string().trim().max(500).optional().or(z.literal("")),
  wipeCert: z.string().trim().max(500).optional().or(z.literal("")),
});

export type MoveStageFormValues = z.infer<typeof moveStageFormSchema>;

export const recordCheckFormSchema = z.object({
  checkName: z.string().trim().min(1, "Check is required"),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  result: z.enum(INVENTORY_CHECK_RESULTS),
  by: z.string().trim().min(1, "Competent person / lab is required").max(200),
  ref: z.string().trim().max(500).optional().or(z.literal("")),
  fileId: z.string().trim().max(500).nullable().optional().or(z.literal("")),
  note: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type RecordCheckFormValues = z.infer<typeof recordCheckFormSchema>;
