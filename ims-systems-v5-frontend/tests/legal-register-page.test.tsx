import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme";
import { LegalRegisterPage } from "@/modules/legal-register";
import * as legalApi from "@/modules/legal-register/api/legal-register";
import * as liveApi from "@/modules/live-compliance/api/live-compliance";
import type { LegalRegister } from "@/modules/legal-register";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const emptyRegister: LegalRegister = {
  settings: { lastReviewedOn: null, lastReviewedBy: null, reviewIntervalMonths: 12 },
  nextReviewDue: null,
  duties: [],
};

function renderPage(path = "/compliance/legal-register") {
  vi.spyOn(liveApi, "getModuleHealth").mockResolvedValue({
    module: "compliance",
    name: "Compliance",
    percentage: 0,
    worst: "not",
    clauses: [],
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/compliance/legal-register" element={<LegalRegisterPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

describe("LegalRegisterPage", () => {
  it("offers common UK duties when the register is empty", async () => {
    vi.spyOn(legalApi, "getLegalRegister").mockResolvedValue(emptyRegister);
    const addCommon = vi.spyOn(legalApi, "addCommonLegalDuties").mockResolvedValue({ added: 10 });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("No legal duties recorded yet")).toBeInTheDocument();
    expect(screen.getByText("Never reviewed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark register reviewed" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Add common UK duties" }));
    expect(addCommon).toHaveBeenCalled();
  });

  it("opens the evidence form for a duty deep-linked from advice and links evidence", async () => {
    vi.spyOn(legalApi, "getLegalRegister").mockResolvedValue({
      settings: { lastReviewedOn: "2025-12-15T00:00:00.000Z", lastReviewedBy: "u1", reviewIntervalMonths: 12 },
      nextReviewDue: "2026-12-15T00:00:00.000Z",
      duties: [
        {
          id: "d1",
          name: "Waste duty of care and transfer notes",
          legislation: "Environmental Protection Act 1990",
          reference: "s34",
          evidence: [],
          lastCheckedOn: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    const addEvidence = vi.spyOn(legalApi, "addLegalEvidence").mockResolvedValue({} as never);
    const user = userEvent.setup();
    renderPage("/compliance/legal-register?duty=d1");

    expect(await screen.findByText("1 duties · 1 without evidence")).toBeInTheDocument();
    const row = screen.getByRole("row", { name: /Waste duty of care/ });
    expect(within(row).getByText("Missing")).toBeInTheDocument();
    const input = within(row).getByRole("textbox", { name: "Evidence for Waste duty of care and transfer notes" });
    await user.type(input, "Transfer notes 2026");
    await user.click(within(row).getByRole("button", { name: "Link" }));
    expect(addEvidence).toHaveBeenCalledWith("d1", { label: "Transfer notes 2026", url: undefined });
  });
});
