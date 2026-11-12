import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  SetupChecklistCard,
  useSetupGuideStore,
} from "@/modules/setup-guide";

vi.mock("@/modules/security/hooks/use-security-capabilities", async () => {
  const actual = await vi.importActual<
    typeof import("@/modules/security/hooks/use-security-capabilities")
  >("@/modules/security/hooks/use-security-capabilities");
  return {
    ...actual,
    useSecurityCapabilitiesQuery: () => ({
      data: {
        permissions: [
          "functional-units:read",
          "document-management:read",
          "compliance:read",
          "risks:read",
          "audits:read",
          "management-reviews:read",
        ],
      },
      isLoading: false,
      isError: false,
    }),
  };
});

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  useSetupGuideStore.setState({
    checklistHidden: false,
    activeStepId: null,
    subIndex: 0,
    completedSteps: {},
    events: {},
    aliceAssistOpen: false,
    lastDocumentContext: null,
    lastControlContext: null,
    lastRiskContext: null,
    lastAuditContext: null,
    lastRepositoryContext: null,
    seedPending: false,
    focusChecklistToken: 0,
  });
  try {
    localStorage.removeItem("ims.setup-guide.progress");
    localStorage.removeItem("ims.setup-guide.hidden");
  } catch {
    /* ignore */
  }
});

function renderChecklist() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="*" element={<SetupChecklistCard />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("SetupChecklistCard", () => {
  it("renders the checklist and starts the Organisation step", async () => {
    const user = userEvent.setup();
    renderChecklist();

    expect(
      screen.getByRole("heading", { name: /get set up/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/set up your organisation/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();

    const startButtons = screen.getAllByRole("button", { name: /^start$/i });
    expect(startButtons.length).toBe(9);
    await user.click(startButtons[0]!);
    expect(useSetupGuideStore.getState().activeStepId).toBe("org");
  });

  it("can start every available setup step", async () => {
    const user = userEvent.setup();
    const expected = [
      "docs",
      "link",
      "soa",
      "risk",
      "audit",
      "review",
      "remote",
      "alice",
    ] as const;
    for (let index = 0; index < expected.length; index += 1) {
      if (index > 0) {
        useSetupGuideStore.getState().closeGuide();
        useSetupGuideStore.getState().showChecklist();
        cleanup();
        renderChecklist();
      } else {
        renderChecklist();
      }
      await user.click(
        screen.getAllByRole("button", { name: /^start$/i })[index + 1]!
      );
      expect(useSetupGuideStore.getState().activeStepId).toBe(expected[index]);
    }
  });

  it("hides the card until opened again", async () => {
    const user = userEvent.setup();
    renderChecklist();

    await user.click(screen.getByRole("button", { name: /hide for now/i }));
    expect(useSetupGuideStore.getState().checklistHidden).toBe(true);
    expect(
      screen.queryByRole("heading", { name: /get set up/i })
    ).not.toBeInTheDocument();

    useSetupGuideStore.getState().openChecklist();
    // Re-render by forcing store-driven remount via another render
    cleanup();
    renderChecklist();
    expect(
      screen.getByRole("heading", { name: /get set up/i })
    ).toBeInTheDocument();
  });

  it("keeps Done markers and still allows replaying a finished step", async () => {
    const user = userEvent.setup();
    useSetupGuideStore.getState().finishStep("org");
    renderChecklist();

    expect(screen.getByText(/^done$/i)).toBeInTheDocument();
    const replay = screen.getByRole("button", { name: /^replay$/i });
    await user.click(replay);
    expect(useSetupGuideStore.getState().activeStepId).toBe("org");
    expect(useSetupGuideStore.getState().completedSteps.org).toBe(true);
  });
});
