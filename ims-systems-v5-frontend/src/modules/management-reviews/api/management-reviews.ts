import { apiRequest } from "@/shared/lib/http";
import type {
  AttachmentInput,
  CreateManagementReviewInput,
  CreateManagementReviewsResult,
  ListManagementReviewsParams,
  ManagementReview,
  ManagementReviewStats,
  PaginatedManagementReviews,
  UpdateManagementReviewInput,
} from "../types";

function toQuery(params: ListManagementReviewsParams = {}): string {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.search) search.set("search", params.search);
  if (params.status) search.set("status", params.status);
  if (params.businessUnitIds?.length) {
    search.set("businessUnitIds", params.businessUnitIds.join(","));
  }
  if (params.attendeeIds?.length) {
    search.set("attendeeIds", params.attendeeIds.join(","));
  }
  if (params.privacy) search.set("privacy", params.privacy);
  if (params.interval) search.set("interval", params.interval);
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);
  if (params.sort) search.set("sort", params.sort);
  if (params.sortDir) search.set("sortDir", params.sortDir);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function listManagementReviews(
  params?: ListManagementReviewsParams
): Promise<PaginatedManagementReviews> {
  return apiRequest<PaginatedManagementReviews>(
    `/management-reviews${toQuery(params)}`
  );
}

export function getManagementReview(id: string): Promise<ManagementReview> {
  return apiRequest<ManagementReview>(`/management-reviews/${id}`);
}

export function getManagementReviewStats(): Promise<ManagementReviewStats> {
  return apiRequest<ManagementReviewStats>("/management-reviews/stats");
}

export function createManagementReview(
  body: CreateManagementReviewInput
): Promise<CreateManagementReviewsResult> {
  return apiRequest<CreateManagementReviewsResult>("/management-reviews", {
    method: "POST",
    body,
  });
}

export function updateManagementReview(
  id: string,
  body: UpdateManagementReviewInput
): Promise<ManagementReview> {
  return apiRequest<ManagementReview>(`/management-reviews/${id}`, {
    method: "PATCH",
    body,
  });
}

export function deleteManagementReview(
  id: string
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/management-reviews/${id}`, {
    method: "DELETE",
  });
}

export function completeManagementReview(
  id: string
): Promise<ManagementReview> {
  return apiRequest<ManagementReview>(`/management-reviews/${id}/complete`, {
    method: "POST",
  });
}

export function addReviewAgenda(
  id: string,
  attachments: AttachmentInput[]
): Promise<ManagementReview> {
  return apiRequest<ManagementReview>(`/management-reviews/${id}/agenda`, {
    method: "POST",
    body: { attachments },
  });
}

export function removeReviewAgenda(
  id: string,
  attachmentId: string
): Promise<ManagementReview> {
  return apiRequest<ManagementReview>(
    `/management-reviews/${id}/agenda/${attachmentId}`,
    { method: "DELETE" }
  );
}

export function addReviewMinutes(
  id: string,
  attachments: AttachmentInput[]
): Promise<ManagementReview> {
  return apiRequest<ManagementReview>(`/management-reviews/${id}/minutes`, {
    method: "POST",
    body: { attachments },
  });
}

export function removeReviewMinutes(
  id: string,
  attachmentId: string
): Promise<ManagementReview> {
  return apiRequest<ManagementReview>(
    `/management-reviews/${id}/minutes/${attachmentId}`,
    { method: "DELETE" }
  );
}

export function addReviewAttendee(
  id: string,
  attendeeId: string
): Promise<ManagementReview> {
  return apiRequest<ManagementReview>(`/management-reviews/${id}/attendees`, {
    method: "POST",
    body: { attendeeId },
  });
}

export function removeReviewAttendee(
  id: string,
  attendeeId: string
): Promise<ManagementReview> {
  return apiRequest<ManagementReview>(
    `/management-reviews/${id}/attendees/${attendeeId}`,
    { method: "DELETE" }
  );
}
