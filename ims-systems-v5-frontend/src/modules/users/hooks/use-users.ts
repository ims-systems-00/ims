import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCurrentUser,
  getUser,
  listUsers,
  updateUserProfile,
} from "../api/users";
import type { ListUsersParams, UpdateUserProfileInput } from "../types";
import { loadPublicEnv } from "@/shared/lib/env";

export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (params: ListUsersParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, "detail"] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  me: () => [...userKeys.all, "me"] as const,
};

/**
 * Session profile. Auth0 mode uses GET /users/me; stub uses resolved demo user id.
 */
export function useSessionUserQuery(fallbackUserId?: string) {
  const provider = loadPublicEnv().VITE_SECURITY_PROVIDER;
  const useMe = provider === "auth0-openfga";

  return useQuery({
    queryKey: useMe ? userKeys.me() : userKeys.detail(fallbackUserId ?? ""),
    queryFn: () => (useMe ? getCurrentUser() : getUser(fallbackUserId!)),
    enabled: useMe || Boolean(fallbackUserId),
  });
}

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

export function useUpdateUserProfileMutation(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateUserProfileInput) =>
      updateUserProfile(userId, body),
    onSuccess: async (user) => {
      await queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      await queryClient.invalidateQueries({
        queryKey: userKeys.detail(userId),
      });
      queryClient.setQueryData(userKeys.detail(userId), (current: unknown) => {
        if (
          current &&
          typeof current === "object" &&
          "user" in current &&
          "membership" in current
        ) {
          return {
            ...(current as { user: typeof user; membership: unknown }),
            user,
          };
        }
        return current;
      });
    },
  });
}