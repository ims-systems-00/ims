import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("@/modules/files/api/files", () => ({
  createUploadUrl: vi.fn(),
  createViewUrl: vi.fn(async () => ({
    url: "https://storage.example/fresh-logo.png?sig=1",
    expiresInSeconds: 43200,
  })),
  deleteStoredFile: vi.fn(async () => ({ Bucket: "b", Key: "k" })),
  downloadFile: vi.fn(async () => undefined),
  uploadFileViaHandler: vi.fn(),
}));

import { SidebarBrand } from "@/shared/layout/sidebar-brand";
import { useOrganisationLogoUrl } from "@/modules/organisation/hooks/use-organisations";
import * as filesApi from "@/modules/files/api/files";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function wrap(node: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("SidebarBrand", () => {
  it("shows the default iMS Systems branding when the org has no logo", () => {
    render(wrap(<SidebarBrand logoUrl={null} organisationName="Acme Ltd" />));

    expect(screen.getByText("IMS Systems")).toBeTruthy();
    expect(screen.getByText("Platform V5")).toBeTruthy();
    expect(screen.getByText("iMS")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("shows only the organisation logo when a logo is uploaded", () => {
    render(
      wrap(
        <SidebarBrand
          logoUrl="https://storage.example/acme.png"
          organisationName="Acme Ltd"
        />
      )
    );

    const img = screen.getByAltText("Acme Ltd logo") as HTMLImageElement;
    expect(img.src).toContain("https://storage.example/acme.png");
    // Logo-only branding: no org name, no "IMS Systems", no "Platform V5".
    expect(screen.queryByText("Acme Ltd")).toBeNull();
    expect(screen.queryByText("IMS Systems")).toBeNull();
    expect(screen.queryByText("Platform V5")).toBeNull();
  });

  it("keeps the IMS Systems name when there is no logo, even with an org name", () => {
    render(wrap(<SidebarBrand logoUrl={null} organisationName="Acme Ltd" />));
    expect(screen.getByText("IMS Systems")).toBeTruthy();
    expect(screen.queryByText("Acme Ltd")).toBeNull();
  });

  it("falls back to the default branding when the logo fails to load", () => {
    render(
      wrap(
        <SidebarBrand
          logoUrl="https://storage.example/broken.png"
          organisationName="Acme Ltd"
        />
      )
    );

    fireEvent.error(screen.getByAltText("Acme Ltd logo"));

    expect(screen.queryByAltText("Acme Ltd logo")).toBeNull();
    expect(screen.getByText("IMS Systems")).toBeTruthy();
    expect(screen.getByText("Platform V5")).toBeTruthy();
  });
});

function LogoUrlProbe({
  organisation,
}: {
  organisation: Parameters<typeof useOrganisationLogoUrl>[0];
}) {
  const url = useOrganisationLogoUrl(organisation);
  return <output data-testid="logo-url">{url ?? "none"}</output>;
}

describe("useOrganisationLogoUrl", () => {
  it("returns the stored logoSrc when there is no File Handler storage", async () => {
    render(
      wrap(
        <LogoUrlProbe
          organisation={{ logoSrc: "https://cdn.example/logo.png", logoStorage: null }}
        />
      )
    );
    await waitFor(() =>
      expect(screen.getByTestId("logo-url").textContent).toBe(
        "https://cdn.example/logo.png"
      )
    );
    expect(filesApi.createViewUrl).not.toHaveBeenCalled();
  });

  it("mints a fresh view URL when bucket/key are stored", async () => {
    render(
      wrap(
        <LogoUrlProbe
          organisation={{
            logoSrc: "https://cdn.example/expired.png",
            logoStorage: { bucket: "org-bucket", key: "general/logo.png" },
          }}
        />
      )
    );
    await waitFor(() =>
      expect(screen.getByTestId("logo-url").textContent).toBe(
        "https://storage.example/fresh-logo.png?sig=1"
      )
    );
    expect(vi.mocked(filesApi.createViewUrl)).toHaveBeenCalledWith({
      bucket: "org-bucket",
      key: "general/logo.png",
      fileName: "logo",
    });
  });
});
