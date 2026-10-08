import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationBell } from "@/modules/notifications";
import { useNotificationsUiStore } from "@/modules/notifications/store/use-notifications-ui-store";
import type { Notification } from "@/modules/notifications/types";

const markAllSent = vi.fn();
const markNotificationRead = vi.fn();
const getUnsentCount = vi.fn();
const listNotifications = vi.fn();

vi.mock("@/modules/notifications/api/notifications", () => ({
  getUnsentCount: (...args: unknown[]) => getUnsentCount(...args),
  listNotifications: (...args: unknown[]) => listNotifications(...args),
  markAllSent: (...args: unknown[]) => markAllSent(...args),
  markNotificationRead: (...args: unknown[]) => markNotificationRead(...args),
  markNotificationPopup: vi.fn(),
  markAllPopupsRead: vi.fn(),
  broadcastNotice: vi.fn(),
  getNotification: vi.fn(),
}));

function sampleNotification(
  overrides: Partial<Notification> = {}
): Notification {
  return {
    id: "n1",
    organizationId: "org1",
    recipientUserId: "u1",
    title: "Task assigned",
    message: "Please review the task",
    referenceType: "tasks",
    referenceModuleId: "task-1",
    screenIdentifier: "task-detail",
    params: { id: "task-1" },
    sent: { status: "unsent", on: null },
    read: { status: "unread", on: null },
    popUp: { status: "read", on: null },
    isOrganizational: false,
    createdBy: "u2",
    createdOn: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderBell() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("NotificationBell", () => {
  beforeEach(() => {
    useNotificationsUiStore.setState({ drawerOpen: false });
    getUnsentCount.mockResolvedValue({ count: 2 });
    markAllSent.mockResolvedValue({ modifiedCount: 2 });
    markNotificationRead.mockResolvedValue(
      sampleNotification({
        read: { status: "read", on: new Date().toISOString() },
      })
    );
    listNotifications.mockResolvedValue({
      items: [sampleNotification()],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a badge for unsent count", async () => {
    renderBell();
    expect(
      await screen.findByRole("button", { name: /notifications, 2 new/i })
    ).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("marks all sent when the drawer opens", async () => {
    const user = userEvent.setup();
    renderBell();
    await screen.findByRole("button", { name: /notifications, 2 new/i });
    await user.click(
      screen.getByRole("button", { name: /notifications, 2 new/i })
    );
    await waitFor(() => {
      expect(markAllSent).toHaveBeenCalled();
    });
    expect(await screen.findByText("Task assigned")).toBeInTheDocument();
  });

  it("marks a notification read on click", async () => {
    const user = userEvent.setup();
    renderBell();
    await screen.findByRole("button", { name: /notifications, 2 new/i });
    await user.click(
      screen.getByRole("button", { name: /notifications, 2 new/i })
    );
    await screen.findByText("Task assigned");
    await user.click(screen.getByRole("button", { name: /task assigned/i }));
    await waitFor(() => {
      expect(markNotificationRead).toHaveBeenCalledWith("n1");
    });
  });
});
