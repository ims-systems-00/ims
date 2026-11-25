import type { DocumentModuleLibraryPort } from "../document-management";
import type { AslFileMeta } from "./types";

export type { DocumentModuleLibraryPort };

export type AslEmailPort = {
  send(input: {
    to: string[];
    subject: string;
    html: string;
    text?: string;
    organizationId?: string;
    from?: string;
  }): Promise<void>;
};

export class NoOpAslEmailAdapter implements AslEmailPort {
  async send(): Promise<void> {
    return;
  }
}

export type AslFilesPort = {
  createViewUrl(meta: AslFileMeta): Promise<string>;
  writeStoredFile(input: {
    fileName: string;
    bucket: string;
    contentType: string;
    body: Buffer;
  }): Promise<AslFileMeta>;
  /** Token-gated public upload: mint a signed PUT URL (no session). */
  createSignedUpload(input: {
    organizationId: string;
    fileName: string;
    contentType?: string;
    fileSize?: number;
  }): Promise<{ url: string; storageInfo: AslFileMeta }>;
};

export class NoOpAslFilesAdapter implements AslFilesPort {
  async createViewUrl(): Promise<string> {
    throw new Error("File storage is not configured");
  }
  async writeStoredFile(): Promise<AslFileMeta> {
    throw new Error("File storage is not configured");
  }
  async createSignedUpload(): Promise<{
    url: string;
    storageInfo: AslFileMeta;
  }> {
    throw new Error("File storage is not configured");
  }
}

export type AslTaskPort = {
  createEscalationTask(input: {
    organizationId: string;
    supplierId: string;
    supplierName: string;
    title: string;
    description: string;
    createdBy: string;
  }): Promise<{ id: string } | null>;
};

export class NoOpAslTaskAdapter implements AslTaskPort {
  async createEscalationTask(): Promise<{ id: string } | null> {
    return null;
  }
}

export type AslIncidentPort = {
  createLowScoreIncident(input: {
    organizationId: string;
    supplierId: string;
    supplierName: string;
    score: number;
    note: string;
    createdBy: string;
  }): Promise<{ id: string } | null>;
};

export class NoOpAslIncidentAdapter implements AslIncidentPort {
  async createLowScoreIncident(): Promise<{ id: string } | null> {
    return null;
  }
}

export type AslOrgPort = {
  getOrganizationName(organizationId: string): Promise<string>;
};

export class NoOpAslOrgAdapter implements AslOrgPort {
  async getOrganizationName(): Promise<string> {
    return "Organisation";
  }
}

export type AslUsersPort = {
  listActiveUsers(organizationId: string): Promise<
    Array<{ id: string; email: string }>
  >;
};

export class NoOpAslUsersAdapter implements AslUsersPort {
  async listActiveUsers(): Promise<Array<{ id: string; email: string }>> {
    return [];
  }
}

export type AslNotificationPort = {
  notifyEscalation(input: {
    organizationId: string;
    supplierId?: string;
    userId?: string;
    title: string;
    body: string;
  }): Promise<void>;
  notifyOrgUsers(input: {
    organizationId: string;
    supplierId: string;
    title: string;
    body: string;
  }): Promise<void>;
};

export class NoOpAslNotificationAdapter implements AslNotificationPort {
  async notifyEscalation(): Promise<void> {
    return;
  }
  async notifyOrgUsers(): Promise<void> {
    return;
  }
}
