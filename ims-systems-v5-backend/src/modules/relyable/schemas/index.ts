import { z } from "zod";
import {
  RELYABLE_EVIDENCE_STATUSES,
  RELYABLE_FAMILIES,
  RELYABLE_SIZE_BANDS,
} from "../types";

const attrFlag = z.union([z.literal(0), z.literal(1)]);

export const updateSettingsBodySchema = z.object({
  companyNumber: z.string().trim().min(1).max(32).nullable().optional(),
  legalName: z.string().trim().min(1).max(200).nullable().optional(),
  sic: z.array(z.string().trim().min(1).max(16)).max(20).optional(),
  employees: z.number().int().min(0).max(1_000_000).nullable().optional(),
  facts: z
    .object({
      accountsOverdue: z.boolean().optional(),
      insolvency: z.boolean().optional(),
      enforcement: z.boolean().optional(),
      disqualifiedDirector: z.boolean().optional(),
      riddorOpen: z.boolean().optional(),
    })
    .optional(),
  listedCertifications: z
    .array(z.string().trim().min(1).max(80))
    .max(50)
    .optional(),
  enabled: z.boolean().optional(),
});

export const updateScopeBodySchema = z.object({
  family: z.enum(RELYABLE_FAMILIES).optional(),
  sizeBand: z.enum(RELYABLE_SIZE_BANDS).optional(),
  attrs: z
    .object({
      employs: attrFlag.optional(),
      sites: attrFlag.optional(),
      premises: attrFlag.optional(),
      contractor: attrFlag.optional(),
      vehicles: attrFlag.optional(),
      lifting: attrFlag.optional(),
      food: attrFlag.optional(),
      regulated: attrFlag.optional(),
      data: attrFlag.optional(),
    })
    .optional(),
  confirmed: z.boolean().optional(),
});

export const emitEvidenceBodySchema = z.object({
  type: z.string().trim().min(1).max(80),
  subject: z
    .object({
      kind: z.string().trim().min(1).max(40),
      id: z.string().trim().min(1).max(120),
    })
    .nullable()
    .optional(),
  status: z.enum(RELYABLE_EVIDENCE_STATUSES),
  observedAt: z.string().trim().min(4).max(40),
  validUntil: z.string().trim().min(4).max(40).nullable().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  level: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
  ]),
  source: z.string().trim().min(1).max(120).optional(),
  disputed: z.boolean().optional(),
});

export const emitBatchBodySchema = z.object({
  items: z.array(emitEvidenceBodySchema).min(1).max(500),
});

export const listEvidenceQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).optional(),
});
