import { apiRequest } from "@/shared/lib/http";
import type {
  ListUsersParams,
  PaginatedUsers,
  UpdateEmploymentInput,
  UpdateUserProfileInput,
  User,
  UserWithMembership,
} from "../types";

function toQuery(params: ListUsersParams = {}): string {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.search) search.set("search", params.search);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function listUsers(params?: ListUsersParams): Promise<PaginatedUsers> {
  return apiRequest<PaginatedUsers>(`/users${toQuery(params)}`);
}

/**
 * Classified user detail (identity + organisation membership).
 * GET /users/:id and GET /users/:id/classified-info are equivalent.
 */
export function getUser(id: string): Promise<UserWithMembership> {
  return apiRequest<UserWithMembership>(`/users/${id}`);
}

/**
 * Current session user (Bearer AuthN → IMS user).
 * GET /users/me
 */
export function getCurrentUser(): Promise<UserWithMembership> {
  return apiRequest<UserWithMembership>("/users/me");
}

/**
 * Self-service / authorised profile update (first/last name).
 * PATCH /users/:id
 */
export function updateUserProfile(
  id: string,
  body: UpdateUserProfileInput
): Promise<User> {
  return apiRequest<User>(`/users/${id}`, {
    method: "PATCH",
    body,
  });
}

/**
 * Replace line managers on organisation membership (Leaves approval routing).
 * PUT /users/:id/line-managers
 */
export function setUserLineManagers(
  id: string,
  lineManagerIds: string[]
): Promise<UserWithMembership> {
  return apiRequest<UserWithMembership>(`/users/${id}/line-managers`, {
    method: "PUT",
    body: { lineManagerIds },
  });
}

/**
 * Update employment details (V4 MembershipForm parity).
 * PUT /users/:id/employment
 */
export function updateUserEmployment(
  id: string,
  body: UpdateEmploymentInput
): Promise<UserWithMembership> {
  return apiRequest<UserWithMembership>(`/users/${id}/employment`, {
    method: "PUT",
    body,
  });
}

export type UpdateProfileImageInput = {
  url: string;
  fileName?: string;
  storageKey?: string;
  bucket?: string;
};

/**
 * Persist an uploaded profile picture (File Handler meta + view URL).
 * PUT /users/:id/profile-image — self only.
 */
export function updateProfileImage(
  id: string,
  body: UpdateProfileImageInput
): Promise<User> {
  return apiRequest<User>(`/users/${id}/profile-image`, {
    method: "PUT",
    body,
  });
}
