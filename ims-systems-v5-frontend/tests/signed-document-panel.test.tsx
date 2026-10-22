import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("@/modules/document-management/api/document-management", () => ({
  listSignatures: vi.fn(),
}));

vi.mock("@/modules/files", () => ({
  FilePreview: ({ file }: { file: { Name: string } }) => (
    <div>preview-body:{file.Name}</div>
  ),
  FilePreviewModal: ({ open }: { open: boolean }) =>
    open ? <div>expanded-preview</div> : null,
  getFilePreviewKind: (name: string) =>
    name.toLowerCase().endsWith(".pdf") ? "pdf" : "unsupported",
  useFileViewUrlQuery: () => ({
    data: { url: "https://storage.example/signed.pdf?sig=1" },
  }),
  useDownloadFileMutation: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
  downloadFile: vi.fn(async () => undefined),
}));

import * as dmApi from "@/modules/document-management/api/document-management";
import { SignedDocumentPanel } from "@/modules/document-management/components/signed-document-panel";
import type {
  DocumentSignature,
  DocumentTreeNode,
} from "@/modules/document-management/types";

const api = vi.mocked(dmApi);

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

const node = {
  id: "node-1",
  repositoryId: "repo-1",
  name: "policy.pdf",
  type: "document",
  status: "Published",
} as unknown as DocumentTreeNode;

function signedSignature(overrides: Partial<DocumentSignature> = {}): DocumentSignature {
  return {
    id: "sig-1",
    organizationId: "org-1",
    repositoryId: "repo-1",
    documentNodeId: "node-1",
    inviteeType: "user",
    userId: "user-1",
    displayName: "Ada Lovelace",
    message: "",
    status: "Signed",
    signatureLocations: [{ page: 1, x: 0.1, y: 0.8 }],
    signatureName: "Ada Lovelace",
    jobTitle: "Compliance Manager",
    organisation: "Acme Ltd",
    signedCopy: {
      Name: "policy-signed.pdf",
      Key: "uuid-signed.pdf",
      key: "uuid-signed.pdf",
      Bucket: "org-bucket",
    },
    lastOpenedAt: null,
    signedAt: "2026-10-21T10:00:00.000Z",
    createdBy: "admin-1",
    createdAt: "2026-10-20T10:00:00.000Z",
    updatedAt: "2026-10-21T10:00:00.000Z",
    ...overrides,
  };
}

describe("SignedDocumentPanel", () => {
  it("previews the signed copy in-app and defaults to the latest signer", async () => {
    api.listSignatures.mockResolvedValue([
      signedSignature(),
      signedSignature({
        id: "sig-2",
        displayName: "Grace Hopper",
        signatureName: "Grace Hopper",
        signedAt: "2026-10-21T12:00:00.000Z",
        signedCopy: {
          Name: "policy-signed-grace.pdf",
          Key: "uuid-signed-2.pdf",
          key: "uuid-signed-2.pdf",
          Bucket: "org-bucket",
        },
      }),
    ]);

    render(withQueryClient(<SignedDocumentPanel repositoryId="repo-1" node={node} />));

    // Latest signed copy (Grace) is previewed first.
    expect(await screen.findByText("preview-body:policy-signed-grace.pdf")).toBeTruthy();
    expect(screen.getByText(/Signed by/)).toBeTruthy();
    expect(screen.getAllByText(/Grace Hopper/).length).toBeGreaterThan(0);

    // Switching signer swaps the inline preview.
    fireEvent.click(screen.getByRole("tab", { name: /Ada Lovelace/ }));
    await waitFor(() =>
      expect(screen.getByText("preview-body:policy-signed.pdf")).toBeTruthy()
    );
  });

  it("shows an empty state when nobody has signed yet", async () => {
    api.listSignatures.mockResolvedValue([
      signedSignature({ status: "Pending", signedCopy: undefined, signedAt: null }),
    ]);

    render(withQueryClient(<SignedDocumentPanel repositoryId="repo-1" node={node} />));

    expect(await screen.findByText("Nothing signed yet")).toBeTruthy();
    expect(screen.queryByText(/preview-body/)).toBeNull();
  });
});
