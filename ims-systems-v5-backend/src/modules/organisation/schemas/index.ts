import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Must be a valid id");

export const createOrganisationBodySchema = z.object({
  name: z.string().trim().min(3).max(200),
  industry: z.string().trim().min(1).max(120),
  sizeOfOrganisation: z.coerce.number().int().min(1).max(1_000_000),
  officeEmail: z.string().trim().email().max(320),
  contactNumber: z.string().trim().min(3).max(40),
  companyNumber: z.string().trim().max(80).optional().default(""),
  vatNumber: z.string().trim().max(80).optional().default(""),
  address: z.object({
    line1: z.string().trim().min(1).max(200),
    line2: z.string().trim().max(200).optional().default(""),
    city: z.string().trim().min(2).max(120),
    county: z.string().trim().min(2).max(120),
    postCode: z.string().trim().min(2).max(40),
  }),
  country: z.object({
    name: z.string().trim().min(2).max(120),
    code: z.string().trim().min(2).max(8),
    currency: z.string().trim().min(3).max(8),
    phoneCode: z.coerce.number().int().min(1).max(9999),
  }),
  referralSource: z
    .union([objectIdSchema, z.null()])
    .optional()
    .default(null),
});

export const organisationIdParamSchema = z.object({
  id: objectIdSchema,
});
