import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme";
import { ComplianceToolkitPage } from "@/modules/compliance";
import * as complianceApi from "@/modules/compliance/api/compliance";
import type {
  ComplianceOverview,
  ControlStatus,
} from "@/modules/compliance/types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function makeOverview(): ComplianceOverview {
  const now = new Date().toISOString();
  return {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    organizationId: "000000000000000000000001",
    name: "ISO 9001",
    totalPercentage: 25,
    controlsSelected: 2,
    controlsImplemented: 1,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    sections: [
      {
        section: "4",
        title: "Context",
        totalPercentage: 50,
        controlsSelected: 2,
        controlsImplemented: 1,
        controlCount: 3,
      },
    ],
  };
}

function makeControl(overrides: Partial<ControlStatus> = {}): ControlStatus {
  const now = new Date().toISOString();
  return {
    id: "bbbbbbbbbbbbbbbbbbbbbbbb",
    organizationId: "000000000000000000000001",
    name: "ISO 9001",
    controlId: "cccccccccccccccccccccccc",
    clause: "4.1.a",
    title: "External issues",
    description: "Leaf control",
    annex: "",
    note: "",
    isLocked: false,
    parentClause: "4.1",
    childrenClauses: [],
    moreInfo: null,
    selected: "Not selected",
    state: "Not implemented",
    compliancePercentage: 0,
    numberOfCompliantChildren: 0,
    evidences: [],
    responsibleUserId: null,
    accountableUserId: null,
    consultedUserId: null,
    informedUserId: null,
    groupId: null,
    updatedBy: null,
    updatedOn: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function renderToolkit(path = "/compliance/ISO%209001") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route
              path="/compliance/:toolkitName"
              element={<ComplianceToolkitPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function mockProvisionedToolkit() {
  vi.spyOn(complianceApi, "listComplianceToolkits").mockResolvedValue([
    {
      name: "ISO 9001",
      licensed: true,
      provisioned: true,
      totalPercentage: 25,
      controlsSelected: 2,
      controlsImplemented: 1,
    },
  ]);
  vi.spyOn(complianceApi, "getComplianceOverview").mockResolvedValue(
    makeOverview()
  );
  vi.spyOn(complianceApi, "listComplianceControls").mockResolvedValue({
    items: [makeControl()],
    page: 1,
    pageSize: 25,
    total: 1,
    totalPages: 1,
  });
  vi.spyOn(complianceApi, "getComplianceControl").mockResolvedValue(
    makeControl()
  );
  vi.spyOn(complianceApi, "listControlEvidence").mockResolvedValue({
    items: [],
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 1,
  });
}

describe("ComplianceToolkitPage", () => {
  it("shows overview metrics and opens a control sheet from the toolkit tab", async () => {
    mockProvisionedToolkit();
    renderToolkit();

    expect(
      await screen.findByRole("heading", { name: "ISO 9001" })
    ).toBeInTheDocument();
    expect(await screen.findByText("Overall compliance")).toBeInTheDocument();
    expect(screen.getByText("Compliance Percentage")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getByText("Controls selected")).toBeInTheDocument();
    expect(screen.getByText("Controls implemented")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "ISO 9001" }));
    expect(await screen.findByText("4.1.a")).toBeInTheDocument();
    expect(screen.getByText("External issues")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();

    await userEvent.click(screen.getByText("External issues"));
    expect(
      await screen.findByRole("heading", { name: /4\.1\.a - External issues/i })
    ).toBeInTheDocument();
    expect(screen.getByText("ISO Standard")).toBeInTheDocument();
    expect(screen.getByText(/update status/i)).toBeInTheDocument();
  });

  it("blocks parent clause edits until child clauses are complete", async () => {
    mockProvisionedToolkit();
    const parent = makeControl({
      clause: "4",
      title: "Context of the organization",
      isLocked: true,
      childrenClauses: ["4.1", "4.2", "4.3", "4.4"],
      selected: "Not selected",
      state: "Not implemented",
    });
    vi.spyOn(complianceApi, "listComplianceControls").mockResolvedValue({
      items: [parent],
      page: 1,
      pageSize: 25,
      total: 1,
      totalPages: 1,
    });
    vi.spyOn(complianceApi, "getComplianceControl").mockResolvedValue(parent);

    renderToolkit();

    await userEvent.click(screen.getByRole("tab", { name: "ISO 9001" }));
    await userEvent.click(
      await screen.findByText("Context of the organization")
    );

    expect(
      await screen.findByText(
        /cannot update the parent clause Select Control or Status/i
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Child Clauses:")).toBeInTheDocument();
    expect(screen.getByText("4.1")).toBeInTheDocument();
    expect(screen.getByText("4.4")).toBeInTheDocument();
    expect(screen.queryByText(/update status/i)).not.toBeInTheDocument();
  });

  it("auto-provisions an unprovisioned toolkit", async () => {
    vi.spyOn(complianceApi, "listComplianceToolkits").mockResolvedValue([
      {
        name: "ISO 9001",
        licensed: true,
        provisioned: false,
        totalPercentage: null,
        controlsSelected: null,
        controlsImplemented: null,
      },
    ]);
    const provision = vi
      .spyOn(complianceApi, "provisionComplianceToolkit")
      .mockResolvedValue({ name: "ISO 9001", controlCount: 10 });
    vi.spyOn(complianceApi, "getComplianceOverview").mockResolvedValue(
      makeOverview()
    );
    vi.spyOn(complianceApi, "listComplianceControls").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 25,
      total: 0,
      totalPages: 1,
    });

    renderToolkit();

    expect(
      await screen.findByText(/preparing toolkit controls/i)
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(provision).toHaveBeenCalledWith("ISO 9001");
    });
  });
});
