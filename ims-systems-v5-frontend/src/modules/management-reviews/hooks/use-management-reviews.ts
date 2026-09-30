import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addReviewAgenda,
  addReviewAttendee,
  addReviewMinutes,
  completeManagementReview,
  createManagementReview,
  deleteManagementReview,
  getManagementReview,
  getManagementReviewStats,
  listManagementReviews,
  removeReviewAgenda,
  removeReviewAttendee,
  removeReviewMinutes,
  updateManagementReview,
} from "../api/management-reviews";
import type {
  AttachmentInput,
  CreateManagementReviewInput,
  ListManagementReviewsParams,
  UpdateManagementReviewInput,
} from "../types";

export const managementReviewKeys = {
  all: ["management-reviews"] as const,
  lists: () => [...managementReviewKeys.all, "list"] as const,
  list: (params: ListManagementReviewsParams) =>
    [...managementReviewKeys.lists(), params] as const,
  details: () => [...managementReviewKeys.all, "detail"] as const,
  detail: (id: string) => [...managementReviewKeys.details(), id] as const,
  stats: () => [...managementReviewKeys.all, "stats"] as const,
};

async function invalidateReviewQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string
) {
  await queryClient.invalidateQueries({
    queryKey: managementReviewKeys.lists(),
  });
  await queryClient.invalidateQueries({
    queryKey: managementReviewKeys.stats(),
  });
  if (id) {
    await queryClient.invalidateQueries({
      queryKey: managementReviewKeys.detail(id),
    });
  }
}

export function useManagementReviewsQuery(params: ListManagementReviewsParams) {
  return useQuery({
    queryKey: managementReviewKeys.list(params),
    queryFn: () => listManagementReviews(params),
  });
}

export function useManagementReviewQuery(id: string | undefined) {
  return useQuery({
    queryKey: managementReviewKeys.detail(id ?? ""),
    queryFn: () => getManagementReview(id!),
    enabled: Boolean(id),
  });
}

export function useManagementReviewStatsQuery() {
  return useQuery({
    queryKey: managementReviewKeys.stats(),
    queryFn: () => getManagementReviewStats(),
  });
}

export function useCreateManagementReviewMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateManagementReviewInput) =>
      createManagementReview(body),
    onSuccess: async () => {
      await invalidateReviewQueries(queryClient);
    },
  });
}

export function useUpdateManagementReviewMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateManagementReviewInput) =>
      updateManagementReview(id, body),
    onSuccess: async (review) => {
      await invalidateReviewQueries(queryClient, id);
      queryClient.setQueryData(managementReviewKeys.detail(id), review);
    },
  });
}

export function useDeleteManagementReviewMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteManagementReview(id),
    onSuccess: async (_data, id) => {
      await invalidateReviewQueries(queryClient);
      queryClient.removeQueries({
        queryKey: managementReviewKeys.detail(id),
      });
    },
  });
}

export function useCompleteManagementReviewMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => completeManagementReview(id),
    onSuccess: async (review) => {
      await invalidateReviewQueries(queryClient, review.id);
      queryClient.setQueryData(
        managementReviewKeys.detail(review.id),
        review
      );
    },
  });
}

export function useReviewAttachmentMutations(reviewId: string) {
  const queryClient = useQueryClient();
  const apply = async (review: import("../types").ManagementReview) => {
    await invalidateReviewQueries(queryClient, reviewId);
    queryClient.setQueryData(managementReviewKeys.detail(reviewId), review);
  };

  return {
    addAgenda: useMutation({
      mutationFn: (attachments: AttachmentInput[]) =>
        addReviewAgenda(reviewId, attachments),
      onSuccess: apply,
    }),
    removeAgenda: useMutation({
      mutationFn: (attachmentId: string) =>
        removeReviewAgenda(reviewId, attachmentId),
      onSuccess: apply,
    }),
    addMinutes: useMutation({
      mutationFn: (attachments: AttachmentInput[]) =>
        addReviewMinutes(reviewId, attachments),
      onSuccess: apply,
    }),
    removeMinutes: useMutation({
      mutationFn: (attachmentId: string) =>
        removeReviewMinutes(reviewId, attachmentId),
      onSuccess: apply,
    }),
  };
}

export function useReviewAttendeeMutations(reviewId: string) {
  const queryClient = useQueryClient();
  const apply = async (review: import("../types").ManagementReview) => {
    await invalidateReviewQueries(queryClient, reviewId);
    queryClient.setQueryData(managementReviewKeys.detail(reviewId), review);
  };

  return {
    add: useMutation({
      mutationFn: (attendeeId: string) =>
        addReviewAttendee(reviewId, attendeeId),
      onSuccess: apply,
    }),
    remove: useMutation({
      mutationFn: (attendeeId: string) =>
        removeReviewAttendee(reviewId, attendeeId),
      onSuccess: apply,
    }),
  };
}
