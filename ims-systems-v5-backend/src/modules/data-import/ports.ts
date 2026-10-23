/**
 * Cross-module ports for Data Import.
 */

import type { SecurityIdentity } from "../../security";
import type { DataImportJob, ImportableModule } from "./types";

export type DataImportNotificationPort = {
  notifyImportStarted(input: {
    organizationId: string;
    actorId: string;
    actorName: string;
    module: ImportableModule;
  }): Promise<void>;
  notifyImportCompleted(input: {
    organizationId: string;
    actorId: string;
    module: ImportableModule;
    startedAt: Date;
    durationLabel: string;
  }): Promise<void>;
};

export class NoOpDataImportNotificationAdapter
  implements DataImportNotificationPort
{
  async notifyImportStarted(): Promise<void> {
    return;
  }
  async notifyImportCompleted(): Promise<void> {
    return;
  }
}

/**
 * Persist one transformed row into the target module.
 * Implemented by composing the respective module create services.
 */
export type DataImportTargetWriterPort = {
  insertRow(input: {
    identity: SecurityIdentity;
    module: ImportableModule;
    row: Record<string, unknown>;
  }): Promise<void>;
};

export class NoOpDataImportTargetWriterAdapter
  implements DataImportTargetWriterPort
{
  async insertRow(): Promise<void> {
    return;
  }
}

/** Queue / fire-and-forget runner for background migration. */
export type DataImportQueuePort = {
  enqueue(job: DataImportJob): Promise<void>;
};

export class InlineDataImportQueueAdapter implements DataImportQueuePort {
  constructor(
    private readonly run: (job: DataImportJob) => Promise<void>,
    private readonly onError?: (error: unknown) => void
  ) {}

  async enqueue(job: DataImportJob): Promise<void> {
    void this.run(job).catch((error) => this.onError?.(error));
  }
}
