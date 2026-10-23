import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";

vi.mock("@/modules/invitations/api/invitations", () => ({
  createInvitation: vi.fn(),
  listInvitations: vi.fn(),
  listReceivedInvitations: vi.fn(async () => []),
  resendInvitation: vi.fn(),
  removeInvitation: vi.fn(),
  getInvitationPreview: vi.fn(),
  acceptInvitation: vi.fn(),
}));

import * as invitationsApi from "@/modules/invitations/api/invitations";
import { InviteUserDialog } from "@/modules/invitations/components/invite-user-dialog";
import { InvitationsPanel } from "@/modules/invitations/components/invitations-panel";
import { AcceptInvitationPage } from "@/modules/invitations/pages/accept-invitation-page";

const api = vi.mocked(invitationsApi);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function withQueryClient(node: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{node}</QueryClientProvider>;
}

const invitationFixture = {
  id: "inv-1",
  organizationId: "org-1",
  email: "invited@example.com",
  role: "Basic" as const,
  createdBy: "admin-1",
  inviterName: "Admin One",
  organisationName: "Acme Ltd",
  expiresAt: "2026-10-24T12:00:00.000Z",
  createdAt: "2026-10-21T12:00:00.000Z",
  updatedAt: "2026-10-21T12:00:00.000Z",
  status: "Pending" as const,
  hasAccount: false,
};

describe("InviteUserDialog", () => {
  it("sends an invitation with email and role, then calls onInvited", async () => {
    const user = userEvent.setup();
    api.createInvitation.mockResolvedValue(invitationFixture);
    const onInvited = vi.fn();

    render(
      withQueryClient(
        <InviteUserDialog open onOpenChange={() => undefined} onInvited={onInvited} />
      )
    );

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "Invited@Example.com" },
    });
    await user.selectOptions(screen.getByLabelText(/Role/i), "Head of Service");
    await user.click(screen.getByRole("button", { name: /Send invitation/i }));

    await waitFor(() =>
      expect(api.createInvitation).toHaveBeenCalledWith({
        email: "invited@example.com",
        role: "Head of Service",
      })
    );
    await waitFor(() =>
      expect(onInvited).toHaveBeenCalledWith("invited@example.com")
    );
  }, 15_000);

  it("rejects an invalid email without calling the API", async () => {
    const user = userEvent.setup();
    render(
      withQueryClient(
        <InviteUserDialog open onOpenChange={() => undefined} />
      )
    );

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "not-an-email" },
    });
    await user.click(screen.getByRole("button", { name: /Send invitation/i }));

    expect(await screen.findByText(/Enter a valid email/i)).toBeTruthy();
    expect(api.createInvitation).not.toHaveBeenCalled();
  });
});

describe("InvitationsPanel", () => {
  function stubList() {
    api.listInvitations.mockResolvedValue({
      items: [invitationFixture],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
  }

  it("lists pending invitations and resends from the row menu", async () => {
    const user = userEvent.setup();
    stubList();
    api.resendInvitation.mockResolvedValue(invitationFixture);

    render(withQueryClient(<InvitationsPanel />));

    expect(await screen.findByText("invited@example.com")).toBeTruthy();
    expect(screen.getByText("Sent")).toBeTruthy();
    expect(screen.getByText("No account yet")).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: /Actions for invited@example.com/i })
    );
    await user.click(await screen.findByRole("menuitem", { name: /Resend/i }));
    await waitFor(() =>
      expect(api.resendInvitation).toHaveBeenCalledWith("inv-1")
    );
  }, 15_000);

  it("removes an invitation after confirmation", async () => {
    const user = userEvent.setup();
    stubList();
    api.removeInvitation.mockResolvedValue({ id: "inv-1", deleted: true });

    render(withQueryClient(<InvitationsPanel />));

    expect(await screen.findByText("invited@example.com")).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: /Actions for invited@example.com/i })
    );
    await user.click(await screen.findByRole("menuitem", { name: /Remove/i }));
    await user.click(
      await screen.findByRole("button", { name: /^Remove$/i })
    );
    await waitFor(() =>
      expect(api.removeInvitation).toHaveBeenCalledWith("inv-1")
    );
  }, 15_000);

  it("shows the empty state when there are no invitations", async () => {
    api.listInvitations.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });
    render(withQueryClient(<InvitationsPanel />));
    expect(await screen.findByText(/No pending invitations/i)).toBeTruthy();
  });
});

describe("AcceptInvitationPage", () => {
  it("shows the invitation context and joins the organisation", async () => {
    const user = userEvent.setup();
    api.getInvitationPreview.mockResolvedValue({
      email: "invited@example.com",
      role: "Basic",
      organizationId: "org-1",
      organisationName: "Acme Ltd",
      inviterName: "Admin One",
      expiresAt: "2026-10-24T12:00:00.000Z",
      hasAccount: true,
    });
    api.acceptInvitation.mockResolvedValue({
      organizationId: "org-1",
      organisationName: "Acme Ltd",
      role: "Basic",
      userId: "user-1",
    });

    render(
      withQueryClient(
        <MemoryRouter
          initialEntries={["/auth/onboard/accept-invitation/token-123"]}
        >
          <Routes>
            <Route
              path="/auth/onboard/accept-invitation/:token"
              element={<AcceptInvitationPage />}
            />
            <Route
              path="/auth/preparation-screen"
              element={<p>Preparation</p>}
            />
          </Routes>
        </MemoryRouter>
      )
    );

    expect(await screen.findByText(/Admin One/)).toBeTruthy();
    expect(screen.getAllByText(/Acme Ltd/).length).toBeGreaterThan(0);

    await user.click(
      screen.getByRole("button", { name: /Join organisation/i })
    );
    await waitFor(() =>
      expect(api.acceptInvitation).toHaveBeenCalledWith("token-123")
    );
    expect(await screen.findByText("Preparation")).toBeTruthy();
  });

  it("prompts registration when the invitee has no account", async () => {
    api.getInvitationPreview.mockResolvedValue({
      email: "invited@example.com",
      role: "Basic",
      organizationId: "org-1",
      organisationName: "Acme Ltd",
      inviterName: "Admin One",
      expiresAt: "2026-10-24T12:00:00.000Z",
      hasAccount: false,
    });

    render(
      withQueryClient(
        <MemoryRouter
          initialEntries={["/auth/onboard/accept-invitation/token-123"]}
        >
          <Routes>
            <Route
              path="/auth/onboard/accept-invitation/:token"
              element={<AcceptInvitationPage />}
            />
          </Routes>
        </MemoryRouter>
      )
    );

    expect(
      await screen.findByRole("link", { name: /Register/i })
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /Join organisation/i })
    ).toBeNull();
  });
});
