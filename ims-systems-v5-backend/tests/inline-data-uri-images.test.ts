import { describe, expect, it } from "vitest";
import { prepareOutgoingEmailImages } from "../src/infrastructure/email/inline-data-uri-images";

describe("prepareOutgoingEmailImages", () => {
  it("rewrites data:image sources to cid inline attachments", () => {
    const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const result = prepareOutgoingEmailImages({
      to: "rita@example.com",
      subject: "Hello",
      html: `<img src="data:image/png;base64,${pngBase64}" alt="logo" />`,
      category: "transactional",
    });

    expect(result.html).toContain('src="cid:ims-inline-logo-0@imssystems.tech"');
    expect(result.html).not.toContain("data:image/png;base64,");
    expect(result.attachments).toHaveLength(1);
    expect(result.attachments![0]).toMatchObject({
      type: "image/png",
      disposition: "inline",
      contentId: "ims-inline-logo-0@imssystems.tech",
      contentBase64: pngBase64,
    });
  });

  it("leaves ordinary https logos untouched", () => {
    const html = `<img src="https://cdn.example.com/logo.png" alt="logo" />`;
    const result = prepareOutgoingEmailImages({
      to: "rita@example.com",
      subject: "Hello",
      html,
    });
    expect(result.html).toBe(html);
    expect(result.attachments).toBeUndefined();
  });
});
