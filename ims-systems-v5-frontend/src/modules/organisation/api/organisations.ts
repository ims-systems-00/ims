import { apiRequest } from "@/shared/lib/http";
import type {
  CreateLicenceRequestResult,
  CreateOrganisationInput,
  CreateOrganisationResult,
  DocumentReviewReminderOffset,
  GoLiveOrganisationInput,
  GoLiveOrganisationResult,
  Organisation,
  OrganisationPaymentSession,
  OrganisationProfile,
  PaginatedLicenceRequests,
  RequestOrganisationLicenceInput,
} from "../types";

export function createOrganisation(
  body: CreateOrganisationInput
): Promise<CreateOrganisationResult> {
  return apiRequest<CreateOrganisationResult>("/organisations", {
    method: "POST",
    body,
  });
}

export function goLiveOrganisation(
  organizationId: string,
  body: GoLiveOrganisationInput
): Promise<GoLiveOrganisationResult> {
  return apiRequest<GoLiveOrganisationResult>(
    `/organisations/${organizationId}/go-live`,
    {
      method: "POST",
      body,
    }
  );
}

export function getCurrentOrganisation(): Promise<OrganisationProfile> {
  return apiRequest<OrganisationProfile>("/organisations/current");
}

export function getOrganisation(id: string): Promise<OrganisationProfile> {
  return apiRequest<OrganisationProfile>(`/organisations/${id}`);
}

export function listMyOrganisations(): Promise<Organisation[]> {
  return apiRequest<Organisation[]>("/organisations");
}

export function requestOrganisationLicence(
  body: RequestOrganisationLicenceInput
): Promise<CreateLicenceRequestResult> {
  return apiRequest<CreateLicenceRequestResult>("/licence-requests", {
    method: "POST",
    body,
  });
}

export function listLicenceRequests(
  page = 1,
  pageSize = 10
): Promise<PaginatedLicenceRequests> {
  return apiRequest<PaginatedLicenceRequests>(
    `/licence-requests?page=${page}&pageSize=${pageSize}`
  );
}

export function createCardPaymentSession(
  organizationId: string
): Promise<OrganisationPaymentSession> {
  return apiRequest<OrganisationPaymentSession>(
    `/organisations/${organizationId}/card-payment-session`
  );
}

export function createBillingPortalSession(
  organizationId: string
): Promise<OrganisationPaymentSession> {
  return apiRequest<OrganisationPaymentSession>(
    `/organisations/${organizationId}/billing-session`
  );
}

export function updateDocumentReviewReminders(
  documentReviewReminderOffsets: DocumentReviewReminderOffset[]
): Promise<OrganisationProfile> {
  return apiRequest<OrganisationProfile>(
    "/organisations/current/document-review-reminders",
    {
      method: "PUT",
      body: { documentReviewReminderOffsets },
    }
  );
}
