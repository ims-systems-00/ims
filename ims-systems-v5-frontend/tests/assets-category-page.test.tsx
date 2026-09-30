import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme";
import { AssetsCategoryPage } from "@/modules/assets";
import * as assetsApi from "@/modules/assets/api/assets";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderHardwarePage() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/assets/hardware"]}>
          <Routes>
            <Route
              path="/assets/hardware"
              element={<AssetsCategoryPage category="hardware" />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

describe("AssetsCategoryPage", () => {
  it("shows loading then empty state", async () => {
    vi.spyOn(assetsApi, "listAssets").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });

    renderHardwarePage();

    expect(screen.getByText(/loading hardware/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByText(/no hardware assets yet/i)
      ).toBeInTheDocument();
    });
  });

  it("renders listed hardware assets and opens create sheet", async () => {
    const user = userEvent.setup();
    vi.spyOn(assetsApi, "listAssets").mockResolvedValue({
      items: [
        {
          id: "aaaaaaaaaaaaaaaaaaaaaaaa",
          organizationId: "000000000000000000000001",
          reference: "HD-TEST",
          name: "Laptop",
          ownerId: "owner-1",
          cost: 1000,
          assignedDate: new Date().toISOString(),
          createdBy: "dev-stub-user",
          deletedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    vi.spyOn(assetsApi, "getAsset").mockResolvedValue({
      id: "aaaaaaaaaaaaaaaaaaaaaaaa",
      organizationId: "000000000000000000000001",
      reference: "HD-TEST",
      name: "Laptop",
      ownerId: "owner-1",
      cost: 1000,
      assignedDate: new Date().toISOString(),
      createdBy: "dev-stub-user",
      deletedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    renderHardwarePage();

    await waitFor(() => {
      expect(screen.getByText("Laptop")).toBeInTheDocument();
    });
    expect(screen.getByText("HD-TEST")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /actions for laptop/i }));
    await user.click(await screen.findByRole("menuitem", { name: /details/i }));
    expect(
      await screen.findByRole("heading", { name: /^laptop$/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^edit$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^delete$/i })).toBeInTheDocument();
  }, 15_000);
  it("opens the create sheet from the page header", async () => {
    const user = userEvent.setup();
    vi.spyOn(assetsApi, "listAssets").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });

    renderHardwarePage();

    await waitFor(() => {
      expect(
        screen.getByText(/no hardware assets yet/i)
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /add hardware/i }));
    expect(
      await screen.findByRole("heading", { name: /add hardware/i })
    ).toBeInTheDocument();
  });

  it("shows API error state", async () => {
    vi.spyOn(assetsApi, "listAssets").mockRejectedValue(
      new Error("Network request failed")
    );

    renderHardwarePage();

    await waitFor(() => {
      expect(
        screen.getByText(/unable to load hardware assets/i)
      ).toBeInTheDocument();
    });
  });
});
