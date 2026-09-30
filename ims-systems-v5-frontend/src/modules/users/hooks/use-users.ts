import { useQuery } from "@tanstack/react-query";
import { getUser, listUsers } from "../api/users";
import type { ListUsersParams } from "../types";

export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (params: ListUsersParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, "detail"] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

export function useUsersQuery(params: ListUsersParams) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => listUsers(params),
  });
}

export function useUserQuery(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: userKeys.detail(userId ?? ""),
    queryFn: () => getUser(userId!),
    enabled: Boolean(userId) && enabled,
  });
}
