import { z } from "zod";
import { ORGANISATION_INDUSTRIES } from "./types";

export const createOrganisationBasicSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters").max(200),
  industry: z.enum(ORGANISATION_INDUSTRIES, {
    message: "Select an industry",
  }),
  sizeOfOrganisation: z.coerce
    .number()
    .int()
    .min(1, "Size must be at least 1"),
  officeEmail: z.string().trim().email("Enter a valid office email"),
  contactNumber: z.string().trim().min(3, "Contact number is required").max(40),
});

export const createOrganisationAddressSchema = z.object({
  line1: z.string().trim().min(1, "Building / line 1 is required"),
  line2: z.string().trim().max(200).optional().default(""),
  city: z.string().trim().min(2, "City is required"),
  county: z.string().trim().min(2, "County / state is required"),
  postCode: z.string().trim().min(2, "Post code is required"),
  countryName: z.string().trim().min(2),
  countryCode: z.string().trim().min(2),
  countryCurrency: z.string().trim().min(3),
  countryPhoneCode: z.coerce.number().int().min(1),
});

export const createOrganisationFormSchema = createOrganisationBasicSchema.and(
  createOrganisationAddressSchema
);

export type CreateOrganisationBasicValues = z.infer<
  typeof createOrganisationBasicSchema
>;
export type CreateOrganisationAddressValues = z.infer<
  typeof createOrganisationAddressSchema
>;
