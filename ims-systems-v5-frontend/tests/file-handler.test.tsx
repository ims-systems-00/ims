import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("@/modules/files/api/files", () => ({
  createUploadUrl: vi.fn(),
  createViewUrl: vi.fn(async () => ({
    url: "https://storage.example/view.pdf",
    expiresInSeconds: 43200,
  })),
  deleteStoredFile: vi.fn(async () => ({ Bucket: "b", Key: "k" })),
  downloadFile: vi.fn(async () => undefined),
  uploadFileViaHandler: vi.fn(
    async (file: File, _path?: string, options?: { onProgress?: (n: number) => void }) => {
      options?.onProgress?.(100);
      return {
        Name: file.name,
        Key: "123e4567-e89b-12d3-a456-426614174000.pdf",
        key: "123e4567-e89b-12d3-a456-426614174000.pdf",
        Bucket: "org-ims-private",
      };
    }
  ),
}));

import { AttachmentRow } from "@/modules/files/components/attachment-row";
import { FileDropZone } from "@/modules/files/components/file-drop-zone";
import {
  formatFileSize,
  getFilePreviewKind,
  isOfficeOnlineCompatibleUrl,
} from "@/modules/files/lib/file-preview";
import * as filesApi from "@/modules/files/api/files";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function withQueryClient(node: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{node}</QueryClientProvider>;
}

describe("file preview classification", () => {
  it("classifies pdf, office, media and unsupported types", () => {
    expect(getFilePreviewKind("report.PDF")).toBe("pdf");
    expect(getFilePreviewKind("photo.png")).toBe("image");
    expect(getFilePreviewKind("brief.docx")).toBe("docx");
    expect(getFilePreviewKind("sheet.xlsx")).toBe("excel");
    expect(getFilePreviewKind("export.csv")).toBe("csv");
    expect(getFilePreviewKind("clip.mp4")).toBe("video");
    expect(getFilePreviewKind("voice.mp3")).toBe("audio");
    expect(getFilePreviewKind("notes.txt")).toBe("text");
    expect(getFilePreviewKind("data.json")).toBe("text");
    expect(getFilePreviewKind("slides.pptx")).toBe("unsupported");
    expect(getFilePreviewKind("archive.zip")).toBe("unsupported");
  });

  it("formats file sizes", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(undefined)).toBe("");
  });

  it("detects URLs Office Online cannot fetch", () => {
    expect(
      isOfficeOnlineCompatibleUrl(
        "http://localhost:3001/api/v1/files/local/object?bucket=b&key=k"
      )
    ).toBe(false);
    expect(
      isOfficeOnlineCompatibleUrl("http://127.0.0.1:3001/files?x=1")
    ).toBe(false);
    expect(
      isOfficeOnlineCompatibleUrl("http://192.168.1.10/api/files?x=1")
    ).toBe(false);
    expect(
      isOfficeOnlineCompatibleUrl(
        "https://cdn.example.com/docs/file.docx?sig=1"
      )
    ).toBe(true);
  });
});

describe("FileDropZone", () => {
  it("uploads a selected file and reports metadata to the parent", async () => {
    const onUploaded = vi.fn();
    const { container } = render(
      withQueryClient(<FileDropZone path="risks" onUploaded={onUploaded} />)
    );

    const input = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File(["evidence"], "evidence.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));
    expect(onUploaded.mock.calls[0]?.[0]).toMatchObject({
      Name: "evidence.pdf",
      Bucket: "org-ims-private",
    });
    expect(await screen.findByText("evidence.pdf")).toBeTruthy();
    expect(vi.mocked(filesApi.uploadFileViaHandler)).toHaveBeenCalledWith(
      file,
      "risks",
      expect.objectContaining({ onProgress: expect.any(Function) })
    );
  });

  it("deletes stored bytes when a staged file is removed", async () => {
    const onRemoved = vi.fn();
    const { container } = render(
      withQueryClient(<FileDropZone path="risks" onRemoved={onRemoved} />)
    );
    const input = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["x"], "a.pdf", { type: "application/pdf" })] },
    });

    const removeButton = await screen.findByRole("button", {
      name: "Remove a.pdf",
    });
    fireEvent.click(removeButton);

    await waitFor(() =>
      expect(vi.mocked(filesApi.deleteStoredFile)).toHaveBeenCalledWith({
        key: "123e4567-e89b-12d3-a456-426614174000.pdf",
        bucket: "org-ims-private",
      })
    );
    await waitFor(() => expect(onRemoved).toHaveBeenCalledTimes(1));
  });
});

describe("AttachmentRow", () => {
  it("renders name, download action and delete intent", async () => {
    const onDelete = vi.fn(async () => undefined);
    render(
      withQueryClient(
        <AttachmentRow
          file={{
            Name: "contract.pdf",
            Key: "123e4567-e89b-12d3-a456-426614174000.pdf",
            key: "123e4567-e89b-12d3-a456-426614174000.pdf",
            Bucket: "org-ims-private",
          }}
          sizeBytes={2048}
          onDelete={onDelete}
        />
      )
    );

    expect(screen.getByText("contract.pdf")).toBeTruthy();
    expect(screen.getByText(/2\.0 KB/)).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Delete contract.pdf" })
    );
    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
  });
});
