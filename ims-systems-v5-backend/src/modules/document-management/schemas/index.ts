import { z } from "zod";
import {
  DOCUMENT_APPLICABLE_MODULES,
  DOCUMENT_COMPLIANCE_TOOLS,
  DOCUMENT_NODE_TYPES,
  DOCUMENT_PRIVACY_VALUES,
  DOCUMENT_PURPOSES,
  DOCUMENT_REVIEW_INTERVALS,
  DOCUMENT_STATUSES,
  MAX_DOCUMENT_OWNERS,
  MAX_NODE_NAME_LENGTH,
  MAX_REPO_NAME_LENGTH,
  MAX_REPO_OWNERS,
} from "../types";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id format");

const nullableObjectId = objectIdSchema.nullable().optional();

const fileMetaSchema = z.object({
  Name: z.string().trim().min(1),
  Key: z.string().trim().min(1),
  key: z.string().trim().min(1).optional(),
  Bucket: z.string().trim().min(1),
});

export const createRepositoryBodySchema = z
  .object({
    name: z.string().trim().min(1).max(MAX_REPO_NAME_LENGTH),
    description: z.string().trim().max(4000).optional().nullable(),
    privacy: z.enum(DOCUMENT_PRIVACY_VALUES),
    businessUnitId: nullableObjectId,
    owners: z.array(z.string().trim().min(1)).max(MAX_REPO_OWNERS).default([]),
    sharedWith: z.array(z.string().trim().min(1)).max(100).optional(),
    reviewInterval: z.enum(DOCUMENT_REVIEW_INTERVALS).optional(),
    copyFolderStructureFromId: objectIdSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.privacy === "Business unit" && !value.businessUnitId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["businessUnitId"],
        message: "Business unit is required when privacy is Business unit",
      });
    }
    if (
      value.privacy !== "Only me" &&
      value.privacy !== "Custom" &&
      value.owners.length < 1
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["owners"],
        message: "At least one owner is required",
      });
    }
  });

