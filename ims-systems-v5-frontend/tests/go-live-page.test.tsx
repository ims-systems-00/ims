import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme";
import { GoLivePage } from "@/modules/organisation";
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
  membership: {
    id: "bbbbbbbbbbbbbbbbbbbbbbbb",
    organizationId: "aaaaaaaaaaaaaaaaaaaaaaaa",
    userId: "dev-stub-user",
    role: "Super Admin",
    jobTitle: "",
    createdOn: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
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
        <MemoryRouter initialEntries={["/onboard/go-live"]}>
          <Routes>
            <Route path="/onboard/go-live" element={<GoLivePage />} />
            <Route path="/organisation" element={<p>My organisation</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

describe("GoLivePage", () => {
  it("submits go-live and navigates to organisation", async () => {
    const user = userEvent.setup();
    vi.spyOn(orgApi, "getCurrentOrganisation").mockResolvedValue(org);
    const goLive = vi.spyOn(orgApi, "goLiveOrganisation").mockResolvedValue({
      organisation: { ...org, isCustomer: true },
      paymentSession: null,
    });

    renderPage();

    expect(await screen.findByRole("heading", { name: /go live/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^go live$/i }));

    await waitFor(() => {
      expect(goLive).toHaveBeenCalledWith(
        "aaaaaaaaaaaaaaaaaaaaaaaa",
        expect.objectContaining({
          paymentType: "Monthly invoice",
          superUser: 1,
        })
      );
    });
    expect(await screen.findByText("My organisation")).toBeInTheDocument();
  });
});
