/**
 * Public surface for Licence Requests.
 * Other modules may import only from this entry.
 */

export {
  createLicenceRequestModule,
  createLicenceRequestRouter,
  type LicenceRequestRouterDeps,
} from "./routes/licence-request.routes";
export {
  createLicenceRequestService,
  type LicenceRequestService,
} from "./services/licence-request.service";
export { createLicenceRequestRecipientsAdapter } from "./adapters/recipients.adapter";
export type {
  LicenceAllocationPort,
  LicenceRequestRecipientsPort,
} from "./ports";
export {
  LICENCE_REQUEST_STATUSES,
  type CreateLicenceRequestInput,
  type LicenceRequest,
  type LicenceRequestStatus,
  type ListLicenceRequestsQuery,
  type PaginatedLicenceRequests,
} from "./types";
