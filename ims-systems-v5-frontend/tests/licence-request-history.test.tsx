import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LicenceRequestHistory } from "@/modules/organisation/components/licence-request-history";
import * as orgApi from "@/modules/organisation/api/organisations";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderHistory() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <LicenceRequestHistory />
    </QueryClientProvider>
  );
}

describe("LicenceRequestHistory", () => {
  it("shows past licence requests with LR reference and status", async () => {
    vi.spyOn(orgApi, "listLicenceRequests").mockResolvedValue({
      items: [
        {
          id: "lr-1",
          reference: "LR-7",
          organizationId: "org-1",
          requestedBy: "user-1",
          superUser: 0,
          users: 3,
          groups: 0,
          complianceTools: ["ISO 9001"],
          additionalModules: ["CRM"],
          message: "",
          status: "Granted",
          grantedBy: "user-1",
          grantedOn: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    renderHistory();

    expect(await screen.findByText("LR-7")).toBeInTheDocument();
    expect(screen.getByText("Granted")).toBeInTheDocument();
    expect(screen.getByText(/3 User/)).toBeInTheDocument();
    expect(screen.getByText(/CRM/)).toBeInTheDocument();
  });

  it("shows an empty state when there are no requests", async () => {
    vi.spyOn(orgApi, "listLicenceRequests").mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });

    renderHistory();

    expect(
      await screen.findByText("No licence requests yet.")
    ).toBeInTheDocument();
  });
});
