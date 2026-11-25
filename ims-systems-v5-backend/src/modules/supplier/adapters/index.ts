import { randomUUID } from "node:crypto";
import type { EmailSystem } from "../../../infrastructure/queue";
import type { ObjectStoragePort } from "../../files/ports";
import type {
  AslEmailPort,
  AslFilesPort,
  AslIncidentPort,
  AslNotificationPort,
  AslOrgPort,
  AslTaskPort,
  AslUsersPort,
} from "../ports";
import { ASL_SOURCE_MODULE } from "../types";

export function createAslEmailAdapter(
  email: EmailSystem | undefined
): AslEmailPort {
  return {
    async send(input) {
      if (!email) {
        throw new Error("Email system is not configured");
      }
      await email.sendTransactional({
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        category: "transactional",
        organizationId: input.organizationId,
      });
    },
  };
}

export function createAslFilesAdapter(
  storage: ObjectStoragePort,
  options?: {
    resolveBucket?: (organizationId: string) => string;
  }
): AslFilesPort {
  const resolveBucket =
    options?.resolveBucket ??
    ((organizationId: string) => `ims-v5-${organizationId}`);

  return {
    async createViewUrl(meta) {
      return storage.createViewUrl({
        bucket: meta.Bucket,
        key: meta.Key || meta.key || "",
        expiresInSeconds: 43_200,
        downloadFileName: meta.Name,
        disposition: "inline",
      });
    },
    async writeStoredFile() {
      throw new Error(
        "Upload via File Handler signed URL; server-side write is not used for ASL docs"
      );
    },
    async createSignedUpload(input) {
      const originalName = input.fileName.trim() || "upload.bin";
      const extIndex = originalName.lastIndexOf(".");
      const ext = extIndex > 0 ? originalName.slice(extIndex + 1) : "";
      const key = ext ? `${randomUUID()}.${ext}` : randomUUID();
      const bucket = resolveBucket(input.organizationId);
      const url = await storage.createUploadUrl({
        bucket,
        key,
        expiresInSeconds: 900,
        contentType: input.contentType,
        contentLength: input.fileSize,
      });
      return {
        url,
        storageInfo: {
          Name: originalName,
          Key: key,
          key,
          Bucket: bucket,
          Size: input.fileSize,
        },
      };
    },
  };
}

export function createAslOrgAdapter(deps: {
  getName: (organizationId: string) => Promise<string | null>;
}): AslOrgPort {
  return {
    async getOrganizationName(organizationId) {
      return (await deps.getName(organizationId)) || "Organisation";
    },
  };
}

export function createAslTaskAdapter(deps: {
  createTask: (input: {
    organizationId: string;
    title: string;
    description: string;
    createdBy: string;
    moduleType: string;
    moduleId: string;
  }) => Promise<{ id: string }>;
}): AslTaskPort {
  return {
    async createEscalationTask(input) {
      return deps.createTask({
        organizationId: input.organizationId,
        title: input.title,
        description: input.description,
        createdBy: input.createdBy,
        moduleType: ASL_SOURCE_MODULE,
        moduleId: input.supplierId,
      });
    },
  };
}

export function createAslIncidentAdapter(deps: {
  createIncident: (input: {
    organizationId: string;
    title: string;
    description: string;
    createdBy: string;
    moduleType: string;
    moduleId: string;
  }) => Promise<{ id: string }>;
}): AslIncidentPort {
  return {
    async createLowScoreIncident(input) {
      return deps.createIncident({
        organizationId: input.organizationId,
        title: `Supplier evaluation below threshold: ${input.supplierName}`,
        description: `Weighted score ${input.score}. ${input.note}`.trim(),
        createdBy: input.createdBy,
        moduleType: ASL_SOURCE_MODULE,
        moduleId: input.supplierId,
      });
    },
  };
}

export function createAslUsersAdapter(deps: {
  listActiveUsers: (
    organizationId: string
  ) => Promise<Array<{ id: string; email: string }>>;
}): AslUsersPort {
  return {
    async listActiveUsers(organizationId) {
      return deps.listActiveUsers(organizationId);
    },
  };
}

export function createAslNotificationAdapter(deps: {
  notify: (input: {
    organizationId: string;
    userId?: string;
    title: string;
    body: string;
  }) => Promise<void>;
  notifyOrgUsers: (input: {
    organizationId: string;
    supplierId: string;
    title: string;
    body: string;
  }) => Promise<void>;
}): AslNotificationPort {
  return {
    async notifyEscalation(input) {
      if (input.userId) {
        await deps.notify(input);
        return;
      }
      await deps.notifyOrgUsers({
        organizationId: input.organizationId,
        supplierId: input.supplierId ?? input.organizationId,
        title: input.title,
        body: input.body,
      });
    },
    async notifyOrgUsers(input) {
      await deps.notifyOrgUsers(input);
    },
  };
}
