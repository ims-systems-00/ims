import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PlatformHealthPanel } from "@/shared/components/platform-health-panel";

afterEach(() => {
  cleanup();
});

describe("PlatformHealthPanel", () => {
  it("renders the platform health heading", async () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    render(
      <QueryClientProvider client={client}>
        <PlatformHealthPanel />
      </QueryClientProvider>
    );

    expect(
      screen.getByRole("heading", { name: /platform health/i })
    ).toBeInTheDocument();

    await client.cancelQueries();
    client.clear();
  });
});
