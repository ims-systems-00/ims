import { describe, expect, it, vi } from "vitest";
import { createUserNotificationAdapter } from "../src/modules/users";
import { NoOpUserNotificationAdapter } from "../src/modules/users/ports";
import type { EmailSystem } from "../src/infrastructure/queue";

describe("UserNotificationAdapter (N-12)", () => {
  it("NoOps when EmailSystem is absent", () => {
    expect(createUserNotificationAdapter(undefined)).toBeInstanceOf(
      NoOpUserNotificationAdapter
    );
  });

  it("sends welcome, revoked and verification emails transactionally", async () => {
    const sendTransactional = vi.fn().mockResolvedValue({ mode: "direct" });
    const adapter = createUserNotificationAdapter({
      sendTransactional,
    } as unknown as EmailSystem);

    await adapter.sendWelcome("a@example.com", "Ada <Admin>");
    await adapter.sendAccessRevoked("a@example.com", "Ada");
    await adapter.resendEmailVerification("a@example.com", "Ada");

    expect(sendTransactional).toHaveBeenCalledTimes(3);
    const subjects = sendTransactional.mock.calls.map(
      (call) => (call[0] as { subject: string }).subject
    );
    expect(subjects).toEqual([
      "Welcome to iMS Systems",
      "Your iMS Systems access has changed",
      "Verify your iMS Systems email",
    ]);
    for (const call of sendTransactional.mock.calls) {
      expect(call[0]).toMatchObject({
        to: "a@example.com",
        category: "transactional",
      });
    }
    // HTML body is escaped; plain text carries the raw name.
    const welcome = sendTransactional.mock.calls[0]![0] as {
      html: string;
      text: string;
    };
    expect(welcome.html).toContain("Ada &lt;Admin&gt;");
    expect(welcome.text).toContain("Ada <Admin>");
  });
});
