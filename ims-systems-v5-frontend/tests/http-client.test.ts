import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, ApiClientError } from "@/shared/lib/http";
import { getHealth } from "@/shared/api/health";

describe("apiRequest", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("parses a successful V5 API envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { status: "ok", checks: { database: "up" } },
            correlationId: "c1",
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "x-correlation-id": "c1",
            },
          }
        )
      )
    );

    const data = await apiRequest<{ status: string }>("/health");
    expect(data.status).toBe("ok");
  });

  it("maps API error envelopes to ApiClientError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: { code: "NOT_FOUND", message: "Missing" },
          }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await expect(apiRequest("/missing")).rejects.toMatchObject({
      name: "ApiClientError",
      code: "NOT_FOUND",
      status: 404,
    } satisfies Partial<ApiClientError>);
  });

  it("getHealth validates the health payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { status: "ok", checks: { database: "up" } },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await expect(getHealth()).resolves.toEqual({
      status: "ok",
      checks: { database: "up" },
    });
  });
});
