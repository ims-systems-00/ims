import { describe, expect, it, vi } from "vitest";
import {
  createContactImsService,
  CONTACT_IMS_SUCCESS_MESSAGE,
} from "../src/modules/contact-ims";
import {
  bookDateBodySchema,
  getStartedBodySchema,
} from "../src/modules/contact-ims/schemas";
import type { ContactImsEmailPort } from "../src/modules/contact-ims";
import type {
  BookDateInput,
  GetStartedInput,
} from "../src/modules/contact-ims/types";

function createMockEmail() {
  const sendTransactional = vi.fn(async () => ({
    mode: "sent" as const,
    messageId: "m-1",
  }));
  return {
    port: { sendTransactional } as unknown as ContactImsEmailPort,
    sendTransactional,
  };
}

const contact = {
  name: "Jane Doe",
  email: "jane@example.com",
  jobTitle: "CISO",
  phone: "+441234567890",
  organisationName: "Acme Ltd",
};

const bookDateInput: BookDateInput = {
  ...contact,
  bookedDate: "2026-11-05",
  additionalInformation: "Morning please",
};

const getStartedInput: GetStartedInput = {
  ...contact,
  service: "ISMS",
  iso27001: true,
  iso27002: false,
  iso20000: false,
  iso45001: true,
  iso9001: false,
  iso14001: false,
  iso22301: false,
};

describe("ContactImsService", () => {
  it("getBookedDates always returns an empty list", async () => {
    const { port } = createMockEmail();
    const service = createContactImsService({
      email: port,
      supportEmails: ["support@example.local"],
    });
    await expect(service.getBookedDates(null)).resolves.toEqual([]);
  });

  it("bookDate emails support and the submitter (identity null)", async () => {
    const { port, sendTransactional } = createMockEmail();
    const service = createContactImsService({
      email: port,
      supportEmails: ["support@example.local", "sales@example.local"],
      confirmationDelayMs: 0,
    });

    const result = await service.bookDate(null, bookDateInput);

    expect(result).toEqual({
      accepted: true,
      message: CONTACT_IMS_SUCCESS_MESSAGE,
      emailed: true,
    });
    expect(sendTransactional).toHaveBeenCalledTimes(2);
    expect(sendTransactional).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        to: ["support@example.local", "sales@example.local"],
        subject: "iMS great news (New demo booked)",
        category: "system",
      })
    );
    const supportCall = sendTransactional.mock.calls[0]![0] as {
      html: string;
    };
    expect(supportCall.html).toContain("Acme Ltd");
    expect(supportCall.html).toContain("2026-11-05");
    expect(sendTransactional).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        to: "jane@example.com",
        subject: "Thank You for Requesting a Demo",
        category: "transactional",
      })
    );
  });

  it("bookDate still succeeds when the confirmation email fails", async () => {
    const sendTransactional = vi
      .fn()
      .mockResolvedValueOnce({ mode: "sent", messageId: "m-1" })
      .mockRejectedValueOnce(new Error("rate limited"));
    const service = createContactImsService({
      email: { sendTransactional } as unknown as ContactImsEmailPort,
      supportEmails: ["support@example.local"],
      confirmationDelayMs: 0,
    });

    await expect(service.bookDate(undefined, bookDateInput)).resolves.toMatchObject(
      { accepted: true, emailed: true }
    );
  });

  it("getStarted emails support only (no confirmation)", async () => {
    const { port, sendTransactional } = createMockEmail();
    const service = createContactImsService({
      email: port,
      supportEmails: ["support@example.local"],
    });

    const result = await service.getStarted(null, getStartedInput);

    expect(result.accepted).toBe(true);
    expect(sendTransactional).toHaveBeenCalledTimes(1);
    expect(sendTransactional).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["support@example.local"],
        subject: "iMS great news (New config request)",
      })
    );
    const call = sendTransactional.mock.calls[0]![0] as { text: string };
    expect(call.text).toContain("ISMS");
    expect(call.text).toContain("ISO 27001: true");
    expect(call.text).toContain("ISO 27002: false");
  });

  it("rejects submissions when support emails are not configured", async () => {
    const { port, sendTransactional } = createMockEmail();
    const service = createContactImsService({
      email: port,
      supportEmails: [],
    });

    await expect(service.bookDate(null, bookDateInput)).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(
      service.getStarted(null, getStartedInput)
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(sendTransactional).not.toHaveBeenCalled();
  });
});

describe("Contact IMS schemas", () => {
  it("accepts valid book-date and get-started bodies", () => {
    expect(bookDateBodySchema.safeParse(bookDateInput).success).toBe(true);
    expect(
      bookDateBodySchema.safeParse({ ...contact, bookedDate: "2026-11-05" })
        .success
    ).toBe(true);
    expect(getStartedBodySchema.safeParse(getStartedInput).success).toBe(true);
  });

  it("enforces name/email limits and required fields", () => {
    expect(
      bookDateBodySchema.safeParse({
        ...bookDateInput,
        name: "x".repeat(21),
      }).success
    ).toBe(false);
    expect(
      bookDateBodySchema.safeParse({
        ...bookDateInput,
        email: `${"a".repeat(45)}@example.com`,
      }).success
    ).toBe(false);
    expect(
      bookDateBodySchema.safeParse({ ...bookDateInput, bookedDate: undefined })
        .success
    ).toBe(false);
  });

  it("requires all seven ISO booleans on get-started", () => {
    const { iso22301: _omit, ...rest } = getStartedInput;
    expect(getStartedBodySchema.safeParse(rest).success).toBe(false);
    expect(
      getStartedBodySchema.safeParse({ ...getStartedInput, service: "" })
        .success
    ).toBe(false);
  });
});
