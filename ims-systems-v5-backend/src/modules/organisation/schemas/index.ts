import { z } from "zod";
import {
  DOCUMENT_REVIEW_REMINDER_OFFSETS,
  ORGANISATION_PAYMENT_TYPES,
} from "../types";

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
  logoSrc: z
    .union([z.string().trim().url().max(2000), z.null()])
    .optional()
    .default(null),
});

export const goLiveOrganisationBodySchema = z.object({
  paymentType: z.enum(ORGANISATION_PAYMENT_TYPES),
  superUser: z.coerce.number().int().min(1).max(10_000),
  users: z.coerce.number().int().min(0).max(100_000),
  groups: z.coerce.number().int().min(0).max(10_000),
  complianceTools: z.array(z.string().trim().min(1).max(120)).optional().default([]),
  additionalModules: z
    .array(z.string().trim().min(1).max(120))
    .optional()
    .default([]),
  carbocalc: z.boolean().optional().default(false),
  imsforms: z.boolean().optional().default(false),
  projectims: z.boolean().optional().default(false),
});

export const organisationIdParamSchema = z.object({
  id: objectIdSchema,
});

export const requestOrganisationLicenceBodySchema = z
  .object({
    superUser: z.coerce.number().int().min(0).max(10_000).optional().default(0),
    users: z.coerce.number().int().min(0).max(10_000).optional().default(0),
    groups: z.coerce.number().int().min(0).max(10_000).optional().default(0),
    complianceTools: z.array(z.string().trim().min(1).max(120)).max(50).optional().default([]),
    additionalModules: z
      .array(z.string().trim().min(1).max(120))
      .max(20)
      .optional()
      .default([]),
    message: z.string().trim().max(2000).optional().default(""),
  })
  .refine(
    (value) =>
      value.superUser > 0 ||
      value.users > 0 ||
      value.groups > 0 ||
      value.complianceTools.length > 0 ||
      value.additionalModules.length > 0,
    "Request at least one licence seat, toolkit, or module"
  );

export const updateOrganisationLogoBodySchema = z.object({
  logoSrc: z
    .union([z.string().trim().url().max(2000), z.null()])
    .optional()
    .default(null),
  logoStorage: z
    .object({
      bucket: z.string().trim().min(1).max(255),
      key: z.string().trim().min(1).max(1024),
      fileName: z.string().trim().max(255).optional(),
    })
    .nullable()
    .optional()
    .default(null),
});

export const updateDocumentReviewRemindersBodySchema = z.object({
  documentReviewReminderOffsets: z
    .array(z.enum(DOCUMENT_REVIEW_REMINDER_OFFSETS))
    .max(DOCUMENT_REVIEW_REMINDER_OFFSETS.length),
});
