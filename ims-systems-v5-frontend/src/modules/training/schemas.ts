import { z } from "zod";
import {
  TRAINING_EVIDENCE_TYPES,
  TRAINING_PERSON_STATUSES,
  TRAINING_RESULTS,
  TRAINING_RSVP_STATUSES,
} from "./types";

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const personFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  roles: z.array(z.string()).optional(),
  site: z.string().trim().min(1, "Site is required").max(200),
  manager: z.string().trim().max(200).optional().or(z.literal("")),
  start: isoDate.optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  status: z.enum(TRAINING_PERSON_STATUSES).optional(),
  extra: z.array(z.string()).optional(),
  external: z.boolean().optional(),
  company: z.string().trim().max(200).optional().or(z.literal("")),
});

export type PersonFormValues = z.infer<typeof personFormSchema>;

export const externalPersonFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Valid email is required"),
  company: z.string().trim().max(200).optional().or(z.literal("")),
});

export type ExternalPersonFormValues = z.infer<typeof externalPersonFormSchema>;

export const competencyFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  months: z.coerce.number().int().min(0).max(240),
  evidence: z.enum(TRAINING_EVIDENCE_TYPES),
  basis: z.string().trim().max(500).optional().or(z.literal("")),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  provider: z.string().trim().max(200).optional().or(z.literal("")),
  covers: z.string().optional().or(z.literal("")),
});

export type CompetencyFormValues = z.infer<typeof competencyFormSchema>;

export const roleFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  mandatory: z.array(z.string()).optional(),
  desirable: z.array(z.string()).optional(),
});

export type RoleFormValues = z.infer<typeof roleFormSchema>;

export const recordFormSchema = z.object({
  personId: z.string().trim().min(1),
  cid: z.string().trim().min(1, "Competency is required"),
  date: isoDate,
  result: z.enum(["Pass", "Pass with observations", "Fail"] as const),
  provider: z.string().trim().max(200).optional().or(z.literal("")),
  ref: z.string().trim().max(200).optional().or(z.literal("")),
  note: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type RecordFormValues = z.infer<typeof recordFormSchema>;

export const sessionFormSchema = z.object({
  cid: z.string().trim().min(1, "Course is required"),
  date: isoDate,
  time: z.string().trim().max(10).optional().or(z.literal("")),
  duration: z.coerce.number().int().min(0).max(24 * 60).optional(),
  location: z.string().trim().max(500).optional().or(z.literal("")),
  trainer: z.string().trim().max(200).optional().or(z.literal("")),
  provider: z.string().trim().max(200).optional().or(z.literal("")),
  cost: z.coerce.number().min(0).optional(),
  note: z.string().trim().max(4000).optional().or(z.literal("")),
  attendees: z.array(z.string()).optional(),
});

export type SessionFormValues = z.infer<typeof sessionFormSchema>;

export const settingsFormSchema = z.object({
  orgName: z.string().trim().max(200).optional().or(z.literal("")),
  leadDays: z.coerce.number().int().min(0).max(365),
  inductionDays: z.coerce.number().int().min(0).max(90),
  siteLabel: z.string().trim().max(100).optional().or(z.literal("")),
  sitesText: z.string().optional().or(z.literal("")),
  providersText: z.string().optional().or(z.literal("")),
  allowSelfUpload: z.boolean(),
  requireVerification: z.boolean(),
  selfTokenDays: z.coerce.number().int().min(1).max(365),
  reminderDaysText: z.string().optional().or(z.literal("")),
  inviteSubject: z.string().trim().max(500).optional().or(z.literal("")),
  inviteBody: z.string().trim().max(10000).optional().or(z.literal("")),
  organiserEmail: z
    .string()
    .trim()
    .email("Invalid email")
    .optional()
    .or(z.literal("")),
});

export type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export const selfUploadFormSchema = z.object({
  cid: z.string().trim().min(1, "Competency is required"),
  date: isoDate.optional().or(z.literal("")),
  provider: z.string().trim().max(200).optional().or(z.literal("")),
  ref: z.string().trim().max(200).optional().or(z.literal("")),
  note: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type SelfUploadFormValues = z.infer<typeof selfUploadFormSchema>;

export const publicRsvpFormSchema = z.object({
  status: z.enum(TRAINING_RSVP_STATUSES),
  note: z.string().trim().max(300).optional().or(z.literal("")),
});

export type PublicRsvpFormValues = z.infer<typeof publicRsvpFormSchema>;

export { TRAINING_RESULTS };
