import { apiRequest } from "@/shared/lib/http";
import type {
  AcceptInvitationResult,
  CreateInvitationInput,
  Invitation,
  InvitationPreview,
  ListInvitationsParams,
  PaginatedInvitations,
} from "../types";

function toQuery(params: ListInvitationsParams = {}): string {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.search) search.set("search", params.search);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function createInvitation(
  body: CreateInvitationInput
): Promise<Invitation> {
  return apiRequest<Invitation>("/invitations", {
    method: "POST",
    body,
  });
}

export function listInvitations(
  params?: ListInvitationsParams
): Promise<PaginatedInvitations> {
  return apiRequest<PaginatedInvitations>(`/invitations${toQuery(params)}`);
}

/** Pending invitations addressed to the signed-in user's email. */
export function listReceivedInvitations(): Promise<Invitation[]> {
  return apiRequest<Invitation[]>("/invitations/received");
}

export function resendInvitation(id: string): Promise<Invitation> {
  return apiRequest<Invitation>(
    `/invitations/${encodeURIComponent(id)}/resend`,
    { method: "POST" }
  );
}

export function removeInvitation(
  id: string
): Promise<{ id: string; deleted: true }> {
  return apiRequest<{ id: string; deleted: true }>(
    `/invitations/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
}

/** Public preview for the emailed link — works before sign-in. */
export function getInvitationPreview(
  token: string
): Promise<InvitationPreview> {
  return apiRequest<InvitationPreview>(
    `/invitations/preview/${encodeURIComponent(token)}`
  );
}

export function acceptInvitation(
  token: string
): Promise<AcceptInvitationResult> {
  return apiRequest<AcceptInvitationResult>("/invitations/accept", {
    method: "POST",
    body: { token },
  });
}
