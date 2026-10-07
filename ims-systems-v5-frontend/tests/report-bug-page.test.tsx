import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme";
import { ReportBugPage } from "@/modules/report-bug";
import * as reportBugApi from "@/modules/report-bug/api/report-bug";
import {
  breadcrumbsForPath,
  navigationSections,
} from "@/shared/navigation";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderPage() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ReportBugPage />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

describe("ReportBugPage", () => {
  it("is linked from the sidebar navigation", () => {
    const workspace = navigationSections.find((s) => s.id === "workspace");
    const item = workspace?.items.find((entry) => entry.id === "report-bug");
    expect(item).toMatchObject({
      label: "Report Bug",
      href: "/report-bug",
    });
    expect(breadcrumbsForPath("/report-bug", navigationSections)).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "Report Bug", href: "/report-bug" },
    ]);
  });

  it("submits category, title, and description", async () => {
    const user = userEvent.setup();
    const submit = vi.spyOn(reportBugApi, "submitReportBug").mockResolvedValue({
      accepted: true,
      category: "Bug",
      title: "Dashboard chart blank",
      emailed: true,
    });

    renderPage();

    await user.selectOptions(
      screen.getByRole("combobox", { name: /category/i }),
      "Bug"
    );
    await user.type(
      screen.getByRole("textbox", { name: /^title/i }),
      "Dashboard chart blank"
    );
    await user.type(
      screen.getByRole("textbox", { name: /^description/i }),
      "Opening Live Dashboard shows an empty chart panel."
    );
    await user.click(
      screen.getByRole("button", { name: /submit report/i })
    );

    await waitFor(() => {
      expect(submit).toHaveBeenCalledWith({
        category: "Bug",
        title: "Dashboard chart blank",
        description: "Opening Live Dashboard shows an empty chart panel.",
      });
    });
  });
});
