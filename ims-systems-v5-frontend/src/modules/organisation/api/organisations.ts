import { apiRequest } from "@/shared/lib/http";
import type {
  CreateOrganisationInput,
  CreateOrganisationResult,
  GoLiveOrganisationInput,
  GoLiveOrganisationResult,
  Organisation,
  OrganisationProfile,
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
