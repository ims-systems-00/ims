import { apiRequest } from "@/shared/lib/http";
import type {
  CreateOrganisationInput,
  CreateOrganisationResult,
  DocumentReviewReminderOffset,
  Organisation,
  OrganisationProfile,
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
): Promise<OrganisationProfile> {
  return apiRequest<OrganisationProfile>("/organisations/current/licence-request", {
    method: "POST",
    body,
  });
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
