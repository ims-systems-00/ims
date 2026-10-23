/**
 * Data Import application service.
 * Spec: docs/module-specifications/data-import.md
 */

import type { SecurityIdentity } from "../../../security";
import type { Authorizer } from "../../../security";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared/errors/app-error";
import {
  getImportableFields,
  MODULE_OPTIONS,
} from "../catalogs/importable-fields";
import type {
  DataImportNotificationPort,
  DataImportQueuePort,
} from "../ports";
import type {
  ImportableFieldSchema,
  ImportableModule,
  ImportDateFormat,
  ImportDataMap,
  ImportDataRow,
  ModuleOption,
  ValidationOutcome,
} from "../types";
import { DATA_IMPORT_RESOURCE } from "../types";
import { validateDataSet } from "./validation.service";

type RequireOrgIdentity = SecurityIdentity & { organizationId: string };

function requireOrg(
  identity: SecurityIdentity | null | undefined
): RequireOrgIdentity {
  if (!identity?.subjectId) {
    throw new UnauthorizedError("Authentication required");
  }
  if (!identity.organizationId) {
    throw new UnauthorizedError("Organisation context required");
  }
  return identity as RequireOrgIdentity;
}

export type DataImportServiceDeps = {
  authorizer: Authorizer;
  notifications: DataImportNotificationPort;
  queue: DataImportQueuePort;
};

export function createDataImportService(deps: DataImportServiceDeps) {
  const { authorizer, notifications, queue } = deps;

  async function assertAllowed(
    identity: SecurityIdentity | null | undefined,
    action: string
  ): Promise<RequireOrgIdentity> {
    const orgIdentity = requireOrg(identity);
    const allowed = await authorizer.allow({
      identity: orgIdentity,
      action,
      resourceType: DATA_IMPORT_RESOURCE,
      organizationId: orgIdentity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError(
        "User does not have permission to access data import"
      );
    }
    return orgIdentity;
  }

  return {
    async listModules(
      identity: SecurityIdentity | null | undefined
    ): Promise<ModuleOption[]> {
      await assertAllowed(identity, "read");
      return MODULE_OPTIONS;
    },

    async getSchema(
      identity: SecurityIdentity | null | undefined,
      module: ImportableModule
    ): Promise<{ message: string; schema: ImportableFieldSchema[] }> {
      await assertAllowed(identity, "read");
      const schema = getImportableFields(module);
      if (!schema) {
        throw new NotFoundError(`Unknown import module: ${module}`);
      }
      return {
        message: "Schema retrieved successfully.",
        schema,
      };
    },

    async validate(
      identity: SecurityIdentity | null | undefined,
      input: {
        module: ImportableModule;
        dateFormat: ImportDateFormat;
        dataMap: ImportDataMap;
        dataSet: ImportDataRow[];
      }
    ): Promise<{ message: string; validation: ValidationOutcome }> {
      await assertAllowed(identity, "read");
      const validation = validateDataSet(input);
      return {
        message: validation.success
          ? "Validation successful."
          : "Validation has failed. Please review your data.",
        validation,
      };
    },

    async startImport(
      identity: SecurityIdentity | null | undefined,
      input: {
        module: ImportableModule;
        dateFormat: ImportDateFormat;
        dataMap: ImportDataMap;
        dataSet: ImportDataRow[];
        importerName?: string;
      }
    ): Promise<{ message: string; validation?: ValidationOutcome }> {
      const orgIdentity = await assertAllowed(identity, "read");

      // Spec: backend re-validates synchronously before queueing.
      const validation = validateDataSet(input);
      if (!validation.success) {
        throw new ValidationAppError(
          "Validation has failed. Please review your data.",
          { validation }
        );
      }

      const startedAt = new Date();
      await notifications.notifyImportStarted({
        organizationId: orgIdentity.organizationId,
        actorId: orgIdentity.subjectId,
        actorName: input.importerName ?? orgIdentity.email ?? "A user",
        module: input.module,
      });

      await queue.enqueue({
        organizationId: orgIdentity.organizationId,
        importerId: orgIdentity.subjectId,
        importerName: input.importerName ?? orgIdentity.email ?? "Importer",
        module: input.module,
        dateFormat: input.dateFormat,
        dataMap: input.dataMap,
        dataSet: input.dataSet,
        startedAt: startedAt.toISOString(),
      });

      return {
        message:
          "We received your data. You will be notified once import is complete",
      };
    },
  };
}

export type DataImportService = ReturnType<typeof createDataImportService>;
