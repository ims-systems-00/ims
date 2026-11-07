import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const downloadMutate = vi.fn();
const editorMutateAsync = vi.fn();
const invalidateDocuments = vi.fn();

vi.mock("@/shared/lib/env", () => ({
  loadPublicEnv: () => ({
    VITE_API_BASE_URL: "http://127.0.0.1:3001/api/v1",
    VITE_SECURITY_PROVIDER: "development-stub",
    VITE_AUTH0_DOMAIN: "",
    VITE_AUTH0_CLIENT_ID: "",
    VITE_AUTH0_AUDIENCE: "",
    VITE_AUTH0_ORGANIZATION_ID: "",
    VITE_ONLYOFFICE_URL: "http://localhost:8088",
  }),
}));

vi.mock("@/modules/files", () => ({
  FilePreview: ({ file }: { file: { Name: string } }) => (
    <div>preview-body:{file.Name}</div>
  ),
  FilePreviewModal: ({ open }: { open: boolean }) =>
    open ? <div>expanded-preview</div> : null,
  getFilePreviewKind: (name: string) => {
    const lower = name.toLowerCase();
    if (lower.endsWith(".pdf")) return "pdf";
    if (lower.endsWith(".docx") || lower.endsWith(".doc")) return "office";
    return "unsupported";
  },
  useFileViewUrlQuery: () => ({
    data: { url: "https://storage.example/view.pdf?sig=1" },
  }),
  useDownloadFileMutation: () => ({
    isPending: false,
    mutate: downloadMutate,
  }),
}));

vi.mock("@/modules/document-management/hooks/use-document-management", () => ({
  useCreateDocumentEditorSessionMutation: () => ({
    isPending: false,
    mutateAsync: editorMutateAsync,
  }),
  useInvalidateDocumentQueries: () => invalidateDocuments,
}));

vi.mock(
  "@/modules/document-management/components/document-office-editor",
  () => ({
    DocumentOfficeEditor: () => <div>office-editor</div>,
  })
);

import { DocumentPreviewPanel } from "@/modules/document-management/components/document-preview-panel";
import type { DocumentFileMeta } from "@/modules/document-management/types";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const pdfStorage: DocumentFileMeta = {
  Name: "policy.pdf",
  Key: "uuid-policy.pdf",
  key: "uuid-policy.pdf",
  Bucket: "org-bucket",
};

const docxStorage: DocumentFileMeta = {
  Name: "policy.docx",
  Key: "uuid-policy.docx",
  key: "uuid-policy.docx",
  Bucket: "org-bucket",
};

describe("DocumentPreviewPanel", () => {
  it("renders the preview body with a toolbar", () => {
    render(
      <DocumentPreviewPanel storageInfo={pdfStorage} title="policy.pdf" />
    );

    expect(screen.getByText("preview-body:policy.pdf")).toBeTruthy();
    expect(screen.getByText("PDF")).toBeTruthy();
    expect(screen.getByLabelText("Download file")).toBeTruthy();
    expect(screen.getByLabelText("Expand preview")).toBeTruthy();
    expect(screen.getByLabelText("Open preview in a new tab")).toBeTruthy();
    expect(screen.queryByLabelText("Edit document")).toBeNull();
  });

  it("downloads and expands from the toolbar", () => {
    render(
      <DocumentPreviewPanel storageInfo={pdfStorage} title="policy.pdf" />
    );

    fireEvent.click(screen.getByLabelText("Download file"));
    expect(downloadMutate).toHaveBeenCalledWith(
      pdfStorage,
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

  it("shows Edit for published Office documents when OnlyOffice is configured", () => {
    render(
      <DocumentPreviewPanel
        storageInfo={docxStorage}
        title="policy.docx"
        repositoryId="repo-1"
        nodeId="node-1"
        canEditInPreview
      />
    );

    expect(screen.getByText("Office document")).toBeTruthy();
    expect(screen.getByLabelText("Edit document")).toBeTruthy();
  });

  it("shows Edit for published PDFs when OnlyOffice is configured", () => {
    render(
      <DocumentPreviewPanel
        storageInfo={pdfStorage}
        title="policy.pdf"
        repositoryId="repo-1"
        nodeId="node-1"
        canEditInPreview
      />
    );

    expect(screen.getByText("PDF")).toBeTruthy();
    expect(screen.getByLabelText("Edit document")).toBeTruthy();
  });

  it("opens the OnlyOffice editor from Edit", async () => {
    editorMutateAsync.mockResolvedValue({
      documentServerUrl: "http://localhost:8088",
      config: {
        documentType: "word",
        document: {
          fileType: "docx",
          key: "k",
          title: "policy.docx",
          url: "https://example/file",
        },
        editorConfig: {
          mode: "edit",
          callbackUrl: "https://example/callback",
          user: { id: "u", name: "u" },
          customization: { forcesave: true, autosave: true },
        },
        token: "tok",
      },
    });

    render(
      <DocumentPreviewPanel
        storageInfo={docxStorage}
        title="policy.docx"
        repositoryId="repo-1"
        nodeId="node-1"
        canEditInPreview
      />
    );

    fireEvent.click(screen.getByLabelText("Edit document"));
    await waitFor(() => {
      expect(editorMutateAsync).toHaveBeenCalledWith("node-1");
      expect(screen.getByText("office-editor")).toBeTruthy();
      expect(screen.getByLabelText("Close editor")).toBeTruthy();
    });
  });
});
