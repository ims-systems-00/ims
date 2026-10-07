import { z } from "zod";
import {
  DOCUMENT_PRIVACY_VALUES,
  DOCUMENT_PURPOSES,
  DOCUMENT_REVIEW_INTERVALS,
  DOCUMENT_APPLICABLE_MODULES,
} from "./types";

export const createRepositoryFormSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200),
    description: z.string().trim().max(4000).optional(),
    privacy: z.enum(DOCUMENT_PRIVACY_VALUES),
    businessUnitId: z.string().trim().optional().nullable(),
    owners: z.array(z.string().trim().min(1)).min(1).max(3),
    sharedWith: z.array(z.string().trim().min(1)).max(100).optional(),
    reviewInterval: z.enum(DOCUMENT_REVIEW_INTERVALS).default("Yearly"),
  })
  .superRefine((value, ctx) => {
    if (value.privacy === "Business unit" && !value.businessUnitId) {
      ctx.addIssue({
        code: "custom",
        path: ["businessUnitId"],
        message: "Business unit is required for Business unit privacy",
      });
    }
    if (value.owners.length < 1) {
      ctx.addIssue({
        code: "custom",
        path: ["owners"],
        message: "Select at least one owner",
      });
    }
  });

export const createFolderFormSchema = z.object({
  name: z.string().trim().min(1, "Folder name is required").max(255),
});

export const uploadDocumentFormSchema = z.object({
  purpose: z.enum(DOCUMENT_PURPOSES).default("Document"),
  applicableModules: z.array(z.enum(DOCUMENT_APPLICABLE_MODULES)).default([]),
  requireAuthorisation: z.boolean().default(false),
});
