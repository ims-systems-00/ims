import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import {
  useMarkAllSentMutation,
  useUnsentCountQuery,
} from "./use-notifications";

const getUnsentCount = vi.fn();
const markAllSent = vi.fn();

vi.mock("../api/notifications", () => ({
  getUnsentCount: (...args: unknown[]) => getUnsentCount(...args),
  markAllSent: (...args: unknown[]) => markAllSent(...args),
  listNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markNotificationPopup: vi.fn(),
  markAllPopupsRead: vi.fn(),
  broadcastNotice: vi.fn(),
  getNotification: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchInterval: false },
      mutations: { retry: false },
    },
  });
  return createElement(QueryClientProvider, { client }, children);
}

describe("use-notifications hooks", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loads unsent count", async () => {
    getUnsentCount.mockResolvedValue({ count: 4 });
    const { result } = renderHook(() => useUnsentCountQuery(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ count: 4 });
  });

  it("marks all sent and invalidates queries", async () => {
    getUnsentCount.mockResolvedValue({ count: 1 });
    markAllSent.mockResolvedValue({ modifiedCount: 1 });
    const { result } = renderHook(
      () => ({
        count: useUnsentCountQuery(),
        mark: useMarkAllSentMutation(),
      }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.count.isSuccess).toBe(true));
    result.current.mark.mutate();
    await waitFor(() => expect(result.current.mark.isSuccess).toBe(true));
    expect(markAllSent).toHaveBeenCalled();
  });
});
