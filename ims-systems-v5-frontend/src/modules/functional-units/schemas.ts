import { z } from "zod";
import { isBusinessAccessType, isComplianceAccessType, type AccessType } from "./types";

export const accessTypeSchema = z.enum([
  "Internal business function",
  "External function",
  "Internal compliance function",
  "External compliance function",
]);

export const functionalUnitFormSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    accessType: accessTypeSchema,
    responsibility: z.string().trim().min(1, "Responsibility is required"),
    operatingLocation: z.string().trim().optional(),
    standards: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (isBusinessAccessType(value.accessType as AccessType)) {
      if (!value.operatingLocation) {
        ctx.addIssue({
          code: "custom",
          path: ["operatingLocation"],
          message: "Operating location is required",
        });
      }
    }
    if (isComplianceAccessType(value.accessType as AccessType)) {
      if (!value.standards) {
        ctx.addIssue({
          code: "custom",
          path: ["standards"],
          message: "Standards are required",
        });
      }
    }
  });

export type FunctionalUnitFormValues = z.infer<typeof functionalUnitFormSchema>;
