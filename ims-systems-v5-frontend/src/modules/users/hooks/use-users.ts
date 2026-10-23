import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCurrentUser,
  getUser,
  listUsers,
  setUserLineManagers,
  updateProfileImage,
  updateUserEmployment,
  updateUserProfile,
  type UpdateProfileImageInput,
} from "../api/users";
import { useFileViewUrlQuery } from "@/modules/files/hooks/use-files";
import type {
  ListUsersParams,
  UpdateEmploymentInput,
  UpdateUserProfileInput,
} from "../types";
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

/**
 * Fresh signed view URL for a user's profile picture when the File
 * Handler bucket/key are known; falls back to the stored URL.
 */
export function useProfileImageUrl(
  user:
    | {
        profileImage?: {
          url?: string;
          storageKey?: string;
          bucket?: string;
          fileName?: string;
        };
      }
    | null
    | undefined
): string | undefined {
  const image = user?.profileImage;
  const meta =
    image?.bucket && image?.storageKey
      ? {
          Bucket: image.bucket,
          Key: image.storageKey,
          key: image.storageKey,
          Name: image.fileName ?? "profile",
        }
      : null;
  const view = useFileViewUrlQuery(meta, Boolean(meta));
  if (view.data?.url) return view.data.url;
  const stored = image?.url?.trim();
  if (stored && !stored.includes("avatar-placeholder")) return stored;
  return undefined;
}

export function useUpdateProfileImageMutation(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateProfileImageInput) =>
      updateProfileImage(userId, body),
    onSuccess: async (user) => {
      await queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      await queryClient.invalidateQueries({
        queryKey: userKeys.detail(userId),
      });
      await queryClient.invalidateQueries({ queryKey: userKeys.me() });
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

export function useSetUserLineManagersMutation(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lineManagerIds: string[]) =>
      setUserLineManagers(userId, lineManagerIds),
    onSuccess: async (payload) => {
      await queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      await queryClient.invalidateQueries({
        queryKey: userKeys.detail(userId),
      });
      queryClient.setQueryData(userKeys.detail(userId), payload);
    },
  });
}

export function useUpdateUserEmploymentMutation(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateEmploymentInput) =>
      updateUserEmployment(userId, body),
    onSuccess: async (payload) => {
      await queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      await queryClient.invalidateQueries({
        queryKey: userKeys.detail(userId),
      });
      await queryClient.invalidateQueries({ queryKey: userKeys.me() });
      queryClient.setQueryData(userKeys.detail(userId), payload);
    },
  });
}