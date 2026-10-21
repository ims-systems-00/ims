import { describe, expect, it, vi } from "vitest";
import { createGoLiveNotifySideEffectsAdapter } from "../src/modules/organisation/adapters/go-live-notify.adapter";
import type { EmailSystem } from "../src/infrastructure/queue";

type SentInput = {
  to: string | string[];
  subject: string;
  category?: string;
  attachments?: Array<{ filename: string; contentBase64: string }>;
};

function fakeEmail() {
  const sent: SentInput[] = [];
  const email = {
    sendTransactional: vi.fn(async (input: SentInput) => {
      sent.push(input);
      return { mode: "direct" as const, accepted: [] };
    }),
  };
  return { email: email as unknown as EmailSystem, sent };
}

const baseInput = {
  organizationId: "org-1",
  actorId: "user-1",
  actorEmail: "admin@acme.example",
  licences: {
    superUser: 1,
    users: 5,
    groups: 2,
    complianceTools: ["ISO 9001"],
  },
};

describe("createGoLiveNotifySideEffectsAdapter", () => {
  it("sends the onboard-success email with V4 attachments on Card Go Live", async () => {
    const { email, sent } = fakeEmail();
    const adapter = createGoLiveNotifySideEffectsAdapter({
      email,
      supportEmails: ["support@imssystems.tech"],
    });

    await adapter.notifyGoLive({ ...baseInput, paymentType: "Card" });

    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe("admin@acme.example");
    expect(sent[0]?.category).toBe("customer-communication");
    expect(sent[0]?.attachments?.map((a) => a.filename)).toEqual([
      "ims-systems-adoption-pack.pptx",
      "service-charter.pdf",
    ]);
    expect(
      sent[0]?.attachments?.every((a) => a.contentBase64.length > 100)
    ).toBe(true);
  });

  it("also notifies internal support on Monthly invoice Go Live", async () => {
    const { email, sent } = fakeEmail();
    const adapter = createGoLiveNotifySideEffectsAdapter({
      email,
      supportEmails: ["support@imssystems.tech", "accounts@imssystems.tech"],
    });

    await adapter.notifyGoLive({
      ...baseInput,
      paymentType: "Monthly invoice",
    });

    expect(sent).toHaveLength(2);
    const internal = sent.find((row) => row.category === "system");
    expect(internal?.to).toEqual([
      "support@imssystems.tech",
      "accounts@imssystems.tech",
    ]);
    expect(sent.some((row) => row.to === "admin@acme.example")).toBe(true);
  });

  it("skips the customer email when the identity has no email", async () => {
    const { email, sent } = fakeEmail();
    const adapter = createGoLiveNotifySideEffectsAdapter({
      email,
      supportEmails: ["support@imssystems.tech"],
    });

    await adapter.notifyGoLive({
      ...baseInput,
      actorEmail: undefined,
      paymentType: "Card",
    });

    expect(sent).toHaveLength(0);
  });
});
