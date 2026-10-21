import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { PartnerDashboardPage } from "@/modules/partnership";
import * as partnerApi from "@/modules/partnership/api/partnerships";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderPage() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/partner/dashboard"]}>
        <PartnerDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("PartnerDashboardPage", () => {
  it("shows partner code, stats, and referred organisations", async () => {
    vi.spyOn(partnerApi, "getPartnershipDashboard").mockResolvedValue({
      partnership: {
        id: "partner-1",
        userId: "user-1",
        organizationId: "org-1",
        serviceProvision: "ISO consultancy",
        customerReach: 50,
        website: "https://acme.example",
        standards: "ISO 9001",
        description: "We help care providers",
        status: "iMS Accepted",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      partnerCode: "partner-1",
      signupUrl:
        "http://localhost:3000/onboard/organisation?partnerCode=partner-1",
      stats: {
        organisations: 2,
        groups: 4,
        users: 15,
        superUsers: 3,
        crmModules: 1,
      },
      complianceBreakdown: [{ toolkit: "ISO 9001", count: 2 }],
      organisations: [
        {
          id: "ref-1",
          name: "Referred One",
          createdAt: new Date().toISOString(),
          isCustomer: true,
          superUser: { allocated: 2, used: 1 },
          users: { allocated: 10, used: 4 },
          groups: { allocated: 3, used: 1 },
          complianceTools: ["ISO 9001"],
          additionalModules: ["CRM"],
        },
      ],
    });

    renderPage();

    expect(await screen.findByText("partner-1")).toBeInTheDocument();
    expect(screen.getByText("Referred One")).toBeInTheDocument();
    expect(screen.getByText(/ISO 9001 · 2/)).toBeInTheDocument();
    expect(screen.getByText("Official partner")).toBeInTheDocument();
  });

  it("prompts non-partners to join the programme", async () => {
    vi.spyOn(partnerApi, "getPartnershipDashboard").mockRejectedValue(
      new Error("No accepted partnership found for this user")
    );

    renderPage();

    expect(
      await screen.findByText("You are not an iMS Systems partner")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /become a partner/i })
    ).toBeInTheDocument();
  });
});
