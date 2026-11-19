/**
 * Super Admin billing credits (charge allocated − 1 for specific orgs).
 * Allocated seats in Mongo stay unchanged; only Stripe quantities are reduced.
 *
 * Match is by organisation `officeEmail` (works the same in local and prod).
 */

/** Organisation officeEmail values that receive 1 complimentary Super Admin seat. */
const COMPLIMENTARY_SUPER_USER_OFFICE_EMAILS = new Set([
  "helen@mbsgm.com",
  "millie@seecleargroup.co.uk",
  "tledgerton@t4eg.co.uk",
  "robert.bowles@richfordgroup.com",
  "jim@imssystems.tech",
]);

function parseOrgIdList(raw: string | undefined): Set<string> {
  const ids = new Set<string>();
  for (const part of (raw ?? "").split(",")) {
    const id = part.trim();
    if (/^[a-f\d]{24}$/i.test(id)) ids.add(id.toLowerCase());
  }
  return ids;
}

export type SuperUserBillingCreditContext = {
  organizationId: string;
  officeEmail?: string | null;
  /** Comma-separated org ids from STRIPE_SA_COMPLIMENTARY_ORG_IDS (optional extra). */
  complimentaryOrgIdsFromEnv?: string;
};

/**
 * How many Super Admin seats to omit from Stripe (usually 0 or 1).
 */
export function complimentarySuperUserSeats(
  context: SuperUserBillingCreditContext
): number {
  const envIds = parseOrgIdList(context.complimentaryOrgIdsFromEnv);
  const orgId = context.organizationId.trim().toLowerCase();
  if (envIds.has(orgId)) {
    return 1;
  }

  const officeEmail = context.officeEmail?.trim().toLowerCase() ?? "";
  if (
    officeEmail &&
    COMPLIMENTARY_SUPER_USER_OFFICE_EMAILS.has(officeEmail)
  ) {
    return 1;
  }

  return 0;
}

/**
 * Stripe Super Admin quantity = allocated − complimentary seats (never below 0).
 */
export function billableSuperUserQuantity(
  allocated: number,
  context: SuperUserBillingCreditContext
): number {
  const raw = Math.max(0, Math.floor(allocated));
  const credit = complimentarySuperUserSeats(context);
  return Math.max(0, raw - credit);
}
