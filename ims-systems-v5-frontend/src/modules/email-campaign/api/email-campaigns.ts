import { apiRequest } from "@/shared/lib/http";
import type {
  CampaignOverview,
  CreateEmailCampaignInput,
  EmailCampaign,
  ListEmailCampaignsParams,
  PaginatedDeliveries,
  PaginatedEmailCampaigns,
  UpdateEmailCampaignInput,
} from "../types";

function toQuery(params: ListEmailCampaignsParams = {}): string {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.search) search.set("search", params.search);
  if (params.statuses?.length) {
    search.set("statuses", params.statuses.join(","));
  }
  if (params.businessUnitIds?.length) {
    search.set("businessUnitIds", params.businessUnitIds.join(","));
  }
  if (params.closed !== undefined) {
    search.set("closed", String(params.closed));
  }
  if (params.sort) search.set("sort", params.sort);
  if (params.sortDir) search.set("sortDir", params.sortDir);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function listEmailCampaigns(
  params?: ListEmailCampaignsParams
): Promise<PaginatedEmailCampaigns> {
  return apiRequest<PaginatedEmailCampaigns>(
    `/email-campaigns${toQuery(params)}`
  );
}

export function getEmailCampaign(id: string): Promise<EmailCampaign> {
  return apiRequest<EmailCampaign>(`/email-campaigns/${id}`);
}

export function createEmailCampaign(
  body: CreateEmailCampaignInput
): Promise<EmailCampaign> {
  return apiRequest<EmailCampaign>("/email-campaigns", {
    method: "POST",
    body,
  });
}

export function createAndLaunchEmailCampaign(
  body: CreateEmailCampaignInput
): Promise<EmailCampaign> {
  return apiRequest<EmailCampaign>("/email-campaigns/launch", {
    method: "POST",
    body,
  });
}

export function updateEmailCampaign(
  id: string,
  body: UpdateEmailCampaignInput
): Promise<EmailCampaign> {
  return apiRequest<EmailCampaign>(`/email-campaigns/${id}`, {
    method: "PATCH",
    body,
  });
}

export function deleteEmailCampaign(
  id: string
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/email-campaigns/${id}`, {
    method: "DELETE",
  });
}

export function launchEmailCampaign(id: string): Promise<EmailCampaign> {
  return apiRequest<EmailCampaign>(`/email-campaigns/${id}/launch`, {
    method: "POST",
  });
}

export function closeEmailCampaign(id: string): Promise<EmailCampaign> {
  return apiRequest<EmailCampaign>(`/email-campaigns/${id}/close`, {
    method: "POST",
  });
}

export function getCampaignOverview(id: string): Promise<CampaignOverview> {
  return apiRequest<CampaignOverview>(`/email-campaigns/${id}/overview`);
}

export function listCampaignDeliveries(
  id: string,
  params?: { page?: number; pageSize?: number }
): Promise<PaginatedDeliveries> {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.pageSize) search.set("pageSize", String(params.pageSize));
  const qs = search.toString();
  return apiRequest<PaginatedDeliveries>(
    `/email-campaigns/${id}/deliveries${qs ? `?${qs}` : ""}`
  );
}
