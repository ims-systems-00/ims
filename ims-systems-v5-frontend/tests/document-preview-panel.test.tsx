import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const downloadMutate = vi.fn();

vi.mock("@/modules/files", () => ({
  FilePreview: ({ file }: { file: { Name: string } }) => (
    <div>preview-body:{file.Name}</div>
  ),
  FilePreviewModal: ({ open }: { open: boolean }) =>
    open ? <div>expanded-preview</div> : null,
  getFilePreviewKind: (name: string) =>
    name.toLowerCase().endsWith(".pdf") ? "pdf" : "unsupported",
  useFileViewUrlQuery: () => ({
    data: { url: "https://storage.example/view.pdf?sig=1" },
  }),
  useDownloadFileMutation: () => ({
    isPending: false,
    mutate: downloadMutate,
  }),
}));

import { DocumentPreviewPanel } from "@/modules/document-management/components/document-preview-panel";
import type { DocumentFileMeta } from "@/modules/document-management/types";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const storageInfo: DocumentFileMeta = {
  Name: "policy.pdf",
  Key: "uuid-policy.pdf",
  key: "uuid-policy.pdf",
  Bucket: "org-bucket",
};

describe("DocumentPreviewPanel", () => {
  it("renders the preview body with a toolbar", () => {
    render(
      <DocumentPreviewPanel storageInfo={storageInfo} title="policy.pdf" />
    );

    expect(screen.getByText("preview-body:policy.pdf")).toBeTruthy();
    expect(screen.getByText("PDF")).toBeTruthy();
    expect(screen.getByLabelText("Download file")).toBeTruthy();
    expect(screen.getByLabelText("Expand preview")).toBeTruthy();
    expect(screen.getByLabelText("Open preview in a new tab")).toBeTruthy();
  });

  it("downloads and expands from the toolbar", () => {
    render(
      <DocumentPreviewPanel storageInfo={storageInfo} title="policy.pdf" />
    );

    fireEvent.click(screen.getByLabelText("Download file"));
    expect(downloadMutate).toHaveBeenCalledWith(
      storageInfo,
      expect.objectContaining({ onError: expect.any(Function) })
    );

    fireEvent.click(screen.getByLabelText("Expand preview"));
    expect(screen.getByText("expanded-preview")).toBeTruthy();
  });

  it("shows a fallback when file metadata is missing", () => {
    render(<DocumentPreviewPanel storageInfo={null} title="Missing" />);

    expect(
      screen.getByText("File metadata missing for this document.")
    ).toBeTruthy();
    expect(screen.queryByLabelText("Download file")).toBeNull();
  });
});
