import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Select a valid Functional Unit");

export const businessPremiseFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  location: z.string().trim().min(1, "Location is required"),
  address: z.string().trim().min(1, "Address is required"),
  functionalUnitIds: z
    .array(objectIdSchema)
    .min(1, "At least one Functional Unit is required"),
});

export type BusinessPremiseFormValues = z.infer<
  typeof businessPremiseFormSchema
>;
