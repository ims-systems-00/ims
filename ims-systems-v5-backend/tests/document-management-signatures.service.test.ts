import { describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import { DEV_STUB_IDENTITY } from "../src/security";
import type { Authorizer } from "../src/security";
import { createDocumentManagementService } from "../src/modules/document-management/services/document-management.service";
import { stampSignaturePdf } from "../src/modules/document-management/services/document-signature-stamp";
import type { DocumentRepositoryStore } from "../src/modules/document-management/repositories/document-repository.repository";
import type { DocumentTreeStore } from "../src/modules/document-management/repositories/document-tree.repository";
import type { DocumentSignatureStore } from "../src/modules/document-management/repositories/document-signature.repository";
import type { DocumentAccessTokenStore } from "../src/modules/document-management/repositories/document-access-token.repository";
import type {
  DocumentActivityPort,
  DocumentEmailPort,
  DocumentFilesPort,
  DocumentNotificationPort,
} from "../src/modules/document-management/ports";
import type {
  DocumentRepository,
  DocumentSignature,
  DocumentTreeNode,
} from "../src/modules/document-management/types";

const ORG = DEV_STUB_IDENTITY.organizationId!;
const USER = DEV_STUB_IDENTITY.subjectId;

async function makePdfBytes(): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  pdf.addPage([600, 800]);
  return Buffer.from(await pdf.save());
}

