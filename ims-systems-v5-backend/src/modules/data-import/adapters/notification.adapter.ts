/**
 * Data Import notifications — Super Admins on start, initiator on complete.
 * Spec: docs/module-specifications/data-import.md §9 (in-app only, email: false).
 */

import type { NotificationsApplicationPort } from "../../notifications";
import { createOrganisationMembershipRepository } from "../../organisation/repositories/organisation-membership.repository";
import { MODULE_OPTIONS } from "../catalogs/importable-fields";
import type { DataImportNotificationPort } from "../ports";
import type { ImportableModule } from "../types";

function moduleLabel(module: ImportableModule): string {
  return (
    MODULE_OPTIONS.find((option) => option.module === module)?.label ?? module
  );
}

export function createDataImportNotificationAdapter(
  notifications: NotificationsApplicationPort
): DataImportNotificationPort {
  const memberships = createOrganisationMembershipRepository();

  return {
    async notifyImportStarted(input) {
      const rows = await memberships.listByOrganization(input.organizationId);
      const superAdminIds = [
        ...new Set(
          rows
            .filter((row) => row.role === "Super Admin")
            .map((row) => row.userId)
        ),
      ];
      if (superAdminIds.length === 0) return;

      const label = moduleLabel(input.module);
      await notifications.createForRecipients({
        organizationId: input.organizationId,
        createdBy: input.actorId,
        recipients: superAdminIds.map((recipientUserId) => ({
          recipientUserId,
          title: "Import Dataset",
          message: `${input.actorName} started importing data into ${label}.`,
          referenceType: "users",
          referenceModuleId: input.organizationId,
          screenIdentifier: "data-import",
          params: { id: input.organizationId },
        })),
      });
    },

    async notifyImportCompleted(input) {
      const label = moduleLabel(input.module);
      await notifications.createForRecipients({
        organizationId: input.organizationId,
        createdBy: input.actorId,
        recipients: [
          {
            recipientUserId: input.actorId,
            title: "Import Dataset",
            message: `${label} import completed successfully in ${input.durationLabel} (started ${input.startedAt.toISOString()}).`,
            referenceType: "users",
            referenceModuleId: input.organizationId,
            screenIdentifier: "data-import",
            params: { id: input.organizationId },
          },
        ],
      });
    },
  };
}
