import { randomUUID } from "node:crypto";
import type { EmailSystem } from "../../../infrastructure/queue";
import type { ObjectStoragePort } from "../../files/ports";
import {
  buildAssessSystemPrompt,
  buildAssessUserPrompt,
  buildDraftSystemPrompt,
  buildDraftUserPrompt,
  buildExtractSystemPrompt,
  buildExtractUserPrompt,
  buildReviewUserPrompt,
  buildSummaryUserPrompt,
  parseAliceJson,
  type AliceDraftContextItem,
} from "../lib/alice";
import type {
  TenderAlicePort,
  TenderAliceTask,
  TenderEmailPort,
  TenderFilesPort,
  TenderNotificationPort,
  TenderOrgMember,
  TenderOrgPort,
  TenderUsersPort,
} from "../ports";

function toContentBase64(content: Buffer | string): string {
  if (typeof content === "string") {
    return Buffer.from(content, "utf8").toString("base64");
  }
  return content.toString("base64");
}

export function createTenderEmailAdapter(
  email: EmailSystem | undefined
): TenderEmailPort {
  return {
    async send(input) {
      if (!email) {
        throw new Error("Email system is not configured");
      }
      const recipients = [
        ...input.to,
        ...(input.cc || []),
      ].filter((addr, i, arr) => Boolean(addr) && arr.indexOf(addr) === i);
      await email.sendTransactional({
        to: recipients,
        subject: input.subject,
        html: input.html,
        text: input.text,
        category: "transactional",
        organizationId: input.organizationId,
        attachments: input.attachments?.map((item) => ({
          filename: item.filename,
          contentBase64: toContentBase64(item.content),
          type: item.contentType,
          disposition: "attachment" as const,
        })),
      });
    },
  };
}

type StorageWithRead = ObjectStoragePort & {
  readObject?: (input: { bucket: string; key: string }) => Promise<Buffer>;
};

export function createTenderFilesAdapter(
  storage: StorageWithRead,
  options?: {
    resolveBucket?: (organizationId: string) => string;
  }
): TenderFilesPort {
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
    async downloadBytes(meta) {
      const bucket = meta.Bucket;
      const key = meta.Key || meta.key || "";
      if (!bucket || !key) {
        throw new Error("File metadata is incomplete");
      }
      if (typeof storage.readObject === "function") {
        return storage.readObject({ bucket, key });
      }
      throw new Error("File download is not available for this storage backend");
    },
  };
}

export function createTenderOrgAdapter(deps: {
  getName: (organizationId: string) => Promise<string | null>;
}): TenderOrgPort {
  return {
    async getOrganizationName(organizationId) {
      return (await deps.getName(organizationId)) || "Organisation";
    },
  };
}

export function createTenderNotificationAdapter(deps: {
  notify: (input: {
    organizationId: string;
    userId?: string;
    title: string;
    body: string;
  }) => Promise<void>;
}): TenderNotificationPort {
  return {
    async notifyPerson(input) {
      await deps.notify(input);
    },
  };
}

export function createTenderUsersAdapter(deps: {
  listMembers: (organizationId: string) => Promise<TenderOrgMember[]>;
}): TenderUsersPort {
  return {
    async listOrgMembers(organizationId) {
      return deps.listMembers(organizationId);
    },
  };
}

export function createTenderAliceAdapter(gpt: {
  generateText(input: {
    prompt: string;
    systemInstructions?: string;
  }): Promise<string>;
}): TenderAlicePort {
  return {
    async run(task: TenderAliceTask, input: Record<string, unknown>) {
      try {
        let systemInstructions = "";
        let prompt = "";
        const tenant = String(input.tenant || input.org || "Organisation");

        if (task === "draft") {
          const limit = input.limit as
            | { kind: string; n: number; spaces?: string | null }
            | null
            | undefined;
          systemInstructions = buildDraftSystemPrompt({
            tenant,
            tone: String(input.tone || ""),
            spacesExcl: limit?.spaces === "excl",
          });
          prompt = buildDraftUserPrompt({
            question: (input.question as {
              ref?: string;
              text: string;
              type?: string;
              section?: string;
              limit?: typeof limit;
            }) || { text: String(input.text || "") },
            criteria: input.criteria as
              | Array<{ name: string; weight: number }>
              | undefined,
            buyer: input.buyer as
              | { name?: string; reference?: string }
              | undefined,
            facts: (input.facts as Record<string, string>) || {},
            context: (input.context as AliceDraftContextItem[]) || [],
            previous: (input.previous as { answer: string } | null) || null,
          });
        } else if (task === "extract") {
          systemInstructions = buildExtractSystemPrompt(tenant);
          prompt = buildExtractUserPrompt({
            name: String(input.name || "document"),
            kind: input.kind ? String(input.kind) : undefined,
            chunk: String(input.chunk || input.text || ""),
            chunkIndex: Number(input.chunkIndex || 0),
            chunkCount: Number(input.chunkCount || 1),
          });
        } else if (task === "assess") {
          systemInstructions = buildAssessSystemPrompt(tenant);
          prompt = buildAssessUserPrompt({
            requirement: (input.requirement as {
              ref?: string;
              text: string;
              level?: string;
            }) || { text: "" },
            evidence:
              (input.evidence as Array<{
                kind: string;
                label: string;
                text: string;
              }>) || [],
          });
        } else if (task === "summary") {
          systemInstructions = `You are ALICE writing a tender executive summary for ${tenant}. Use only the provided INPUT. Output valid JSON only.`;
          prompt = buildSummaryUserPrompt(input);
        } else {
          systemInstructions = `You are ALICE reviewing a tender draft for ${tenant}. Use only the provided INPUT. Output valid JSON only.`;
          prompt = buildReviewUserPrompt(input);
        }

        const raw = await gpt.generateText({ prompt, systemInstructions });
        return parseAliceJson(raw);
      } catch {
        return null;
      }
    },
  };
}
