/**
 * Cross-module ports for Document Management.
 */

import type { DocumentFileMeta } from "./types";

/** Delete stored binaries when revising or hard-deleting documents. */
export type DocumentFilesPort = {
  deleteStoredFile(meta: DocumentFileMeta): Promise<void>;
  /** Signed view/download URL for a stored file. */
  createViewUrl(meta: DocumentFileMeta): Promise<string>;
  /** Read raw bytes of a stored file (signature stamping). */
  readStoredFile(meta: DocumentFileMeta): Promise<Buffer>;
  /** Store raw bytes and return their file metadata (signed copies). */
  writeStoredFile(input: {
    fileName: string;
    bucket: string;
    contentType: string;
    body: Buffer;
  }): Promise<DocumentFileMeta>;
};

export class NoOpDocumentFilesAdapter implements DocumentFilesPort {
  async deleteStoredFile(): Promise<void> {
    return;
  }
  async createViewUrl(): Promise<string> {
    throw new Error("File storage is not configured");
  }
  async readStoredFile(): Promise<Buffer> {
    throw new Error("File storage is not configured");
  }
  async writeStoredFile(): Promise<DocumentFileMeta> {
    throw new Error("File storage is not configured");
  }
}

/** Transactional email for share links and signature invitations. */
export type DocumentEmailPort = {
  sendDocumentEmail(input: {
    to: string[];
    subject: string;
    html: string;
    text?: string;
    organizationId?: string;
  }): Promise<void>;
};

export class NoOpDocumentEmailAdapter implements DocumentEmailPort {
  async sendDocumentEmail(): Promise<void> {
    return;
  }
}

/**
 * Organisation membership lookups for Super-Admin-gated cross-org copy.
 * Role values come from the Organisation module ("Super Admin", …).
 */
export type DocumentMembershipPort = {
  getRole(userId: string, organizationId: string): Promise<string | null>;
  listOrganizationIdsForUser(userId: string): Promise<string[]>;
};

export class NoOpDocumentMembershipAdapter
  implements DocumentMembershipPort
{
  async getRole(): Promise<string | null> {
    return null;
  }
  async listOrganizationIdsForUser(): Promise<string[]> {
    return [];
  }
}

export type DocumentActivityPort = {
  record(input: {
    organizationId: string;
    moduleId: string;
    value: string;
    createdBy: string;
    threadId?: string;
  }): Promise<void>;
};

export class NoOpDocumentActivityAdapter implements DocumentActivityPort {
  async record(): Promise<void> {
    return;
  }
}

export type DocumentNotificationRecipient = {
  recipientUserId: string;
  title: string;
  message: string;
  referenceModuleId?: string;
};

export type DocumentNotificationPort = {
  notify(input: {
    organizationId: string;
    createdBy: string;
    recipients: DocumentNotificationRecipient[];
  }): Promise<void>;
};

export class NoOpDocumentNotificationAdapter
  implements DocumentNotificationPort
{
  async notify(): Promise<void> {
    return;
  }
}
