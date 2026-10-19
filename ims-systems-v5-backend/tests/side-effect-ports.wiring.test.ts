import { describe, expect, it, vi } from "vitest";
import { createCampaignEmailAdapter } from "../src/modules/email-campaign/adapters/email.adapter";
import { NoOpCampaignEmailAdapter } from "../src/modules/email-campaign/ports";
import { createDocumentFilesAdapter } from "../src/modules/document-management/adapters";
import { createReportBugEmailAdapter } from "../src/modules/report-bug";
import { NoOpReportBugEmailAdapter } from "../src/modules/report-bug/ports";
import type { EmailSystem } from "../src/infrastructure/queue";
import type { ObjectStoragePort } from "../src/infrastructure/s3/object-storage";

describe("N-06 / N-07 / N-08 side-effect port wiring", () => {
  it("createCampaignEmailAdapter NoOps when EmailSystem is absent", async () => {
    const port = createCampaignEmailAdapter(undefined);
    expect(port).toBeInstanceOf(NoOpCampaignEmailAdapter);
  });

  it("createCampaignEmailAdapter delegates sendBulk to EmailSystem (N-07)", async () => {
    const sendBulk = vi.fn().mockResolvedValue({ mode: "direct" });
    const email = { sendBulk } as unknown as EmailSystem;
    const port = createCampaignEmailAdapter(email);
    await port.sendBulk({
      to: "a@example.com",
      subject: "Hi",
      html: "<p>x</p>",
    });
    expect(sendBulk).toHaveBeenCalledOnce();
  });

  it("createReportBugEmailAdapter NoOps when EmailSystem is absent (N-08)", async () => {
    const port = createReportBugEmailAdapter(undefined);
    expect(port).toBeInstanceOf(NoOpReportBugEmailAdapter);
  });

  it("createReportBugEmailAdapter delegates sendTransactional (N-08)", async () => {
    const sendTransactional = vi.fn().mockResolvedValue({ mode: "direct" });
    const email = { sendTransactional } as unknown as EmailSystem;
    const port = createReportBugEmailAdapter(email);
    await port.sendTransactional({
      to: "support@example.local",
      subject: "Bug",
      html: "<p>x</p>",
    });
    expect(sendTransactional).toHaveBeenCalledOnce();
  });

  it("createDocumentFilesAdapter deletes via ObjectStorage (N-06)", async () => {
    const deleteObject = vi.fn().mockResolvedValue(undefined);
    const storage = { deleteObject } as unknown as ObjectStoragePort;
    const port = createDocumentFilesAdapter(storage);
    await port.deleteStoredFile({
      Name: "file.pdf",
      Bucket: "bucket",
      Key: "path/file.pdf",
      key: "path/file.pdf",
    });
    expect(deleteObject).toHaveBeenCalledWith({
      bucket: "bucket",
      key: "path/file.pdf",
    });
  });
});
