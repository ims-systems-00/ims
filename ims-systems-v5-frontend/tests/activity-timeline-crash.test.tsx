import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActivityContentView } from "../src/modules/activities/components/activity-content-view";
import { ActivityComposer } from "../src/modules/activities/components/activity-composer";
import { ActivityTimeline } from "../src/modules/activities/components/activity-timeline";

vi.mock("@/security", () => ({
  useSessionSubjectId: () => "507f1f77bcf86cd799439011",
}));

vi.mock("@/modules/users/hooks/use-users", () => ({
  useUserQuery: () => ({ data: { user: { name: "Ada" } } }),
}));

vi.mock("@/modules/files/api/files", () => ({
  createViewUrl: vi.fn(),
  downloadFile: vi.fn(),
  uploadFileViaHandler: vi.fn(),
}));

const { activitiesQueryResult } = vi.hoisted(() => {
  const activitiesPage = {
    page: 1,
    totalPages: 1,
    items: [
      {
        id: "a1",
        organizationId: "o1",
        moduleType: "risks",
        moduleId: "r1",
        value: "<p>Hello <strong>world</strong></p>",
        isAutomated: false,
        iconSrc: null,
        extraLogs: [],
        metaInfo: {},
        groupId: null,
        assignedTo: null,
        assignedOn: null,
        createdBy: "507f1f77bcf86cd799439011",
        createdOn: "2026-01-15T12:00:00.000Z",
        updatedBy: null,
        updatedOn: null,
        createdAt: "2026-01-15T12:00:00.000Z",
        updatedAt: "2026-01-15T12:00:00.000Z",
      },
    ],
  };
  return {
    activitiesQueryResult: {
      data: activitiesPage,
      isLoading: false,
      isError: false,
      isFetching: false,
      error: null,
    },
  };
});

vi.mock("@/modules/activities/hooks/use-activities", () => ({
  useActivitiesQuery: () => activitiesQueryResult,
  useCreateActivityMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUpdateActivityMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteActivityMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

function wrap(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
}

describe("Activity tab stability", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders comments as static HTML without TipTap", () => {
    render(
      <>
        <ActivityContentView value="<p>Hello <strong>world</strong></p>" />
        <ActivityContentView value="plain text comment" />
      </>
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("plain text comment")).toBeInTheDocument();
    expect(document.querySelectorAll(".ProseMirror")).toHaveLength(0);
  });

  it("uses a lightweight composer without TipTap", () => {
    render(<ActivityComposer value="hi" onChange={() => undefined} />);
    expect(screen.getByLabelText("Comment")).toHaveAttribute(
      "contenteditable",
      "true"
    );
    expect(document.querySelectorAll(".ProseMirror")).toHaveLength(0);
  });

  it("mounts ActivityTimeline without crashing the page", async () => {
    wrap(
      <ActivityTimeline moduleType="risks" moduleId="507f1f77bcf86cd799439011" />
    );
    await waitFor(() => {
      expect(screen.getByText("Activity")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getAllByText(/Hello/).length).toBeGreaterThan(0);
    });
    expect(document.querySelectorAll(".ProseMirror")).toHaveLength(0);
  });
});
