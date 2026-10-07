/**
 * Canonical BullMQ queue names for the V5 backend.
 * Keep stable — renaming requires a migration of in-flight jobs.
 */
export const QUEUE_NAMES = {
  emailTransactional: "email-transactional",
  emailBulk: "email-bulk",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