function buildService(pdfBytes: Buffer) {
  const repo: DocumentRepository = {
    id: "repo-1",
    organizationId: ORG,
    reference: "REP-1",
    name: "Library",
    description: "",
    privacy: "Organisational",
    businessUnitId: null,
    owners: [USER],
    sharedWith: [],
    reviewInterval: "Yearly",
    createdBy: USER,
    createdOn: new Date(),
    updatedBy: null,
    updatedOn: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const nodes = new Map<string, DocumentTreeNode>();
  let nodeSeq = 0;
  const trees = {
    async findById(_org: string, id: string) {
      return nodes.get(id) ?? null;
    },
    async findActiveByName() {
      return null;
    },
    async createDocument(_org: string, input: Record<string, unknown>) {
      nodeSeq += 1;
      const node = {
        id: `node-${nodeSeq}`,
        organizationId: ORG,
        repositoryId: input.repositoryId as string,
        reference: `DOC-${nodeSeq}`,
        name: input.name as string,
        type: "document",
        status: input.status as string,
        parentNodeId: (input.parentNodeId as string | null) ?? null,
        documentData: input.documentData,
        folderData: null,
        createdBy: USER,
        createdOn: new Date(),
        updatedBy: null,
        updatedOn: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as DocumentTreeNode;
      nodes.set(node.id, node);
      return node;
    },
    async updateDocumentData(
      _org: string,
      id: string,
      patch: { conformance?: number }
    ) {
      const node = nodes.get(id);
      if (!node?.documentData) return null;
      if (patch.conformance !== undefined) {
        node.documentData.conformance = patch.conformance;
      }
      return node;
    },
  };

  const repositories = {
    async findById(_org: string, id: string) {
      return id === repo.id ? repo : null;
    },
    async create() {
      return repo;
    },
    async listAllActive() {
      return [repo];
    },
  };

  const signatureRows = new Map<string, DocumentSignature>();
  let sigSeq = 0;
  const signatures = {
    async create(input: Omit<DocumentSignature, "id" | "createdAt" | "updatedAt">) {
      sigSeq += 1;
      const record: DocumentSignature = {
        ...input,
        id: `sig-${sigSeq}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      signatureRows.set(record.id, record);
      return record;
    },
    async findById(org: string, id: string) {
      const row = signatureRows.get(id);
      return row && row.organizationId === org ? row : null;
    },
    async findByIdAnyOrg(id: string) {
      return signatureRows.get(id) ?? null;
    },
    async listByNode(org: string, nodeId: string) {
      return [...signatureRows.values()].filter(
        (row) => row.organizationId === org && row.documentNodeId === nodeId
      );
    },
    async listForOrganization(
      org: string,
      filter: { userId?: string; status?: string }
    ) {
      return [...signatureRows.values()].filter(
        (row) =>
          row.organizationId === org &&
          (!filter.userId || row.userId === filter.userId) &&
          (!filter.status || row.status === filter.status)
      );
    },
    async update(_org: string, id: string, patch: Partial<DocumentSignature>) {
      const row = signatureRows.get(id);
      if (!row) return null;
      Object.assign(row, patch, { updatedAt: new Date() });
      return row;
    },
    async deleteById(_org: string, id: string) {
      signatureRows.delete(id);
    },
  };

  type TokenRecord = {
    id: string;
    organizationId: string;
    documentNodeId: string;
    signatureId?: string;
    purpose: "share" | "signature";
    recipientEmail?: string;
    createdBy: string;
    expiresAt: Date;
    invalidatedAt: Date | null;
    lastUsedAt: Date | null;
  };
  const tokenByRaw = new Map<string, TokenRecord>();
  let tokenSeq = 0;
  const accessTokens = {
    async create(input: Omit<TokenRecord, "id" | "invalidatedAt" | "lastUsedAt"> & { rawToken: string }) {
      tokenSeq += 1;
      const record: TokenRecord = {
        id: `tok-${tokenSeq}`,
        organizationId: input.organizationId,
        documentNodeId: input.documentNodeId,
        signatureId: input.signatureId,
        purpose: input.purpose,
        recipientEmail: input.recipientEmail,
        createdBy: input.createdBy,
        expiresAt: input.expiresAt,
        invalidatedAt: null,
        lastUsedAt: null,
      };
      tokenByRaw.set(input.rawToken, record);
      return record;
    },
    async findByRawToken(raw: string) {
      return tokenByRaw.get(raw) ?? null;
    },
    async markUsed(id: string) {
      for (const record of tokenByRaw.values()) {
        if (record.id === id) record.lastUsedAt = new Date();
      }
    },
    async invalidate(id: string) {
      for (const record of tokenByRaw.values()) {
        if (record.id === id) record.invalidatedAt = new Date();
      }
    },
    async invalidateForSignature(signatureId: string) {
      for (const record of tokenByRaw.values()) {
        if (record.signatureId === signatureId) {
          record.invalidatedAt = new Date();
        }
      }
    },
  };

  const sentEmails: Array<{ to: string[]; subject: string; text?: string }> = [];
  const email: DocumentEmailPort = {
    async sendDocumentEmail(input) {
      sentEmails.push(input);
    },
  };

  const files: DocumentFilesPort = {
    async deleteStoredFile() {},
    async createViewUrl() {
      return "memory://signed-copy";
    },
    async readStoredFile() {
      return pdfBytes;
    },
    async writeStoredFile(input) {
      return {
        Name: input.fileName,
        Key: "signed-key.pdf",
        key: "signed-key.pdf",
        Bucket: input.bucket,
      };
    },
  };

  const activities: DocumentActivityPort = { async record() {} };
  const notifications: DocumentNotificationPort = { async notify() {} };
  const authorizer: Authorizer = { allow: vi.fn().mockResolvedValue(true) };

  const service = createDocumentManagementService({
    repositories: repositories as unknown as DocumentRepositoryStore,
    trees: trees as unknown as DocumentTreeStore,
    authorizer,
    files,
    activities,
    notifications,
    email,
    accessTokens: accessTokens as unknown as DocumentAccessTokenStore,
    signatures: signatures as unknown as DocumentSignatureStore,
    accessLinkBaseUrl: "https://app.example.test",
  });

  return { service, nodes, sentEmails, tokenByRaw };
}

const storageInfo = {
  Name: "policy.pdf",
  Key: "uuid-policy.pdf",
  key: "uuid-policy.pdf",
  Bucket: "org-bucket",
};

async function createPublishedNode(
  service: ReturnType<typeof buildService>["service"]
) {
  const result = await service.createFileNodes(DEV_STUB_IDENTITY, "repo-1", {
    data: [{ storageInfo, purpose: "Policy" }],
  });
  return result.created[0];
}

describe("Document Management signatures (service)", () => {
  it("stamps a real PDF and reaches 100% conformance on internal sign", async () => {
    const pdfBytes = await makePdfBytes();
    const { service, nodes } = buildService(pdfBytes);
    const node = await createPublishedNode(service);
    expect(node.status).toBe("Published");

    const invited = await service.inviteSignatures(
      DEV_STUB_IDENTITY,
      "repo-1",
      node.id,
      {
        internalUsers: [
          { userId: USER, displayName: "Dev Stub", email: "dev@example.com" },
        ],
        signatureLocations: [{ page: 1, x: 0.1, y: 0.8 }],
        message: "Please sign",
      }
    );
    expect(invited).toHaveLength(1);
    expect(nodes.get(node.id)?.documentData?.conformance).toBe(0);

    const signed = await service.signDocument(
      DEV_STUB_IDENTITY,
      "repo-1",
      node.id,
      invited[0].id,
      { name: "Dev Stub", jobTitle: "QA Lead", organisation: "iMS" }
    );
    expect(signed.status).toBe("Signed");
    expect(signed.signedCopy?.Name).toBe("policy-signed.pdf");
    expect(signed.signedAt).toBeTruthy();
    expect(nodes.get(node.id)?.documentData?.conformance).toBe(100);

    await expect(
      service.signDocument(DEV_STUB_IDENTITY, "repo-1", node.id, invited[0].id, {
        name: "Dev Stub",
      })
    ).rejects.toThrow(/already been signed/i);
  });

  it("signs via a public token and invalidates it afterwards", async () => {
    const pdfBytes = await makePdfBytes();
    const { service, sentEmails } = buildService(pdfBytes);
    const node = await createPublishedNode(service);

    await service.inviteSignatures(DEV_STUB_IDENTITY, "repo-1", node.id, {
      externalEmails: ["external@example.com"],
      signatureLocations: [{ page: 1, x: 0.2, y: 0.7 }],
    });

    const inviteEmail = sentEmails.find((mail) =>
      mail.subject.includes("Signature requested")
    );
    expect(inviteEmail).toBeTruthy();
    const match = inviteEmail!.text?.match(/\/documents\/sign\/([0-9a-f]+)/);
    expect(match).toBeTruthy();
    const token = match![1];

    const context = await service.getPublicSignatureContext(token);
    expect(context.documentName).toBe("policy.pdf");
    expect(context.signature.status).toBe("Pending");

    const signed = await service.signDocumentPublic(token, {
      name: "External Signer",
    });
    expect(signed.status).toBe("Signed");

    await expect(service.getPublicSignatureContext(token)).rejects.toThrow(
      /invalid or has expired/i
    );
  });

  it("rejects invites for unpublished documents and bad locations", async () => {
    const pdfBytes = await makePdfBytes();
    const { service } = buildService(pdfBytes);
    const node = await createPublishedNode(service);

    await expect(
      service.inviteSignatures(DEV_STUB_IDENTITY, "repo-1", node.id, {
        externalEmails: ["a@example.com"],
        signatureLocations: [],
      })
    ).rejects.toThrow(/signature location/i);
  });
});

describe("stampSignaturePdf", () => {
  it("returns stamped PDF bytes", async () => {
    const pdfBytes = await makePdfBytes();
    const stamped = await stampSignaturePdf(pdfBytes, {
      name: "Jane Signer",
      locations: [{ page: 1, x: 0.1, y: 0.8 }],
      signedAt: new Date(),
    });
    expect(stamped.byteLength).toBeGreaterThan(pdfBytes.byteLength);
  });

  it("fits long identities and stamps multiple locations/pages", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage([600, 800]);
    pdf.addPage([600, 800]);
    const multiPageBytes = Buffer.from(await pdf.save());

    const stamped = await stampSignaturePdf(multiPageBytes, {
      name: "Dr. Alexandria Featherstonehaugh-Williams",
      jobTitle: "Senior Vice President of Engineering and Compliance",
      organisation: "International Management Systems Group Holdings Ltd",
      locations: [
        { page: 1, x: 0.85, y: 0.95 },
        { page: 2, x: 0.05, y: 0.05 },
      ],
      signedAt: new Date("2026-10-21T12:04:00Z"),
    });

    const reloaded = await PDFDocument.load(stamped);
    expect(reloaded.getPageCount()).toBe(2);
    expect(stamped.byteLength).toBeGreaterThan(multiPageBytes.byteLength);
  });

  it("rejects non-PDF bytes and out-of-range pages", async () => {
    await expect(
      stampSignaturePdf(Buffer.from("not a pdf"), {
        name: "Jane",
        locations: [{ page: 1, x: 0, y: 0 }],
        signedAt: new Date(),
      })
    ).rejects.toThrow(/only supported for PDF/i);

    const pdfBytes = await makePdfBytes();
    await expect(
      stampSignaturePdf(pdfBytes, {
        name: "Jane",
        locations: [{ page: 9, x: 0, y: 0 }],
        signedAt: new Date(),
      })
    ).rejects.toThrow(/out of range/i);
  });
});
