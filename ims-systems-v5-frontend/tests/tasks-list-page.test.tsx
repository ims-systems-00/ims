import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme";
import { TasksListPage } from "@/modules/tasks";
import * as tasksApi from "@/modules/tasks/api/tasks";
import * as usersApi from "@/modules/users/api/users";
import * as fuApi from "@/modules/functional-units/api/functional-units";
import type { Task } from "@/modules/tasks/types";
import { ApiClientError } from "@/shared/lib/http/errors";
import {
  breadcrumbsForPath,
  navigationSections,
} from "@/shared/navigation";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function makeTask(overrides: Partial<Task> = {}): Task {
  const now = new Date().toISOString();
  return {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    organizationId: "000000000000000000000001",
    reference: "TSK-TEST-001",
    name: "Review access logs",
    description: "Weekly access review",
    dueDate: now,
    priority: "High",
    teamPriority: false,
    assignees: [{ userId: "dev-stub-user", acceptance: "Pending" }],
    status: "Pending",
    completedBy: null,
    completedOn: null,
    attachments: [],
    activity: [],
    createdBy: "dev-stub-user",
    createdOn: now,
    updatedBy: null,
    updatedOn: null,
    nextNudgeAt: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function renderTasksPage(initial = "/tasks") {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[initial]}>
          <Routes>
            <Route path="/tasks" element={<TasksListPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function stubLookups() {
  vi.spyOn(usersApi, "listUsers").mockResolvedValue({
    items: [
      {
        user: {
          id: "bbbbbbbbbbbbbbbbbbbbbbbb",
          reference: "USR-1",
          name: "Ada Lovelace",
          email: "ada@example.com",
          systemAccess: { status: "Active" },
          loggedIn: { status: null, on: null },
        },
        membership: null,
      },
    ],
    page: 1,
    pageSize: 100,
    total: 1,
    totalPages: 1,
  });
  vi.spyOn(usersApi, "getUser").mockResolvedValue({
    user: {
      id: "bbbbbbbbbbbbbbbbbbbbbbbb",
      reference: "USR-1",
      type: "Internal",
      firstName: "Ada",
      lastName: "Lovelace",
      name: "Ada Lovelace",
      email: "ada@example.com",
      emailVerified: { status: "verified", on: null },
      phone: "",
      phoneVerified: { status: "pending", on: null },
      systemPasswordStatus: "ok",
      systemAccess: {
        status: "Active",
        period: "Full time",
        expires: null,
        updatedOn: null,
      },
      accessPolicies: [],
      profileImage: { url: "" },
      signatureInfo: {},
      preferences: { darkMode: false, activeTheme: "default" },
      country: { name: "", code: "" },
      locations: [],
      loggedIn: { status: null, on: null },
      createdBy: null,
      createdOn: null,
      deletedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    membership: null,
  });
  vi.spyOn(fuApi, "listFunctionalUnits").mockResolvedValue({
    items: [],
    page: 1,
    pageSize: 100,
    total: 0,
    totalPages: 1,
  });
}

describe("TasksListPage", () => {
  it("shows loading then empty state", async () => {
    stubLookups();
    vi.spyOn(tasksApi, "listTasks").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });

    renderTasksPage();

    expect(screen.getByText(/loading tasks/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByText(/no tasks in the register yet/i)
      ).toBeInTheDocument();
    });
  });

  it("renders task rows with priority and status", async () => {
    stubLookups();
    vi.spyOn(tasksApi, "listTasks").mockResolvedValue({
      items: [makeTask()],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    vi.spyOn(tasksApi, "getTask").mockResolvedValue(makeTask());

    renderTasksPage();

    await waitFor(() => {
      expect(screen.getByText("Review access logs")).toBeInTheDocument();
    });
    expect(screen.getAllByText("TSK-TEST-001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("High").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pending").length).toBeGreaterThan(0);
  });

  it("opens create sheet from Create task", async () => {
    const user = userEvent.setup();
    stubLookups();
    vi.spyOn(tasksApi, "listTasks").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });

    renderTasksPage();

    await waitFor(() => {
      expect(
        screen.getByText(/no tasks in the register yet/i)
      ).toBeInTheDocument();
    });

    const createButtons = screen.getAllByRole("button", {
      name: /create task/i,
    });
    await user.click(createButtons[0]!);
    expect(
      await screen.findByRole("heading", { name: /^create task$/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/^task name$/i)).toBeInTheDocument();
  }, 15_000);

  it("opens details from row actions with lifecycle controls", async () => {
    const user = userEvent.setup();
    stubLookups();
    const task = makeTask();
    vi.spyOn(tasksApi, "listTasks").mockResolvedValue({
      items: [task],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    vi.spyOn(tasksApi, "getTask").mockResolvedValue(task);

    renderTasksPage();

    await waitFor(() => {
      expect(screen.getByText("Review access logs")).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /actions for review access logs/i })
    );
    await user.click(await screen.findByRole("menuitem", { name: /details/i }));

    expect(
      await screen.findByRole("button", { name: /^edit$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^complete$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^accept$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^nudge$/i })
    ).toBeInTheDocument();
    expect(screen.getAllByText("TSK-TEST-001").length).toBeGreaterThan(0);
  }, 15_000);

  it("shows forbidden state", async () => {
    stubLookups();
    vi.spyOn(tasksApi, "listTasks").mockRejectedValue(
      new ApiClientError({
        message: "Forbidden",
        status: 403,
        code: "FORBIDDEN",
      })
    );

    renderTasksPage();

    await waitFor(() => {
      expect(
        screen.getByText(/you do not have permission to view tasks/i)
      ).toBeInTheDocument();
    });
  });

  it("filters by status preset", async () => {
    const user = userEvent.setup();
    stubLookups();
    const listSpy = vi.spyOn(tasksApi, "listTasks").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });

    renderTasksPage();

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalled();
    });

    await user.selectOptions(
      screen.getByRole("combobox", { name: /filter by status preset/i }),
      "complete"
    );

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ statusPreset: "complete" })
      );
    });
  });

  it("creates a task and invalidates the list", async () => {
    const user = userEvent.setup();
    stubLookups();
    const listSpy = vi.spyOn(tasksApi, "listTasks").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });
    const createSpy = vi
      .spyOn(tasksApi, "createTask")
      .mockResolvedValue(makeTask());

    renderTasksPage();

    await waitFor(() => {
      expect(
        screen.getByText(/no tasks in the register yet/i)
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getAllByRole("button", { name: /create task/i })[0]!
    );
    await screen.findByRole("heading", { name: /^create task$/i });

    await user.type(screen.getByLabelText(/^task name/i), "New task");
    await user.type(screen.getByLabelText(/^description/i), "Do the thing");
    const due = screen.getByLabelText(/^due date/i);
    await user.clear(due);
    await user.type(due, "2026-10-15");

    await user.click(screen.getByLabelText(/ada lovelace/i));
    await user.click(
      screen.getByRole("button", { name: /^create task$/i })
    );

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New task",
          description: "Do the thing",
          teamPriority: false,
          assigneeIds: ["bbbbbbbbbbbbbbbbbbbbbbbb"],
        })
      );
    });

    await waitFor(() => {
      expect(listSpy.mock.calls.length).toBeGreaterThan(1);
    });
  }, 20_000);
});

describe("Tasks navigation", () => {
  it("is listed as a top-level workspace item", () => {
    const tasks = navigationSections[0]!.items.find(
      (item) => item.id === "tasks"
    );
    expect(tasks?.href).toBe("/tasks");
    expect(breadcrumbsForPath("/tasks", navigationSections)).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "Tasks", href: "/tasks" },
    ]);
  });
});
