import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { organisationKeys } from "@/modules/organisation/hooks/use-organisations";
import { userKeys } from "@/modules/users/hooks/use-users";
import {
  acceptInvitation,
  createInvitation,
  getInvitationPreview,
  listInvitations,
  listReceivedInvitations,
  removeInvitation,
  resendInvitation,
} from "../api/invitations";
import type {
  CreateInvitationInput,
  ListInvitationsParams,
} from "../types";

export const invitationKeys = {
  all: ["invitations"] as const,
  lists: () => [...invitationKeys.all, "list"] as const,
  list: (params: ListInvitationsParams) =>
    [...invitationKeys.lists(), params] as const,
  received: () => [...invitationKeys.all, "received"] as const,
  preview: (token: string) => [...invitationKeys.all, "preview", token] as const,
};

export function useInvitationsQuery(params: ListInvitationsParams) {
  return useQuery({
    queryKey: invitationKeys.list(params),
    queryFn: () => listInvitations(params),
  });
}

export function useReceivedInvitationsQuery(enabled = true) {
  return useQuery({
    queryKey: invitationKeys.received(),
    queryFn: listReceivedInvitations,
    enabled,
    retry: false,
  });
}

export function useCreateInvitationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateInvitationInput) => createInvitation(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: invitationKeys.lists(),
      });
    },
  });
}

export function useResendInvitationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resendInvitation(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: invitationKeys.lists(),
      });
    },
  });
}

export function useRemoveInvitationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeInvitation(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: invitationKeys.lists(),
      });
    },
  });
}

export function useInvitationPreviewQuery(token: string | undefined) {
  return useQuery({
    queryKey: invitationKeys.preview(token ?? ""),
    queryFn: () => getInvitationPreview(token as string),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useAcceptInvitationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => acceptInvitation(token),
    onSuccess: async () => {
      // New membership affects org selection, directory and received list.
      await queryClient.invalidateQueries({ queryKey: organisationKeys.all });
      await queryClient.invalidateQueries({ queryKey: userKeys.all });
      await queryClient.invalidateQueries({
        queryKey: invitationKeys.received(),
      });
    },
  });
}
