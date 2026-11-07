/**
 * Cross-module ports for Licence Requests.
 * Spec: docs/module-specifications/license-request.md
 */

import type { EmailBranding } from "../../infrastructure/email/templates";
import type { SecurityIdentity } from "../../security";
import type { OrganisationProfile } from "../organisation/types";
import type { CreateLicenceRequestInput } from "./types";

/**
 * Applies the licence delta to the organisation (seats/toolkits/modules)
 * and upgrades the Stripe subscription when one exists.
 * Implemented by the Organisation module's requestLicence.
 */
export type LicenceAllocationPort = {
  allocateLicences(
    identity: SecurityIdentity | null | undefined,
    input: CreateLicenceRequestInput
  ): Promise<OrganisationProfile>;
};

/** Resolves notification recipients for licence-request emails. */
export type LicenceRequestRecipientsPort = {
  /** Emails of the organisation's Super Admins. */
  listSuperAdminEmails(organizationId: string): Promise<string[]>;
  getOrganisationName(organizationId: string): Promise<string | null>;
  /** Optional org email branding (logo + theme). */
  getEmailBranding?(organizationId: string): Promise<EmailBranding>;
};
