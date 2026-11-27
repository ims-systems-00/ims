import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { notify } from "@/shared/lib/toast";
import * as stream from "@/modules/live-compliance/lib/live-stream";
import {
  transitionToast,
  useLiveComplianceStream,
} from "@/modules/live-compliance/hooks/use-live-compliance-stream";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  stream.setLiveStreamConnected(false);
});

describe("createSseParser", () => {
  it("parses events split across chunks and ignores heartbeats", () => {
    const events: Array<{ type: string; data: unknown }> = [];
    const feed = stream.createSseParser((e) => events.push(e));
    feed("retry: 5000\n\nevent: ready\ndata: {\"at\":\"x\"}\n\n: ping\n\n");
    feed("event: clause.status.changed\r\ndata: {\"clause\":");
    feed("\"7.2\"}\r\n\r\nevent: bad\ndata: not-json\n\n");
    expect(events).toEqual([
      { type: "ready", data: { at: "x" } },
      { type: "clause.status.changed", data: { clause: "7.2" } },
    ]);
  });
});

describe("transitionToast", () => {
  const base = {
    standard: "ISO 9001" as const,
    clause: "7.2",
    title: "Competence",
    module: "training" as const,
    detail: "Sam Patel: CSCS expires in 4 days",
  };

  it("announces worsening and recovery only", () => {
    expect(transitionToast({ ...base, from: "sus", to: "risk" })).toEqual({
      kind: "warning",
      title: "ISO 7.2 Competence is now At risk",
      description: base.detail,
    });
    expect(transitionToast({ ...base, from: "risk", to: "lapsed" })?.kind).toBe("error");
    expect(transitionToast({ ...base, from: "lapsed", to: "sus" })?.title).toBe(
      "ISO 7.2 Competence is back to Sustained"
    );
    expect(transitionToast({ ...base, from: "not", to: "prog" })).toBeNull();
  });
});

function Harness({ enabled = true }: { enabled?: boolean }) {
  useLiveComplianceStream(enabled);
  return null;
}

function renderHarness(client: QueryClient, enabled = true) {
  return render(
    <QueryClientProvider client={client}>
      <Harness enabled={enabled} />
    </QueryClientProvider>
  );
}

describe("useLiveComplianceStream", () => {
  it("refreshes queries, toasts transitions and tracks connection state", async () => {
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const errorToast = vi.spyOn(notify, "error").mockImplementation(() => undefined);
    vi.spyOn(stream, "connectLiveStream").mockImplementation(async ({ onEvent, signal }) => {
      onEvent({ type: "ready", data: { at: "now" } });
      const lapsed = {
        type: "clause.status.changed" as const,
        data: {
          standard: "ISO 9001" as const,
          clause: "7.1.5",
          title: "Monitoring and measuring resources",
          module: "inventory" as const,
          from: "risk" as const,
          to: "lapsed" as const,
          detail: "Torque wrench TW-02: calibration overdue",
        },
      };
      onEvent(lapsed);
      // Same clause, other standard: no second toast.
      onEvent({ ...lapsed, data: { ...lapsed.data, standard: "ISO 45001" } });
      onEvent({ type: "notification.created", data: { count: 1 } });
      await new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve()));
    });

    const { unmount } = renderHarness(client);

    await waitFor(() => expect(stream.isLiveStreamConnected()).toBe(true));
    const keys = invalidate.mock.calls.map(([filters]) => JSON.stringify(filters?.queryKey));
    expect(keys).toContain(JSON.stringify(["live-compliance"]));
    expect(keys).toContain(JSON.stringify(["compliance"]));
    expect(keys).toContain(JSON.stringify(["notifications"]));
    expect(errorToast).toHaveBeenCalledTimes(1);
    expect(errorToast).toHaveBeenCalledWith(
      "ISO 7.1.5 Monitoring and measuring resources has lapsed. Torque wrench TW-02: calibration overdue"
    );

    unmount();
    expect(stream.isLiveStreamConnected()).toBe(false);
  });

  it("gives up without retrying when the stream is forbidden", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const connect = vi
      .spyOn(stream, "connectLiveStream")
      .mockRejectedValue(new stream.LiveStreamHttpError(403));
    renderHarness(new QueryClient());
    await waitFor(() => expect(connect).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(connect).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("reconnects with backoff after the connection drops", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const connect = vi.spyOn(stream, "connectLiveStream").mockResolvedValue(undefined);
    renderHarness(new QueryClient());
    await waitFor(() => expect(connect).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(2_100);
    expect(connect).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(4_100);
    expect(connect).toHaveBeenCalledTimes(3);
    cleanup();
    vi.useRealTimers();
  });

  it("does not connect when disabled", () => {
    const connect = vi.spyOn(stream, "connectLiveStream");
    renderHarness(new QueryClient(), false);
    expect(connect).not.toHaveBeenCalled();
  });
});
