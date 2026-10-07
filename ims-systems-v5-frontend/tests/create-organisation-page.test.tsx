import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme";
import { CreateOrganisationPage } from "@/modules/organisation";
import * as orgApi from "@/modules/organisation/api/organisations";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
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
        <MemoryRouter initialEntries={["/onboard/organisation"]}>
          <Routes>
            <Route
              path="/onboard/organisation"
              element={<CreateOrganisationPage />}
            />
            <Route
              path="/onboard/flow-selection"
              element={<p>Flow selection</p>}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

describe("CreateOrganisationPage", () => {
  it("walks the wizard and creates an organisation", async () => {
    const user = userEvent.setup();
    const create = vi.spyOn(orgApi, "createOrganisation").mockResolvedValue({
      organisation: {
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
        status: "Running",
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
      },
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
    });

    renderPage();

    await user.type(
      screen.getByRole("textbox", { name: /organisation name/i }),
      "Acme Systems Ltd"
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: /industry/i }),
      "Information technology"
    );
    const size = screen.getByRole("spinbutton", {
      name: /size of organisation/i,
    });
    await user.clear(size);
    await user.type(size, "42");
    await user.type(
      screen.getByRole("textbox", { name: /contact number/i }),
      "+44 20 7000 0000"
    );
    await user.type(
      screen.getByRole("textbox", { name: /office email/i }),
      "ops@acme.example"
    );
    await user.click(screen.getByRole("button", { name: /^continue$/i }));

    await user.type(
      screen.getByRole("textbox", { name: /address line 1/i }),
      "10 Example Road"
    );
    await user.type(screen.getByRole("textbox", { name: /^city/i }), "London");
    await user.type(
      screen.getByRole("textbox", { name: /^county/i }),
      "Greater London"
    );
    await user.type(
      screen.getByRole("textbox", { name: /post code/i }),
      "E1 6AN"
    );
    await user.click(screen.getByRole("button", { name: /^continue$/i }));

    await user.click(screen.getByRole("checkbox"));
    await user.click(
      screen.getByRole("button", { name: /create organisation/i })
    );

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Acme Systems Ltd",
          industry: "Information technology",
          sizeOfOrganisation: 42,
          officeEmail: "ops@acme.example",
        })
      );
    });
    expect(window.localStorage.getItem("ims-v5-active-org-id")).toBe(
      "aaaaaaaaaaaaaaaaaaaaaaaa"
    );
    expect(await screen.findByText("Flow selection")).toBeInTheDocument();
  }, 20_000);
});
