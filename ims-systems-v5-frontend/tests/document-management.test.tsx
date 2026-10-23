import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

vi.mock("@/modules/document-management/api/document-management", () => ({
  getNodeVersions: vi.fn(async () => [
    {
      id: "node-v1",
      name: "policy.pdf",
      reference: "DOC-1",
      status: "Archived",
      documentData: {
        dvID: 1,
        storageInfo: { Name: "policy.pdf", Key: "k1", key: "k1", Bucket: "b" },
        owners: [],
      },
      updatedOn: "2026-01-01T00:00:00.000Z",
      createdOn: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "node-v2",
      name: "policy.pdf",
      reference: "DOC-1",
      status: "Published",
      documentData: {
        dvID: 2,
        storageInfo: { Name: "policy.pdf", Key: "k2", key: "k2", Bucket: "b" },
        owners: [],
      },
      updatedOn: "2026-02-01T00:00:00.000Z",
      createdOn: "2026-02-01T00:00:00.000Z",
    },
  ]),
  shareDocument: vi.fn(async () => ({
    sharedWith: ["partner@example.com"],
    expiresAt: "2026-03-01T00:00:00.000Z",
  })),
  inviteSignatures: vi.fn(async () => []),
  listPreservedReviewers: vi.fn(async () => []),
  listSignatures: vi.fn(async () => []),
}));

vi.mock("@/modules/files", () => ({
  downloadFile: vi.fn(async () => undefined),
  FilePreviewModal: () => null,
  useFileViewUrlQuery: () => ({ data: undefined, isLoading: false }),
}));

vi.mock("@/modules/users/hooks/use-users", () => ({
  useUsersQuery: () => ({
    data: { items: [], page: 1, pageSize: 100, total: 0, totalPages: 1 },
    isLoading: false,
  }),
}));

import * as dmApi from "@/modules/document-management/api/document-management";
import { DocumentVersionsPanel } from "@/modules/document-management/components/document-versions-panel";
import { ShareDocumentDialog } from "@/modules/document-management/components/share-document-dialog";
import { SignaturePlacementEditor } from "@/modules/document-management/components/signature-placement-editor";
import type {
  DocumentTreeNode,
  SignatureLocation,
} from "@/modules/document-management/types";

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

const nodeFixture = {
  id: "node-1",
  repositoryId: "repo-1",
  name: "policy.pdf",
  type: "document",
  status: "Published",
} as unknown as DocumentTreeNode;

describe("DocumentVersionsPanel", () => {
  it("renders the version family returned by the API", async () => {
    render(
      withQueryClient(
        <DocumentVersionsPanel
          repositoryId="repo-1"
          nodeId="node-1"
          userNames={{}}
        />
      )
    );

    await waitFor(() => expect(screen.getByText("v2")).toBeTruthy());
    expect(screen.getByText("v1")).toBeTruthy();
    expect(dmApi.getNodeVersions).toHaveBeenCalledWith("repo-1", "node-1");
  });
});

describe("ShareDocumentDialog", () => {
  it("collects recipient emails and shares via the API", async () => {
    render(
      withQueryClient(
        <ShareDocumentDialog
          open
          onOpenChange={() => undefined}
          repositoryId="repo-1"
          node={nodeFixture}
        />
      )
    );

    fireEvent.change(screen.getByLabelText(/Recipient emails/i), {
      target: { value: "partner@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByText("partner@example.com")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    await waitFor(() =>
      expect(dmApi.shareDocument).toHaveBeenCalledWith("repo-1", "node-1", {
        emails: ["partner@example.com"],
        message: undefined,
      })
    );
  });
});

describe("SignaturePlacementEditor", () => {
  const pdfFile = {
    Name: "policy.pdf",
    Key: "uuid-policy.pdf",
    key: "uuid-policy.pdf",
    Bucket: "org-bucket",
  };

  it("adds a draggable signature box on the PDF page", () => {
    function Harness() {
      const [locations, setLocations] = useState<SignatureLocation[]>([]);
      return (
        <>
          <SignaturePlacementEditor
            value={locations}
            onChange={setLocations}
            file={pdfFile}
          />
          <span>{locations.length} location(s)</span>
        </>
      );
    }

    render(withQueryClient(<Harness />));
    // Visual editor: page surface + add-box flow instead of numeric inputs.
    expect(screen.getByTestId("signature-page")).toBeTruthy();
    expect(screen.queryByLabelText(/X from left/i)).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: /Add signature box/i })
    );
    expect(screen.getByText("1 location(s)")).toBeTruthy();
    expect(screen.getByLabelText(/Signature box 1 on page 1/i)).toBeTruthy();
    expect(screen.getByText(/Page 1 · 8%, 72%/i)).toBeTruthy();
  });

  it("explains that non-PDF files cannot be placed yet", () => {
    render(
      withQueryClient(
        <SignaturePlacementEditor
          value={[]}
          onChange={() => undefined}
          file={{ ...pdfFile, Name: "policy.docx" }}
        />
      )
    );

    expect(
      screen.getByText(/Visual signature placement is available for PDF/i)
    ).toBeTruthy();
    expect(screen.queryByTestId("signature-page")).toBeNull();
  });
});