export const updateRepositoryBodySchema = z
  .object({
    name: z.string().trim().min(1).max(MAX_REPO_NAME_LENGTH).optional(),
    description: z.string().trim().max(4000).nullable().optional(),
    privacy: z.enum(DOCUMENT_PRIVACY_VALUES).optional(),
    businessUnitId: nullableObjectId,
    owners: z.array(z.string().trim().min(1)).max(MAX_REPO_OWNERS).optional(),
    sharedWith: z.array(z.string().trim().min(1)).max(100).optional(),
    reviewInterval: z.enum(DOCUMENT_REVIEW_INTERVALS).optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided"
  );

export const listRepositoriesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
  search: z.string().trim().optional(),
  privacy: z.enum(DOCUMENT_PRIVACY_VALUES).optional(),
  deleted: z
    .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
    .optional()
    .transform((value) => value === true || value === "true" || value === "1"),
  sort: z.enum(["createdOn", "name", "updatedAt"]).default("createdOn"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export const idParamSchema = z.object({
  id: objectIdSchema,
});

export const repoNodeParamsSchema = z.object({
  id: objectIdSchema,
  nodeId: objectIdSchema,
});

export const authorisationParamsSchema = z.object({
  id: objectIdSchema,
  nodeId: objectIdSchema,
  authorisationId: objectIdSchema,
});

export const createFolderBodySchema = z.object({
  name: z.string().trim().min(1).max(MAX_NODE_NAME_LENGTH),
  parentNodeId: nullableObjectId,
  parentNode: nullableObjectId,
  reviewDate: z.string().trim().nullable().optional(),
  data: z
    .object({
      reviewDate: z.string().trim().nullable().optional(),
    })
    .optional(),
});

export const createFileNodesBodySchema = z.object({
  parentNodeId: nullableObjectId,
  parentNode: nullableObjectId,
  data: z
    .array(
      z.object({
        storageInfo: fileMetaSchema,
        purpose: z.enum(DOCUMENT_PURPOSES).optional(),
        owners: z.array(z.string().trim().min(1)).max(MAX_DOCUMENT_OWNERS).optional(),
        authorisation: z.array(z.string().trim().min(1)).max(50).optional(),
        applicableModules: z
          .array(z.enum(DOCUMENT_APPLICABLE_MODULES))
          .optional(),
        complianceTools: z.array(z.enum(DOCUMENT_COMPLIANCE_TOOLS)).optional(),
        reviewDate: z.string().trim().nullable().optional(),
      })
    )
    .min(1)
    .max(50),
});

export const listRepoNodesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
  parentNodeId: z
    .union([objectIdSchema, z.literal("null"), z.literal("")])
    .optional()
    .transform((value) => {
      if (value === undefined || value === "" || value === "null") return null;
      return value;
    }),
  search: z.string().trim().optional(),
  deleted: z
    .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
    .optional()
    .transform((value) => value === true || value === "true" || value === "1"),
  type: z.enum(DOCUMENT_NODE_TYPES).optional(),
  status: z.enum(DOCUMENT_STATUSES).optional(),
  sort: z.enum(["createdOn", "name", "updatedAt"]).default("name"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
});

export const updateFolderBodySchema = z
  .object({
    name: z.string().trim().min(1).max(MAX_NODE_NAME_LENGTH).optional(),
    reviewDate: z.string().trim().nullable().optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided"
  );

export const updateDocumentBodySchema = z
  .object({
    purpose: z.enum(DOCUMENT_PURPOSES).optional(),
    owners: z.array(z.string().trim().min(1)).max(MAX_DOCUMENT_OWNERS).optional(),
    applicableModules: z.array(z.enum(DOCUMENT_APPLICABLE_MODULES)).optional(),
    complianceTools: z.array(z.enum(DOCUMENT_COMPLIANCE_TOOLS)).optional(),
    reviewDate: z.string().trim().nullable().optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided"
  );

export const addVersionBodySchema = z.object({
  parentNodeId: nullableObjectId,
  parentNode: nullableObjectId,
  data: z.object({
    storageInfo: fileMetaSchema,
    owners: z.array(z.string().trim().min(1)).max(MAX_DOCUMENT_OWNERS).optional(),
    authorisation: z.array(z.string().trim().min(1)).max(50).optional(),
  }),
});

export const addRevisionBodySchema = z.object({
  storageInfo: fileMetaSchema,
});

export const moveNodeBodySchema = z.object({
  parentNodeId: nullableObjectId,
  parentNode: nullableObjectId,
});

export const changeRepositoryBodySchema = z.object({
  repositoryId: objectIdSchema.optional(),
  repository: objectIdSchema.optional(),
  parentNodeId: nullableObjectId,
  parentNode: nullableObjectId,
});

export const copyFolderStructureBodySchema = z.object({
  sourceRepoId: objectIdSchema,
});

export const addAuthoriserBodySchema = z.object({
  user: z.string().trim().min(1),
  userId: z.string().trim().min(1).optional(),
});

export const decideAuthorisationBodySchema = z.object({
  status: z.enum(["Approved", "Rejected"]),
  message: z.string().trim().max(2000).optional(),
});

export const listPublishedDocumentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
  search: z.string().trim().optional(),
  purpose: z.enum(DOCUMENT_PURPOSES).optional(),
  applicableModule: z.enum(DOCUMENT_APPLICABLE_MODULES).optional(),
  complianceTool: z.enum(DOCUMENT_COMPLIANCE_TOOLS).optional(),
  sort: z.enum(["createdOn", "name", "updatedAt"]).default("createdOn"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export function normalizeFileMeta(input: {
  Name: string;
  Key: string;
  key?: string;
  Bucket: string;
}): { Name: string; Key: string; key: string; Bucket: string } {
  return {
    Name: input.Name,
    Key: input.Key,
    key: input.key ?? input.Key,
    Bucket: input.Bucket,
  };
}
