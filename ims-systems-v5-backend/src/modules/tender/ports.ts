import type { DocumentModuleLibraryPort } from "../document-management";
import type { TenderFileMeta } from "./types";

export type { DocumentModuleLibraryPort };

export type TenderEmailPort = {
  send(input: {
    to: string[];
    cc?: string[];
    subject: string;
    html: string;
    text?: string;
    organizationId?: string;
    attachments?: Array<{
      filename: string;
      content: Buffer | string;
      contentType?: string;
    }>;
  }): Promise<void>;
};

export class NoOpTenderEmailAdapter implements TenderEmailPort {
  async send(): Promise<void> {
    return;
  }
}

export type TenderFilesPort = {
  createViewUrl(meta: TenderFileMeta): Promise<string>;
  createSignedUpload(input: {
    organizationId: string;
    fileName: string;
    contentType?: string;
    fileSize?: number;
  }): Promise<{ url: string; storageInfo: TenderFileMeta }>;
  downloadBytes?(meta: TenderFileMeta): Promise<Buffer>;
};

export class NoOpTenderFilesAdapter implements TenderFilesPort {
  async createViewUrl(): Promise<string> {
    throw new Error("File storage is not configured");
  }
  async createSignedUpload(): Promise<{
    url: string;
    storageInfo: TenderFileMeta;
  }> {
    throw new Error("File storage is not configured");
  }
}

export type TenderOrgPort = {
  getOrganizationName(organizationId: string): Promise<string>;
};

export class NoOpTenderOrgAdapter implements TenderOrgPort {
  async getOrganizationName(): Promise<string> {
    return "Organisation";
  }
}

export type TenderOrgMember = {
  userId: string;
  name: string;
  email: string;
  jobTitle?: string | null;
};

export type TenderUsersPort = {
  listOrgMembers(organizationId: string): Promise<TenderOrgMember[]>;
};

export class NoOpTenderUsersAdapter implements TenderUsersPort {
  async listOrgMembers(): Promise<TenderOrgMember[]> {
    return [];
  }
}

export type TenderNotificationPort = {
  notifyPerson(input: {
    organizationId: string;
    userId?: string;
    title: string;
    body: string;
  }): Promise<void>;
};

export class NoOpTenderNotificationAdapter implements TenderNotificationPort {
  async notifyPerson(): Promise<void> {
    return;
  }
}

export type TenderAliceTask =
  | "draft"
  | "extract"
  | "assess"
  | "summary"
  | "review";

export type TenderAlicePort = {
  run(
    task: TenderAliceTask,
    input: Record<string, unknown>
  ): Promise<Record<string, unknown> | null>;
};

export class NoOpTenderAliceAdapter implements TenderAlicePort {
  async run(): Promise<Record<string, unknown> | null> {
    return null;
  }
}
