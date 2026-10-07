import { z } from "zod";
import {
  CONTROL_EVIDENCE_TYPES,
  CONTROL_SELECTED_VALUES,
  CONTROL_STATUS_WRITE_STATES,
} from "./types";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id format");

export const updateControlStatusSchema = z
  .object({
    selected: z.enum(CONTROL_SELECTED_VALUES),
    state: z.enum(CONTROL_STATUS_WRITE_STATES),
  })
  .superRefine((value, ctx) => {
    if (value.selected === "Not selected" && value.state !== "Not implemented") {
      ctx.addIssue({
        code: "custom",
        message: "Select the control before marking it implemented",
        path: ["state"],
      });
    }
  });

export type UpdateControlStatusFormValues = z.infer<
  typeof updateControlStatusSchema
>;

export const createControlEvidenceSchema = z
  .object({
    evidenceType: z.enum(CONTROL_EVIDENCE_TYPES),
    relatedRiskId: objectIdSchema.optional().or(z.literal("")),
    relatedIncidentId: objectIdSchema.optional().or(z.literal("")),
    relatedCipId: objectIdSchema.optional().or(z.literal("")),
    relatedDocumentId: objectIdSchema.optional().or(z.literal("")),
    textContent: z.string().trim().max(10_000).optional(),
    fileName: z.string().trim().max(500).optional(),
    fileUrl: z.string().trim().max(2000).optional(),
  })
  .superRefine((value, ctx) => {
    switch (value.evidenceType) {
      case "risk-management":
        if (!value.relatedRiskId) {
          ctx.addIssue({
            code: "custom",
            message: "Select a risk",
            path: ["relatedRiskId"],
          });
        }
        break;
      case "incident-management":
        if (!value.relatedIncidentId) {
          ctx.addIssue({
            code: "custom",
            message: "Select an incident",
            path: ["relatedIncidentId"],
          });
        }
        break;
      case "cip":
        if (!value.relatedCipId) {
          ctx.addIssue({
            code: "custom",
            message: "Select an OFI / CIP",
            path: ["relatedCipId"],
          });
        }
        break;
      case "document-management":
        ctx.addIssue({
          code: "custom",
          message: "Document Management is not available yet",
          path: ["evidenceType"],
        });
        break;
      case "raw-file":
        if (!value.fileName?.trim()) {
          ctx.addIssue({
            code: "custom",
            message: "File name is required",
            path: ["fileName"],
          });
        }
        break;
      case "text-content":
        if (!value.textContent?.trim()) {
          ctx.addIssue({
            code: "custom",
            message: "Evidence text is required",
            path: ["textContent"],
          });
        }
        break;
    }
  });

export type CreateControlEvidenceFormValues = z.infer<
  typeof createControlEvidenceSchema
>;

export const addEmbeddedEvidenceSchema = z.object({
  fileName: z.string().trim().min(1, "File name is required").max(500),
  mimeType: z.string().trim().max(200).optional(),
  url: z.string().trim().max(2000).optional(),
});

export type AddEmbeddedEvidenceFormValues = z.infer<
  typeof addEmbeddedEvidenceSchema
>;
