import { z } from "zod";
import {
  TRAINING_EVIDENCE_TYPES,
  TRAINING_PERSON_STATUSES,
  TRAINING_RESULTS,
  TRAINING_RSVP_STATUSES,
  TRAINING_SESSION_STATUSES,
} from "../types";

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, "Invalid id");

export const idParamSchema = z.object({ id: objectIdSchema });

export const tokenParamSchema = z.object({
  token: z.string().trim().min(1).max(2000),
});

const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

const quizSchema = z.object({
  q: z.string().trim().min(1).max(500),
  opts: z.array(z.string().trim().min(1).max(200)).min(2).max(8),
  a: z.number().int().min(0),
});

export const createCompetencyBodySchema = z.object({
  key: z.string().trim().min(1).max(40).optional(),
  name: z.string().trim().min(1).max(200),
  months: z.number().int().min(0).max(240),
  evidence: z.enum(TRAINING_EVIDENCE_TYPES),
  basis: z.string().trim().max(500).optional(),
  covers: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  quiz: z.array(quizSchema).max(20).optional(),
  description: z.string().trim().max(4000).optional(),
  provider: z.string().trim().max(200).optional(),
});

export const updateCompetencyBodySchema = createCompetencyBodySchema
  .partial()
  .extend({
    archived: z.boolean().optional(),
  });

export const createRoleBodySchema = z.object({
  key: z.string().trim().min(1).max(40).optional(),
  name: z.string().trim().min(1).max(200),
  mandatory: z.array(z.string().trim().min(1)).max(100).optional(),
  desirable: z.array(z.string().trim().min(1)).max(100).optional(),
  description: z.string().trim().max(2000).optional(),
});

export const updateRoleBodySchema = createRoleBodySchema.partial();

export const createPersonBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  roles: z.array(z.string().trim().min(1)).max(50).optional(),
  site: z.string().trim().min(1).max(200),
  manager: z.string().trim().max(200).optional(),
  start: isoDateSchema.optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  status: z.enum(TRAINING_PERSON_STATUSES).optional(),
  extra: z.array(z.string().trim().min(1)).max(50).optional(),
  external: z.boolean().optional(),
  company: z.string().trim().max(200).optional(),
  userId: z.string().trim().max(100).nullable().optional(),
});

export const updatePersonBodySchema = createPersonBodySchema.partial().extend({
  end: isoDateSchema.optional().or(z.literal("")),
});

export const createExternalBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email(),
  company: z.string().trim().max(200).optional(),
});

export const leaverBodySchema = z.object({
  date: isoDateSchema.optional(),
});

export const exemptBodySchema = z.object({
  cid: z.string().trim().min(1),
  reason: z.string().trim().min(1).max(1000),
});

export const acknowledgeBodySchema = z.object({
  cid: z.string().trim().min(1),
  answers: z.array(z.number().int().min(0)).max(20).optional(),
});

export const createRecordBodySchema = z.object({
  personId: objectIdSchema,
  cid: z.string().trim().min(1),
  date: isoDateSchema.optional(),
  result: z
    .enum(["Pass", "Pass with observations", "Fail"] as const)
    .optional(),
  provider: z.string().trim().max(200).optional(),
  ref: z.string().trim().max(200).optional(),
  fileId: z.string().trim().max(500).nullable().optional(),
  note: z.string().trim().max(2000).optional(),
});

export const createSessionBodySchema = z.object({
  cid: z.string().trim().min(1),
  date: isoDateSchema,
  time: z.string().trim().max(10).optional(),
  duration: z.number().int().min(0).max(24 * 60).optional(),
  location: z.string().trim().max(500).optional(),
  trainer: z.string().trim().max(200).optional(),
  provider: z.string().trim().max(200).optional(),
  cost: z.number().min(0).optional(),
  note: z.string().trim().max(4000).optional(),
  attendees: z.array(objectIdSchema).max(500).optional(),
});

export const updateSessionBodySchema = createSessionBodySchema.partial();

export const completeSessionBodySchema = z.object({
  outcomes: z
    .record(
      z.string(),
      z.object({
        result: z.enum(TRAINING_RESULTS).optional(),
        ref: z.string().trim().max(200).optional(),
        fileId: z.string().trim().max(500).nullable().optional(),
        note: z.string().trim().max(2000).optional(),
      })
    )
    .optional(),
});

export const cancelSessionBodySchema = z.object({
  reason: z.string().trim().max(1000).optional(),
});

export const inviteSessionBodySchema = z.object({
  personIds: z.array(objectIdSchema).max(500).optional(),
});

export const rsvpBodySchema = z.object({
  personId: objectIdSchema.optional(),
  status: z.enum(TRAINING_RSVP_STATUSES),
  note: z.string().trim().max(300).optional(),
});

export const attachmentBodySchema = z.object({
  name: z.string().trim().min(1).max(500),
  size: z.number().int().min(0).optional(),
  type: z.string().trim().max(200).optional(),
  fileId: z.string().trim().max(500).nullable().optional(),
  url: z.string().trim().max(2000).nullable().optional(),
  shared: z.boolean().optional(),
  note: z.string().trim().max(1000).optional(),
});

export const attachmentKindParamSchema = z.object({
  id: objectIdSchema,
  kind: z.enum(["materials", "outputs"]),
});

export const attachmentIdParamSchema = z.object({
  id: objectIdSchema,
  kind: z.enum(["materials", "outputs"]),
  attachmentId: z.string().trim().min(1),
});

export const updateSettingsBodySchema = z.object({
  orgName: z.string().trim().max(200).optional(),
  leadDays: z.number().int().min(0).max(365).optional(),
  inductionDays: z.number().int().min(0).max(90).optional(),
  siteLabel: z.string().trim().max(100).optional(),
  sites: z.array(z.string().trim().min(1).max(200)).max(100).optional(),
  providers: z.array(z.string().trim().min(1).max(200)).max(100).optional(),
  allowSelfUpload: z.boolean().optional(),
  requireVerification: z.boolean().optional(),
  selfTokenDays: z.number().int().min(1).max(365).optional(),
  reminderDays: z.array(z.number().int().min(0).max(90)).max(10).optional(),
  inviteSubject: z.string().trim().max(500).optional(),
  inviteBody: z.string().trim().max(10000).optional(),
  organiserEmail: z.string().trim().email().optional().or(z.literal("")),
});

export const competentQuerySchema = z.object({
  personId: objectIdSchema,
  covers: z.string().trim().min(1).max(200),
});

export const planQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).optional(),
});

export const listPeopleQuerySchema = z.object({
  status: z.enum(TRAINING_PERSON_STATUSES).optional(),
  site: z.string().trim().optional(),
  role: z.string().trim().optional(),
  search: z.string().trim().optional(),
  gapsOnly: z
    .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
    .optional()
    .transform((v) =>
      v === undefined ? undefined : v === true || v === "true" || v === "1"
    ),
});

export const selfUploadBodySchema = z.object({
  cid: z.string().trim().min(1),
  date: isoDateSchema.optional(),
  provider: z.string().trim().max(200).optional(),
  ref: z.string().trim().max(200).optional(),
  fileId: z.string().trim().max(500).nullable().optional(),
  note: z.string().trim().max(2000).optional(),
});

export const selfAcknowledgeBodySchema = acknowledgeBodySchema;

export const prepareUploadBodySchema = z.object({
  fileName: z.string().trim().min(1).max(500),
  contentType: z.string().trim().max(200).optional(),
  fileSize: z.number().int().min(0).optional(),
});

export { TRAINING_SESSION_STATUSES };
