import { describe, expect, it, vi } from "vitest";
import { DEV_STUB_IDENTITY } from "../src/security";
import type { Authorizer } from "../src/security";
import { createDocumentManagementService } from "../src/modules/document-management/services/document-management.service";
import {
  rewriteUrlForOnlyOfficeFetch,
  signEditorSessionToken,
} from "../src/modules/document-management/lib/onlyoffice";
import type { DocumentRepositoryStore } from "../src/modules/document-management/repositories/document-repository.repository";
import type { DocumentTreeStore } from "../src/modules/document-management/repositories/document-tree.repository";
import type {
  DocumentActivityPort,
  DocumentFilesPort,
  DocumentNotificationPort,
} from "../src/modules/document-management/ports";
import type {
  DocumentRepository,
  DocumentTreeNode,
} from "../src/modules/document-management/types";
import { ConflictError, ValidationAppError } from "../src/shared";

const ORG = DEV_STUB_IDENTITY.organizationId!;
const USER = DEV_STUB_IDENTITY.subjectId;
const JWT_SECRET = "test-onlyoffice-jwt-secret";

function publishedOfficeNode(
  overrides?: Partial<DocumentTreeNode>
): DocumentTreeNode {
  return {
    id: "node-pub",
    organizationId: ORG,
    repositoryId: "repo-1",
    reference: "DOC-1",
    name: "policy.docx",
    type: "document",
    status: "Published",
    parentNodeId: null,
    documentData: {
      storageInfo: {
        Name: "policy.docx",
        Key: "key-policy.docx",
        key: "key-policy.docx",
        Bucket: "org-bucket",
      },
      purpose: "Policy",
      owners: [USER],
      applicableModules: [],
      complianceTools: [],
      complianceLinks: [],
      authorisation: [
        {
          id: "auth-1",
          userId: "authoriser-1",
          status: "Approved",
          handledOn: new Date(),
          message: "",
        },
      ],
      classification: "",
      dvID: 1,
      conformance: -1,
      threadId: "thread-1",
      reviewDate: null,
    },
    folderData: null,
    createdBy: USER,
    createdOn: new Date(),
    updatedBy: null,
    updatedOn: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as DocumentTreeNode;
}

function buildService(options?: {
  node?: DocumentTreeNode;
  pending?: DocumentTreeNode | null;
  onlyOfficeEnabled?: boolean;
  writeStoredFile?: DocumentFilesPort["writeStoredFile"];
}) {
  const node = options?.node ?? publishedOfficeNode();
  const nodes = new Map<string, DocumentTreeNode>([[node.id, node]]);
  let nodeSeq = 1;
  let pending = options?.pending ?? null;

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

  const trees = {
    async findById(_org: string, id: string) {
      return nodes.get(id) ?? null;
    },
    async findPendingByName() {
      return pending;
    },
    async findActiveByName() {
      return null;
    },
    async createDocument(_org: string, input: Record<string, unknown>) {
      nodeSeq += 1;
      const created = {
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
      nodes.set(created.id, created);
      pending = created.status === "Pending" ? created : pending;
      return created;
    },
    async archivePublishedSibling() {
      return;
    },
  };

  const repositories = {
    async findById(_org: string, id: string) {
      return id === repo.id ? repo : null;
    },
  };

  const written: Array<{ fileName: string; body: Buffer }> = [];
  const files: DocumentFilesPort = {
    async deleteStoredFile() {
      return;
    },
    async createViewUrl() {
      return "https://files.example/view/policy.docx?sig=1";
    },
    async readStoredFile() {
      return Buffer.from("bytes");
    },
    async writeStoredFile(input) {
      written.push({ fileName: input.fileName, body: input.body });
      if (options?.writeStoredFile) {
        return options.writeStoredFile(input);
      }
      return {
        Name: input.fileName,
        Key: `new-${input.fileName}`,
        key: `new-${input.fileName}`,
        Bucket: input.bucket,
      };
    },
  };

  const activities: DocumentActivityPort = {
    async record() {
      return;
    },
  };
  const notifications: DocumentNotificationPort = {
    async notify() {
      return;
    },
  };
  const authorizer: Authorizer = {
    async allow() {
      return true;
    },
  };

  const service = createDocumentManagementService({
    repositories: repositories as unknown as DocumentRepositoryStore,
    trees: trees as unknown as DocumentTreeStore,
    authorizer,
    files,
    activities,
    notifications,
    onlyOffice: {
      enabled: options?.onlyOfficeEnabled ?? true,
      publicUrl: "http://localhost:8088",
      jwtSecret: JWT_SECRET,
      callbackBaseUrl: "http://localhost:3001/api/v1",
    },
  });

  return { service, written, nodes, repo };
}

describe("Document Management OnlyOffice editor session", () => {
  it("creates an editor session for a published Office document", async () => {
    const { service } = buildService();
    const session = await service.createEditorSession(
      DEV_STUB_IDENTITY,
      "repo-1",
      "node-pub"
    );

    expect(session.documentServerUrl).toBe("http://localhost:8088");
    expect(session.config.documentType).toBe("word");
    expect(session.config.document.title).toBe("policy.docx");
    expect(session.config.document.url).toContain("files.example");
    expect(session.config.editorConfig.mode).toBe("edit");
    expect(session.config.editorConfig.callbackUrl).toContain("imsToken=");
    expect(session.config.token).toBeTruthy();
  });

  it("rewrites localhost file URLs so OnlyOffice can fetch from Docker", () => {
    const rewritten = rewriteUrlForOnlyOfficeFetch(
      "http://127.0.0.1:3001/api/v1/files/local/object?bucket=b&key=k.pdf&sig=1",
      "http://host.docker.internal:3001/api/v1"
    );
    expect(rewritten).toBe(
      "http://host.docker.internal:3001/api/v1/files/local/object?bucket=b&key=k.pdf&sig=1"
    );
  });

  it("rejects when OnlyOffice is disabled", async () => {
    const { service } = buildService({ onlyOfficeEnabled: false });
    await expect(
      service.createEditorSession(DEV_STUB_IDENTITY, "repo-1", "node-pub")
    ).rejects.toBeInstanceOf(ValidationAppError);
  });

  it("creates an editor session for a published PDF", async () => {
    const pdf = publishedOfficeNode({
      name: "policy.pdf",
      documentData: {
        ...publishedOfficeNode().documentData!,
        storageInfo: {
          Name: "policy.pdf",
          Key: "k.pdf",
          key: "k.pdf",
          Bucket: "org-bucket",
        },
      },
    });
    const { service } = buildService({ node: pdf });
    const session = await service.createEditorSession(
      DEV_STUB_IDENTITY,
      "repo-1",
      "node-pub"
    );
    expect(session.config.documentType).toBe("pdf");
    expect(session.config.document.fileType).toBe("pdf");
    expect(session.config.document.title).toBe("policy.pdf");
  });

  it("rejects unsupported types and non-Published documents", async () => {
    const zip = publishedOfficeNode({
      name: "archive.zip",
      documentData: {
        ...publishedOfficeNode().documentData!,
        storageInfo: {
          Name: "archive.zip",
          Key: "k.zip",
          key: "k.zip",
          Bucket: "org-bucket",
        },
      },
    });
    const { service: zipService } = buildService({ node: zip });
    await expect(
      zipService.createEditorSession(DEV_STUB_IDENTITY, "repo-1", "node-pub")
    ).rejects.toBeInstanceOf(ValidationAppError);

    const pendingNode = publishedOfficeNode({ status: "Pending" });
    const { service: pendingService } = buildService({ node: pendingNode });
    await expect(
      pendingService.createEditorSession(
        DEV_STUB_IDENTITY,
        "repo-1",
        "node-pub"
      )
    ).rejects.toBeInstanceOf(ValidationAppError);
  });

  it("rejects when a pending sibling already exists", async () => {
    const { service } = buildService({
      pending: publishedOfficeNode({ id: "node-pending", status: "Pending" }),
    });
    await expect(
      service.createEditorSession(DEV_STUB_IDENTITY, "repo-1", "node-pub")
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("persists a new version on save-ready callback", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(Buffer.from("edited-docx-bytes"), { status: 200 })
    );

    const { service, written, nodes } = buildService();
    const token = await signEditorSessionToken(JWT_SECRET, {
      organizationId: ORG,
      repositoryId: "repo-1",
      nodeId: "node-pub",
      userId: USER,
      fileName: "policy.docx",
      bucket: "org-bucket",
    });

    const result = await service.handleEditorCallback(
      "repo-1",
      "node-pub",
      token,
      { status: 2, url: "https://onlyoffice.example/saved.docx" }
    );

    expect(result).toEqual({ error: 0 });
    expect(written).toHaveLength(1);
    expect(written[0]?.fileName).toBe("policy.docx");
    expect([...nodes.values()].some((n) => n.status === "Pending")).toBe(true);

    fetchMock.mockRestore();
  });

  it("ignores non-save callback statuses", async () => {
    const { service } = buildService();
    const token = await signEditorSessionToken(JWT_SECRET, {
      organizationId: ORG,
      repositoryId: "repo-1",
      nodeId: "node-pub",
      userId: USER,
      fileName: "policy.docx",
      bucket: "org-bucket",
    });

    const result = await service.handleEditorCallback(
      "repo-1",
      "node-pub",
      token,
      { status: 1 }
    );
    expect(result).toEqual({ error: 0 });
  });

  it("returns error when callback token does not match the route", async () => {
    const { service } = buildService();
    const token = await signEditorSessionToken(JWT_SECRET, {
      organizationId: ORG,
      repositoryId: "repo-1",
      nodeId: "node-pub",
      userId: USER,
      fileName: "policy.docx",
      bucket: "org-bucket",
    });

    const result = await service.handleEditorCallback(
      "repo-other",
      "node-pub",
      token,
      { status: 2, url: "https://onlyoffice.example/saved.docx" }
    );
    expect(result).toEqual({ error: 1 });
  });
});
