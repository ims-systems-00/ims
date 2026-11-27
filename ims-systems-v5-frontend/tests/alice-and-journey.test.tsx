import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme";
import * as aliceApi from "@/modules/live-compliance/api/alice";
import * as liveApi from "@/modules/live-compliance/api/live-compliance";
import { AliceTaskSheet } from "@/modules/live-compliance/components/alice-task-sheet";
import { AdviceCards } from "@/modules/live-compliance/components/advice-cards";
import { IsoJourneyPage } from "@/modules/live-compliance/pages/iso-journey-page";
import { useAliceSheetStore } from "@/modules/live-compliance/lib/alice-store";
import type { AdviceItem, AliceDraft, JourneyResponse } from "@/modules/live-compliance/types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAliceSheetStore.setState({ request: null });
});

function renderWith(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

const pendingDraft: AliceDraft = {
  id: "d1",
  task: "training_for_role",
  ref: "r1",
  title: "Competencies for a role",
  status: "pending",
  output: {},
  markdown: "Supervisors lead evacuation.\n\n- **Fire marshal**: Leads evacuation",
  applyLabel: "Add 1 competency to Line supervisor",
  createdBy: "u1",
  createdAt: "2026-11-26T09:00:00.000Z",
  decidedBy: null,
  decidedByName: null,
  decidedAt: null,
  appliedMessage: null,
};

const roleAdvice: AdviceItem = {
  id: "role-r1",
  module: "training",
  clause: "7.2",
  standards: ["ISO 9001"],
  severity: "med",
  due: null,
  title: 'Role "Line supervisor" has no required competencies',
  why: "Set requirements per role.",
  action: { type: "navigate", label: "Set competencies", href: "/training?view=roles" },
  offer: { task: "training_for_role", label: "Suggest competencies for Line supervisor", ref: "r1" },
};

describe("ALICE drafts", () => {
  it("runs a task from an advice offer, then applies the draft only on approval", async () => {
    vi.spyOn(liveApi, "listAdvice").mockResolvedValue({ items: [roleAdvice], total: 1 });
    const run = vi.spyOn(aliceApi, "runAliceTask").mockImplementation(async ({ onStatus }) => {
      onStatus?.("Read your compliance data");
      return pendingDraft;
    });
    const approve = vi.spyOn(aliceApi, "approveAliceDraft").mockResolvedValue({
      ...pendingDraft,
      status: "approved",
      decidedByName: "Sam Patel",
      appliedMessage: "1 competency added to Line supervisor",
    });
    const user = userEvent.setup();
    renderWith(
      <>
        <AdviceCards />
        <AliceTaskSheet />
      </>
    );

    await user.click(await screen.findByRole("button", { name: "Suggest competencies for Line supervisor" }));
    expect(run).toHaveBeenCalledWith(expect.objectContaining({ task: "training_for_role", ref: "r1" }));

    const sheet = await screen.findByRole("dialog");
    expect(await within(sheet).findByText("Supervisors lead evacuation.")).toBeInTheDocument();
    expect(within(sheet).getByText("Draft from your live data. Nothing changes until you approve it.")).toBeInTheDocument();
    expect(approve).not.toHaveBeenCalled();

    await user.click(within(sheet).getByRole("button", { name: "Add 1 competency to Line supervisor" }));
    expect(approve).toHaveBeenCalledWith("d1");
    expect(await within(sheet).findByText(/Approved by Sam Patel/)).toBeInTheDocument();
  });

  it("discards a draft and shows errors from ALICE", async () => {
    const discard = vi.spyOn(aliceApi, "discardAliceDraft").mockResolvedValue({ ...pendingDraft, status: "discarded" });
    const user = userEvent.setup();
    renderWith(<AliceTaskSheet />);
    useAliceSheetStore.getState().open({ kind: "draft", draft: pendingDraft });
    const sheet = await screen.findByRole("dialog");
    await user.click(within(sheet).getByRole("button", { name: "Discard" }));
    expect(discard).toHaveBeenCalledWith("d1");
    await waitFor(() => expect(useAliceSheetStore.getState().request).toBeNull());

    vi.spyOn(aliceApi, "runAliceTask").mockRejectedValue(new Error("Alice is not configured."));
    useAliceSheetStore.getState().open({ kind: "run", task: "gap_analysis", ref: null, label: "Gap analysis" });
    expect(await screen.findByRole("alert")).toHaveTextContent("Alice is not configured.");
  });

  it("offers copy instead of approve for read-only output", async () => {
    renderWith(<AliceTaskSheet />);
    useAliceSheetStore.getState().open({
      kind: "draft",
      draft: { ...pendingDraft, status: "ready", applyLabel: null, task: "explain_clause", title: "Explain clauses" },
    });
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByRole("button", { name: "Copy" })).toBeInTheDocument();
    expect(within(sheet).queryByRole("button", { name: /Approve|Add 1/ })).toBeNull();
  });
});

describe("IsoJourneyPage", () => {
  const journey: JourneyResponse = {
    done: 1,
    total: 12,
    next: "Understand your context",
    steps: [
      {
        id: "scope",
        index: 0,
        title: "Choose standards and scope",
        clauses: ["4.3"],
        module: "compliance",
        asks: "Decide which standards you want.",
        evidence: "A scope statement.",
        href: "/compliance",
        status: "done",
        auto: true,
        clauseStates: [{ clause: "4.3", standard: "ISO 9001", status: "impl" }],
      },
      {
        id: "context",
        index: 1,
        title: "Understand your context",
        clauses: ["4.1", "4.2"],
        module: "compliance",
        asks: "List the issues that affect you.",
        evidence: "An issues list.",
        href: "/compliance",
        status: "now",
        auto: false,
        clauseStates: [{ clause: "4.1", standard: "ISO 9001", status: "not" }],
      },
    ],
  };

  it("shows progress, opens the current step and lets people mark it done", async () => {
    vi.spyOn(aliceApi, "getJourney").mockResolvedValue(journey);
    const mark = vi.spyOn(aliceApi, "setJourneyStep").mockResolvedValue({ ...journey, done: 2 });
    const user = userEvent.setup();
    renderWith(
      <>
        <IsoJourneyPage />
        <AliceTaskSheet />
      </>
    );

    expect(await screen.findByText("1 of 12 steps done")).toBeInTheDocument();
    expect(screen.getByText("Next: Understand your context")).toBeInTheDocument();
    const current = screen.getByRole("button", { name: /Understand your context/, expanded: true });
    expect(current).toBeInTheDocument();
    expect(screen.getByText("List the issues that affect you.")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Clause status" })).toHaveTextContent("4.19001 · Not started");

    await user.click(screen.getByRole("button", { name: "Mark step done" }));
    expect(mark).toHaveBeenCalledWith("context", true);

    vi.spyOn(aliceApi, "runAliceTask").mockReturnValue(new Promise(() => undefined));
    await user.click(screen.getByRole("button", { name: "Explain with ALICE" }));
    expect(useAliceSheetStore.getState().request).toMatchObject({ task: "explain_clause", ref: "4.1,4.2" });

    // Auto-completed steps show why and cannot be un-ticked by hand.
    await user.click(screen.getByRole("button", { name: /Choose standards and scope/ }));
    expect(screen.getByText("Done (clauses in place)")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark not done" })).toBeNull();
  });
});
