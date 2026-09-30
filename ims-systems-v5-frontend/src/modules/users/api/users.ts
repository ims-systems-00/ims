import { apiRequest } from "@/shared/lib/http";
import type {
  ListUsersParams,
  PaginatedUsers,
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
