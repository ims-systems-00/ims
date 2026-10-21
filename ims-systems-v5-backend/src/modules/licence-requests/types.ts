/**
 * Licence Request records (V4 LicenseRequest parity).
 * Spec: docs/module-specifications/license-request.md
 *
 * A request is saved as Pending, then auto-approved in the same call
 * (allocation + Stripe upgrade via the organisation module). If the
 * approval step fails the record stays Pending for manual follow-up.
 */

export const LICENCE_REQUEST_STATUSES = [
  "Pending",
  "Granted",
  "Cancelled",
] as const;

export type LicenceRequestStatus =
  (typeof LICENCE_REQUEST_STATUSES)[number];

export type LicenceRequest = {
  id: string;
  /** Human reference, e.g. LR-1042 (global sequence, V4 format). */
  reference: string;
  organizationId: string;
  requestedBy: string;
  superUser: number;
  users: number;
  groups: number;
  complianceTools: string[];
  additionalModules: string[];
  message: string;
  status: LicenceRequestStatus;
  grantedBy: string | null;
  grantedOn: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateLicenceRequestInput = {
  superUser?: number;
  users?: number;
  groups?: number;
  complianceTools?: string[];
  additionalModules?: string[];
  message?: string;
};

export type ListLicenceRequestsQuery = {
  page?: number;
  pageSize?: number;
};

export type PaginatedLicenceRequests = {
  items: LicenceRequest[];
  total: number;
  page: number;
  pageSize: number;
};
