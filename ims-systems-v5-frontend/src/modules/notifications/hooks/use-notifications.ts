import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  broadcastNotice,
  getUnsentCount,
  listNotifications,
  markAllPopupsRead,
  markAllSent,
  markNotificationPopup,
  markNotificationRead,
} from "../api/notifications";
import type { BroadcastNoticeInput, ListNotificationsParams } from "../types";

export const notificationKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationKeys.all, "list"] as const,
  list: (params: ListNotificationsParams) =>
    [...notificationKeys.lists(), params] as const,
  infinite: (params: Omit<ListNotificationsParams, "page">) =>
    [...notificationKeys.lists(), "infinite", params] as const,
  unsentCount: () => [...notificationKeys.all, "unsent-count"] as const,
};

const DEFAULT_PAGE_SIZE = 10;

async function invalidateNotificationQueries(
  queryClient: ReturnType<typeof useQueryClient>
) {
  await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
}

export function useUnsentCountQuery() {
  return useQuery({
    queryKey: notificationKeys.unsentCount(),
    queryFn: getUnsentCount,
    refetchInterval: 30_000,
  });
}

export function useNotificationsInfiniteQuery(
  params: Omit<ListNotificationsParams, "page"> = {},
  enabled = true
) {
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  return useInfiniteQuery({
    queryKey: notificationKeys.infinite({ ...params, pageSize }),
    queryFn: ({ pageParam }) =>
      listNotifications({ ...params, page: pageParam, pageSize }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page < last.totalPages ? last.page + 1 : undefined,
    enabled,
  });
}

export function useMarkAllSentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllSent,
    onSuccess: async () => {
      await invalidateNotificationQueries(queryClient);
    },
  });
}

export function useMarkReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: async () => {
      await invalidateNotificationQueries(queryClient);
    },
  });
}

export function useMarkPopupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationPopup(id, "read"),
    onSuccess: async () => {
      await invalidateNotificationQueries(queryClient);
    },
  });
}

export function useMarkAllPopupsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllPopupsRead,
    onSuccess: async () => {
      await invalidateNotificationQueries(queryClient);
    },
  });
}

export function useBroadcastNoticeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BroadcastNoticeInput) => broadcastNotice(body),
    onSuccess: async () => {
      await invalidateNotificationQueries(queryClient);
    },
  });
}

export function usePopupNotificationsQuery(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.list({
      page: 1,
      pageSize: 20,
      popUp: "unread",
      sortDir: "desc",
    }),
    queryFn: () =>
      listNotifications({
        page: 1,
        pageSize: 20,
        popUp: "unread",
        sortDir: "desc",
      }),
    enabled,
    refetchInterval: 60_000,
  });
}
