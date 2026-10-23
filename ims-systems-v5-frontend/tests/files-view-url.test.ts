import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/http", () => ({
  apiRequest: vi.fn(async () => ({
    url: "https://storage.example/view.pdf?sig=1",
    expiresInSeconds: 43200,
  })),
}));

import { apiRequest } from "@/shared/lib/http";
import { createViewUrl } from "@/modules/files/api/files";

describe("createViewUrl disposition", () => {
  it("does not request attachment for previews (inline rendering)", async () => {
    await createViewUrl({
      bucket: "org-bucket",
      key: "file.pdf",
      fileName: "report.pdf",
    });

    const [, init] = vi.mocked(apiRequest).mock.calls.at(-1)!;
    const headers = (init as { headers?: Record<string, string> }).headers;
    expect(headers?.["x-file-disposition"]).toBeUndefined();
  });

  it("requests attachment only for explicit downloads", async () => {
    await createViewUrl({
      bucket: "org-bucket",
      key: "file.pdf",
      fileName: "report.pdf",
      disposition: "attachment",
    });

    const [, init] = vi.mocked(apiRequest).mock.calls.at(-1)!;
    const headers = (init as { headers?: Record<string, string> }).headers;
    expect(headers?.["x-file-disposition"]).toBe("attachment");
  });
});
