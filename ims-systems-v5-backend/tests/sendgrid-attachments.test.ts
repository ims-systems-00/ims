import { describe, expect, it, vi } from "vitest";

const sendMock = vi.fn(async () => [
  { statusCode: 202, headers: { "x-message-id": "msg_test" } },
]);

vi.mock("@sendgrid/mail", () => ({
  default: {
    setApiKey: vi.fn(),
    send: sendMock,
  },
}));

describe("SendGrid attachment payload", () => {
  it("sends content_id for inline images and attachment for files", async () => {
    const { createSendGridEmailTransport } = await import(
      "../src/infrastructure/email/sendgrid.transport"
    );
    const transport = createSendGridEmailTransport({
      apiKey: "SG.test",
      fromEmail: "hello@example.com",
      fromName: "iMS",
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      } as never,
    });

    await transport.send({
      to: "user@example.com",
      subject: "Welcome to iMS Systems",
      html: '<img src="cid:logo@imssystems.tech" />',
      category: "transactional",
      attachments: [
        {
          filename: "iMS OS Service Charter.pdf",
          contentBase64: "cGRm",
          type: "application/pdf",
          disposition: "attachment",
        },
        {
          filename: "logo-1.png",
          contentBase64: "aW1n",
          type: "image/png",
          disposition: "inline",
          contentId: "logo@imssystems.tech",
        },
      ],
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const payload = sendMock.mock.calls[0]![0] as {
      attachments: Array<Record<string, string>>;
    };
    expect(payload.attachments).toEqual([
      {
        filename: "iMS OS Service Charter.pdf",
        content: "cGRm",
        type: "application/pdf",
        disposition: "attachment",
      },
      {
        filename: "logo-1.png",
        content: "aW1n",
        type: "image/png",
        disposition: "inline",
        content_id: "logo@imssystems.tech",
      },
    ]);
  });
});
