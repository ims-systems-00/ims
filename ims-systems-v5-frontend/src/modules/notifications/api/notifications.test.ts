import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getUnsentCount,
  listNotifications,
  markAllSent,
  markNotificationRead,
} from "./notifications";

describe("notifications api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function stubOk<T>(data: T) {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data,
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
  }

  it("lists notifications with query params", async () => {
    stubOk({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0,
    });

    await listNotifications({ page: 2, pageSize: 10, sortDir: "desc" });
    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain("/notifications?");
    expect(url).toContain("page=2");
    expect(url).toContain("pageSize=10");
    expect(url).toContain("sortDir=desc");
  });

  it("fetches unsent count", async () => {
    stubOk({ count: 3 });
    await expect(getUnsentCount()).resolves.toEqual({ count: 3 });
    const url = String(vi.mocked(fetch).mock.calls[0]?.[0]);
    expect(url).toContain("/notifications/unsent-count");
  });

  it("marks all sent via PATCH", async () => {
    stubOk({ modifiedCount: 2 });
    await expect(markAllSent()).resolves.toEqual({ modifiedCount: 2 });
    const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(init?.method).toBe("PATCH");
  });

  it("marks one notification read", async () => {
    stubOk({ id: "n1", read: { status: "read", on: new Date().toISOString() } });
    await markNotificationRead("n1");
    const [url, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(String(url)).toContain("/notifications/n1/read");
    expect(init?.method).toBe("PATCH");
  });
});
