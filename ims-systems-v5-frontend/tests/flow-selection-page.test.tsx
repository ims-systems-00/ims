import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme";
import { FlowSelectionPage } from "@/modules/organisation/pages/flow-selection-page";
import * as orgApi from "@/modules/organisation/api/organisations";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const org = {
  id: "aaaaaaaaaaaaaaaaaaaaaaaa",
  reference: "ORG-TEST",
  name: "Acme Systems Ltd",
  industry: "Information technology",
  sizeOfOrganisation: 42,
  officeEmail: "ops@acme.example",
  contactNumber: "+44 20 7000 0000",
  companyNumber: "",
  vatNumber: "",
  address: {
    line1: "10 Example Road",
    line2: "",
    city: "London",
    county: "Greater London",
    postCode: "E1 6AN",
    country: "United Kingdom",
  },
  country: {
    name: "United Kingdom",
    code: "GB",
    currency: "GBP",
    phoneCode: 44,
  },
  isCustomer: false,
  isPartner: false,
  status: "Running" as const,
  licences: {
    superUser: { allocated: 1, used: 1 },
    users: { allocated: 0, used: 0 },
    groups: { allocated: 0, used: 0 },
  },
  referralSource: null,
  logoSrc: null,
  createdBy: "dev-stub-user",
  createdOn: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  membership: null,
};

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
        <MemoryRouter initialEntries={["/onboard/flow-selection"]}>
          <Routes>
            <Route
              path="/onboard/flow-selection"
              element={<FlowSelectionPage />}
            />
            <Route path="/onboard/go-live" element={<p>Go Live form</p>} />
            <Route path="/organisation" element={<p>Workspace</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

describe("FlowSelectionPage", () => {
  it("offers Go Live with no skip-activation bypass for non-customers", async () => {
    vi.spyOn(orgApi, "getCurrentOrganisation").mockResolvedValue(org as never);

    renderPage();

    expect(
      await screen.findByRole("link", { name: /continue to go live/i })
    ).toBeInTheDocument();
    expect(screen.queryByText(/skip activation/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /open organisation/i })
    ).not.toBeInTheDocument();
  });

  it("offers the partner programme application", async () => {
    vi.spyOn(orgApi, "getCurrentOrganisation").mockResolvedValue(org as never);

    renderPage();

    expect(
      await screen.findByRole("link", { name: /apply to become a partner/i })
    ).toBeInTheDocument();
    expect(screen.queryByText(/not available yet/i)).not.toBeInTheDocument();
  });

  it("lets existing customers open the workspace", async () => {
    vi.spyOn(orgApi, "getCurrentOrganisation").mockResolvedValue({
      ...org,
      isCustomer: true,
    } as never);

    renderPage();

    expect(
      await screen.findByRole("link", { name: /already live/i })
    ).toBeInTheDocument();
  });
});
