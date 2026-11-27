import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme";
import * as liveApi from "@/modules/live-compliance/api/live-compliance";
import {
  ActionCentreButtonInner,
  SignInActionSummaryInner,
} from "@/modules/live-compliance/components/action-centre";
import { actionMeta, useActionCentreStore } from "@/modules/live-compliance/lib/action-centre";
import {
  hasPendingSignInSummary,
  requestSignInSummary,
} from "@/shared/lib/sign-in-summary";
import type { ActionCentreItem, ActionCentreResponse } from "@/modules/live-compliance/types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
  useActionCentreStore.setState({ open: false });
});

const policy: ActionCentreItem = {
  id: "doc-p1-2026-11-20",
  module: "documents",
  clause: "7.5",
  standards: ["ISO 9001"],
  severity: "high",
  due: "2026-11-20",
  title: 'Policy "Health and safety policy" review overdue since 20 Nov 2026',
  why: "Controlled documents must be reviewed on schedule.",
  action: { type: "navigate", label: "Review document", href: "/documents/repositories/r1/nodes/p1" },
  bucket: "now",
};

const supplierCert: ActionCentreItem = {
  id: "sup-s1-soon-d9",
  module: "suppliers",
  clause: "8.4",
  standards: ["ISO 9001"],
  severity: "med",
  due: "2026-12-01",
  title: "Acme Lifting: ISO 9001 certificate expires 1 Dec 2026",
  why: "Approved suppliers need valid certificates.",
  action: { type: "navigate", label: "Upload certificate", href: "/suppliers?supplier=s1&tab=documents" },
  bucket: "week",
};

const ownCert: ActionCentreItem = {
  id: "cert-c1-2027-01-10",
  module: "certificates",
  clause: "",
  standards: ["ISO 45001"],
  severity: "low",
  due: "2027-01-10",
  title: "ISO 45001 certificate expires 10 Jan 2027",
  why: "Keep your own certificates current.",
  action: { type: "navigate", label: "Upload renewed certificate", href: "/tender?view=library" },
  bucket: "later",
};

const response: ActionCentreResponse = {
  evaluatedAt: "2026-11-26T09:00:00.000Z",
  scope: "mine",
  counts: { now: 1, week: 1, later: 1, total: 3 },
  readiness: [{ standard: "ISO 9001", percentage: 82, atRisk: 1, lapsed: 1, worst: "lapsed" }],
  items: [policy, supplierCert, ownCert],
};

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
}

function renderWith(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route
              path="*"
              element={
                <>
                  {ui}
                  <Where />
                </>
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

describe("action centre helpers", () => {
  it("describes module, clause and due date", () => {
    expect(actionMeta(policy)).toBe("Documents · ISO 7.5 · Was due 20 Nov 2026");
    expect(actionMeta(ownCert)).toBe("Certificates · Due 10 Jan 2027");
  });
});

describe("ActionCentreButton", () => {
  it("badges urgent items and lists everything grouped, with a fix button each", async () => {
    vi.spyOn(liveApi, "getActionCentre").mockResolvedValue(response);
    const user = userEvent.setup();
    renderWith(<ActionCentreButtonInner />);

    const trigger = await screen.findByRole(
      "button",
      { name: "Action centre, 2 need attention" },
      { timeout: 3_000 }
    );
    await user.click(trigger);

    expect(await screen.findByText("3 things to keep you audit-ready")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Audit readiness" })).toHaveTextContent("82% audit-ready");
    const overdue = screen.getByRole("region", { name: "Overdue" });
    expect(within(overdue).getByRole("listitem", { name: policy.title })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Due this week" })).toHaveTextContent("Acme Lifting");
    expect(screen.getByRole("region", { name: "Coming up" })).toHaveTextContent("ISO 45001 certificate");

    await user.click(within(overdue).getByRole("button", { name: "Review document" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/documents/repositories/r1/nodes/p1");
    await waitFor(() => expect(useActionCentreStore.getState().open).toBe(false));
  });

  it("shows an all-clear state", async () => {
    vi.spyOn(liveApi, "getActionCentre").mockResolvedValue({
      ...response,
      counts: { now: 0, week: 0, later: 0, total: 0 },
      items: [],
    });
    const user = userEvent.setup();
    renderWith(<ActionCentreButtonInner />);
    await user.click(await screen.findByRole("button", { name: "Action centre" }, { timeout: 3_000 }));
    expect(await screen.findByText("You're all caught up")).toBeInTheDocument();
  });
});

describe("SignInActionSummary", () => {
  it("pops up after entering an organisation, with only overdue and this-week items", async () => {
    vi.spyOn(liveApi, "getActionCentre").mockResolvedValue(response);
    requestSignInSummary();
    const user = userEvent.setup();
    const { unmount } = renderWith(<SignInActionSummaryInner />);

    const dialog = await screen.findByRole("dialog", {}, { timeout: 3_000 });
    expect(hasPendingSignInSummary()).toBe(false);
    expect(within(dialog).getByText(/2 things need you/)).toBeInTheDocument();
    expect(within(dialog).getByText("1 overdue, 1 due this week. Fix them now and you stay audit-ready.")).toBeInTheDocument();
    expect(within(dialog).getByText(policy.title)).toBeInTheDocument();
    expect(within(dialog).queryByText(ownCert.title)).toBeNull();

    await user.click(within(dialog).getByRole("button", { name: "See all 3" }));
    expect(useActionCentreStore.getState().open).toBe(true);
    unmount();

    // A refresh in the same session (no new sign-in) does not show it again.
    renderWith(<SignInActionSummaryInner />);
    await new Promise((r) => setTimeout(r, 600));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows again on the next sign-in, with an all-clear when nothing is due", async () => {
    vi.spyOn(liveApi, "getActionCentre").mockResolvedValue({
      ...response,
      counts: { now: 0, week: 0, later: 0, total: 0 },
      items: [],
    });
    requestSignInSummary();
    renderWith(<SignInActionSummaryInner />);
    const dialog = await screen.findByRole("dialog", {}, { timeout: 3_000 });
    expect(within(dialog).getByText(/You're all caught up/)).toBeInTheDocument();
    expect(within(dialog).getByRole("list", { name: "Audit readiness" })).toBeInTheDocument();
  });

  it("lists what is coming up when nothing is urgent", async () => {
    vi.spyOn(liveApi, "getActionCentre").mockResolvedValue({
      ...response,
      counts: { now: 0, week: 0, later: 1, total: 1 },
      items: [ownCert],
    });
    requestSignInSummary();
    renderWith(<SignInActionSummaryInner />);
    const dialog = await screen.findByRole("dialog", {}, { timeout: 3_000 });
    expect(within(dialog).getByText(/Nothing urgent today/)).toBeInTheDocument();
    expect(within(dialog).getByText(ownCert.title)).toBeInTheDocument();
  });

  it("waits for the sign-in intro overlay to finish", async () => {
    vi.spyOn(liveApi, "getActionCentre").mockResolvedValue(response);
    requestSignInSummary();
    const overlay = document.createElement("div");
    overlay.id = "imsi";
    document.documentElement.appendChild(overlay);
    renderWith(<SignInActionSummaryInner />);
    await new Promise((r) => setTimeout(r, 900));
    expect(screen.queryByRole("dialog")).toBeNull();
    overlay.remove();
    expect(await screen.findByRole("dialog", {}, { timeout: 2_000 })).toBeInTheDocument();
  });
});
