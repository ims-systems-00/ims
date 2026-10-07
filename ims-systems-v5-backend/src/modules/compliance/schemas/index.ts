import { z } from "zod";
import {
  COMPLIANCE_TOOLKIT_NAMES,
  CONTROL_EVIDENCE_TYPES,
  CONTROL_SELECTED_VALUES,
  CONTROL_STATUS_WRITE_STATES,
} from "../types";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id format");

const toolkitNameSchema = z.enum(COMPLIANCE_TOOLKIT_NAMES);

export const provisionToolkitBodySchema = z.object({
  name: toolkitNameSchema,
});

export const toolkitNameParamSchema = z.object({
  name: toolkitNameSchema,
});

export const idParamSchema = z.object({
  id: objectIdSchema,
});

export const controlEvidenceParamsSchema = z.object({
  id: objectIdSchema,
  evidenceId: objectIdSchema,
});

export const attachmentParamsSchema = z.object({
  id: objectIdSchema,
  attachmentId: z.string().trim().min(1),
});

export const listControlsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
  search: z.string().trim().optional(),
  section: z.string().trim().optional(),
  sort: z.enum(["clause", "title", "updatedOn", "createdAt"]).default("clause"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
});

export const updateControlStatusBodySchema = z.object({
  selected: z.enum(CONTROL_SELECTED_VALUES),
  state: z.enum(CONTROL_STATUS_WRITE_STATES),
});

export const updateControlRaciBodySchema = z
  .object({
    responsibleUserId: z.string().trim().min(1).nullable().optional(),
    accountableUserId: z.string().trim().min(1).nullable().optional(),
    consultedUserId: z.string().trim().min(1).nullable().optional(),
    informedUserId: z.string().trim().min(1).nullable().optional(),
    groupId: z.string().trim().min(1).nullable().optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided"
  );

export const listControlEvidenceQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
  evidenceType: z.enum(CONTROL_EVIDENCE_TYPES).optional(),
  sort: z.enum(["createdAt"]).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

const attachmentBodySchema = z.object({
  id: z.string().trim().min(1).optional(),
  fileName: z.string().trim().min(1).max(500),
  mimeType: z.string().trim().max(200).optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  storageKey: z.string().trim().max(1000).optional(),
  url: z.string().trim().max(2000).optional(),
});

export const createControlEvidenceBodySchema = z
  .object({
    evidenceType: z.enum(CONTROL_EVIDENCE_TYPES),
    relatedRiskId: objectIdSchema.optional(),
    relatedIncidentId: objectIdSchema.optional(),
    relatedCipId: objectIdSchema.optional(),
    relatedDocumentId: objectIdSchema.optional(),
    textContent: z.string().trim().max(10_000).optional(),
    fileStorage: attachmentBodySchema.optional(),
    groupId: objectIdSchema.nullable().optional(),
  })
  .superRefine((value, ctx) => {
    switch (value.evidenceType) {
      case "risk-management":
        if (!value.relatedRiskId) {
          ctx.addIssue({
            code: "custom",
            message: "relatedRiskId is required for risk-management evidence",
            path: ["relatedRiskId"],
          });
        }
        break;
      case "incident-management":
        if (!value.relatedIncidentId) {
          ctx.addIssue({
            code: "custom",
            message:
              "relatedIncidentId is required for incident-management evidence",
            path: ["relatedIncidentId"],
          });
        }
        break;
      case "cip":
        if (!value.relatedCipId) {
          ctx.addIssue({
            code: "custom",
            message: "relatedCipId is required for cip evidence",
            path: ["relatedCipId"],
          });
        }
        break;
      case "document-management":
        if (!value.relatedDocumentId) {
          ctx.addIssue({
            code: "custom",
            message:
              "relatedDocumentId is required for document-management evidence",
            path: ["relatedDocumentId"],
          });
        }
        break;
      case "raw-file":
        if (!value.fileStorage) {
          ctx.addIssue({
            code: "custom",
            message: "fileStorage is required for raw-file evidence",
            path: ["fileStorage"],
          });
        }
        break;
      case "text-content":
        if (!value.textContent?.trim()) {
          ctx.addIssue({
            code: "custom",
            message: "textContent is required for text-content evidence",
            path: ["textContent"],
          });
        }
        break;
    }
  });

export const addEmbeddedEvidenceBodySchema = attachmentBodySchema;

export const pickerQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
  search: z.string().trim().optional(),
  name: toolkitNameSchema.optional(),
});

export const listCatalogueControlsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(100),
  search: z.string().trim().optional(),
});
