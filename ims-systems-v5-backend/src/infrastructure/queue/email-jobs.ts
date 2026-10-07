import { z } from "zod";

const emailAddressSchema = z.string().email();

const attachmentSchema = z.object({
  filename: z.string().min(1),
  contentBase64: z.string().min(1),
  type: z.string().optional(),
  disposition: z.enum(["attachment", "inline"]).optional(),
  contentId: z.string().optional(),
});

/**
 * Job payload for both transactional and bulk queues.
 * Template rendering can be added later by extending `kind`.
 */
export const emailJobDataSchema = z.object({
  kind: z.literal("raw").default("raw"),
  to: z.union([emailAddressSchema, z.array(emailAddressSchema).min(1)]),
  subject: z.string().min(1).max(998),
  html: z.string().min(1),
  text: z.string().optional(),
  replyTo: emailAddressSchema.optional(),
  attachments: z.array(attachmentSchema).max(20).optional(),
  category: z
    .enum([
      "notification",
      "transactional",
      "customer-communication",
      "bulk",
      "system",
    ])
    .default("transactional"),
  correlationId: z.string().optional(),
  organizationId: z.string().optional(),
  /** Optional idempotency / dedupe key stored on the BullMQ job id when set. */
  dedupeKey: z.string().min(1).max(128).optional(),
});

export type EmailJobData = z.infer<typeof emailJobDataSchema>;

export function parseEmailJobData(input: unknown): EmailJobData {
  return emailJobDataSchema.parse(input);
}
