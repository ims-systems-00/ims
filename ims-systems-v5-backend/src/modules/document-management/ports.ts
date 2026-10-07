/**
 * Cross-module ports for Document Management.
 */

import type { DocumentFileMeta } from "./types";

/** Delete stored binaries when revising or hard-deleting documents. */
export type DocumentFilesPort = {
  deleteStoredFile(meta: DocumentFileMeta): Promise<void>;
};

export class NoOpDocumentFilesAdapter implements DocumentFilesPort {
  async deleteStoredFile(): Promise<void> {
    return;
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
