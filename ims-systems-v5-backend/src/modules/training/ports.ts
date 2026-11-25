import type { DocumentModuleLibraryPort } from "../document-management";
import type { TrainingFileMeta } from "./types";

export type { DocumentModuleLibraryPort };

export type TrainingEmailPort = {
  send(input: {
    to: string[];
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

export class NoOpTrainingEmailAdapter implements TrainingEmailPort {
  async send(): Promise<void> {
    return;
  }
}

export type TrainingFilesPort = {
  createViewUrl(meta: TrainingFileMeta): Promise<string>;
  createSignedUpload(input: {
    organizationId: string;
    fileName: string;
    contentType?: string;
    fileSize?: number;
  }): Promise<{ url: string; storageInfo: TrainingFileMeta }>;
};

export class NoOpTrainingFilesAdapter implements TrainingFilesPort {
  async createViewUrl(): Promise<string> {
    throw new Error("File storage is not configured");
  }
  async createSignedUpload(): Promise<{
    url: string;
    storageInfo: TrainingFileMeta;
  }> {
    throw new Error("File storage is not configured");
  }
}

export type TrainingOrgPort = {
  getOrganizationName(organizationId: string): Promise<string>;
};

export class NoOpTrainingOrgAdapter implements TrainingOrgPort {
  async getOrganizationName(): Promise<string> {
    return "Organisation";
  }
}

export type TrainingOrgMember = {
  userId: string;
  name: string;
  email: string;
  jobTitle?: string | null;
};

export type TrainingUsersPort = {
  listOrgMembers(organizationId: string): Promise<TrainingOrgMember[]>;
};

export class NoOpTrainingUsersAdapter implements TrainingUsersPort {
  async listOrgMembers(): Promise<TrainingOrgMember[]> {
    return [];
  }
}

export type TrainingNotificationPort = {
  notifyPerson(input: {
    organizationId: string;
    userId?: string;
    title: string;
    body: string;
  }): Promise<void>;
};

export class NoOpTrainingNotificationAdapter
  implements TrainingNotificationPort
{
  async notifyPerson(): Promise<void> {
    return;
  }
}

export {
  NoOpDocumentModuleLibraryAdapter as NoOpTrainingDocumentsAdapter,
} from "../document-management";
