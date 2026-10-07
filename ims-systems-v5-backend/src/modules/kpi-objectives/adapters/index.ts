/**
 * Adapters bridging KPI Objectives to Functional Units / Users / Notifications.
 */

import type { FunctionalUnitService } from "../../functional-units";
import type { NotificationsApplicationPort } from "../../notifications";
import type { FunctionalUnitUsersPort } from "../../users";
import type {
  KpiObjectiveBusinessUnitPort,
  KpiObjectiveNotificationPort,
} from "../ports";

export function createKpiBusinessUnitAdapter(
  functionalUnits: Pick<FunctionalUnitService, "existsForOrganization">
): KpiObjectiveBusinessUnitPort {
  return {
    async exists(organizationId, businessUnitId) {
      return functionalUnits.existsForOrganization(
        organizationId,
        businessUnitId
      );
    },
  };
}

/**
 * Resolve Heads of Service for a business unit via Users membership roles.
 */
export function createKpiObjectiveNotificationAdapter(deps: {
  notifications: NotificationsApplicationPort;
  unitUsers: FunctionalUnitUsersPort;
}): KpiObjectiveNotificationPort {
  const { notifications, unitUsers } = deps;

  return {
    async notifyBusinessUnitKpiCreated(input) {
      const members = await unitUsers.listMembers(
        input.organizationId,
        input.businessUnitId
      );
      const hosIds = members
        .filter((member) => {
          const role = (member.role ?? "").toLowerCase();
          return (
            role.includes("hos") ||
            role.includes("head of service") ||
            role === "hos user"
          );
        })
        .map((member) => member.id)
        .filter((id) => id && id !== input.createdBy);

      if (hosIds.length === 0) return;

      const preview =
        input.value.length > 120
          ? `${input.value.slice(0, 117)}...`
          : input.value;

      await notifications.createForRecipients({
        organizationId: input.organizationId,
        createdBy: input.createdBy,
        recipients: hosIds.map((recipientUserId) => ({
          recipientUserId,
          title: "New KPI/Objective assigned",
          message: `${input.reference}: ${preview}`,
          referenceType: "kpi-objectives",
          referenceModuleId: input.kpiId,
          screenIdentifier: "kpi-objectives",
          params: {
            id: input.kpiId,
            businessUnitId: input.businessUnitId,
          },
          isOrganizational: false,
        })),
      });
    },
  };
}
