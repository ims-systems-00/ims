/**
 * Adapters bridging Compliance to Activities / Notifications / evidence modules.
 */

import type { ActivitiesApplicationPort } from "../../activities";
import type {
  IncidentComplianceLinkPort,
  IncidentService,
} from "../../incidents";
import type { NotificationsApplicationPort } from "../../notifications";
import type { NotificationsUsersPort } from "../../notifications";
import type {
  OfiComplianceLinkPort,
  OfiService,
} from "../../ofi";
import type {
  RiskComplianceLinkPort,
  RiskService,
} from "../../risks";
import type { SecurityIdentity } from "../../../security";
import type {
  ComplianceActivityPort,
  ComplianceEvidenceLinkPort,
  ComplianceIncidentMirrorPort,
  ComplianceNotificationPort,
  ComplianceOfiMirrorPort,
  ComplianceRiskMirrorPort,
} from "../ports";
import type { ComplianceApplicationPort } from "../services/compliance.service";

export function createComplianceActivityAdapter(
  activities: ActivitiesApplicationPort
): ComplianceActivityPort {
  return {
    async recordControlImplemented(input) {
      await activities.recordAutomated(input.organizationId, {
        moduleType: "controlstatuses",
        moduleId: input.controlStatusId,
        value: input.message,
        createdBy: input.actorId,
      });
    },
  };
}

export function createComplianceNotificationAdapter(deps: {
  notifications: NotificationsApplicationPort;
  users: NotificationsUsersPort;
}): ComplianceNotificationPort {
  const { notifications, users } = deps;

  return {
    async notifyControlImplemented(input) {
      const identity = {
        subjectId: input.actorId,
        organizationId: input.organizationId,
      } as SecurityIdentity;

      const recipientIds = await users.listActiveUserIds(identity);
      const unique = [...new Set(recipientIds)].filter(
        (id) => id && id !== input.actorId
      );
      if (unique.length === 0) return;

      const preview = `${input.toolkitName} ${input.clause}: ${input.title}`;
      await notifications.createForRecipients({
        organizationId: input.organizationId,
        createdBy: input.actorId,
        recipients: unique.map((recipientUserId) => ({
          recipientUserId,
          title: "Control implemented",
          message: preview.slice(0, 150),
          referenceType: "compliance",
          referenceModuleId: input.controlStatusId,
          screenIdentifier: "compliance",
          params: { id: input.controlStatusId },
          isOrganizational: true,
        })),
      });
    },
  };
}

export function createComplianceEvidenceLinkAdapter(deps: {
  risks: Pick<RiskService, "getById">;
  incidents: Pick<IncidentService, "getById">;
  ofi: Pick<OfiService, "getById">;
}): ComplianceEvidenceLinkPort {
  const stubIdentity = (organizationId: string): SecurityIdentity =>
    ({
      subjectId: "compliance-evidence-adapter",
      organizationId,
    }) as SecurityIdentity;

  return {
    async riskExists(organizationId, id) {
      try {
        await deps.risks.getById(stubIdentity(organizationId), id);
        return true;
      } catch {
        return false;
      }
    },
    async incidentExists(organizationId, id) {
      try {
        await deps.incidents.getById(stubIdentity(organizationId), id);
        return true;
      } catch {
        return false;
      }
    },
    async cipExists(organizationId, id) {
      try {
        await deps.ofi.getById(stubIdentity(organizationId), id);
        return true;
      } catch {
        return false;
      }
    },
    async documentExists() {
      // Document Management module is not available in V5 yet.
      return false;
    },
  };
}

export function createRiskComplianceLinkAdapter(
  compliance: Pick<
    ComplianceApplicationPort,
    "syncRiskComplianceLinks" | "clearRiskComplianceEvidence"
  >
): RiskComplianceLinkPort {
  return {
    async syncRiskLinks(input) {
      await compliance.syncRiskComplianceLinks(input);
    },
    async clearRiskLinks(input) {
      await compliance.clearRiskComplianceEvidence(input);
    },
  };
}

export function createComplianceRiskMirrorAdapter(
  risks: Pick<
    RiskService,
    "mirrorAddComplianceClause" | "mirrorRemoveComplianceClause"
  >
): ComplianceRiskMirrorPort {
  return {
    async addClause(input) {
      await risks.mirrorAddComplianceClause(input);
    },
    async removeClause(input) {
      await risks.mirrorRemoveComplianceClause(input);
    },
  };
}

export function createIncidentComplianceLinkAdapter(
  compliance: Pick<
    ComplianceApplicationPort,
    "syncIncidentComplianceLinks" | "clearIncidentComplianceEvidence"
  >
): IncidentComplianceLinkPort {
  return {
    async syncIncidentLinks(input) {
      await compliance.syncIncidentComplianceLinks(input);
    },
    async clearIncidentLinks(input) {
      await compliance.clearIncidentComplianceEvidence(input);
    },
  };
}

export function createComplianceIncidentMirrorAdapter(
  incidents: Pick<
    IncidentService,
    "mirrorAddComplianceClause" | "mirrorRemoveComplianceClause"
  >
): ComplianceIncidentMirrorPort {
  return {
    async addClause(input) {
      await incidents.mirrorAddComplianceClause(input);
    },
    async removeClause(input) {
      await incidents.mirrorRemoveComplianceClause(input);
    },
  };
}

export function createOfiComplianceLinkAdapter(
  compliance: Pick<
    ComplianceApplicationPort,
    "syncOfiComplianceLinks" | "clearOfiComplianceEvidence"
  >
): OfiComplianceLinkPort {
  return {
    async syncOfiLinks(input) {
      await compliance.syncOfiComplianceLinks(input);
    },
    async clearOfiLinks(input) {
      await compliance.clearOfiComplianceEvidence(input);
    },
  };
}

export function createComplianceOfiMirrorAdapter(
  ofis: Pick<
    OfiService,
    "mirrorAddComplianceClause" | "mirrorRemoveComplianceClause"
  >
): ComplianceOfiMirrorPort {
  return {
    async addClause(input) {
      await ofis.mirrorAddComplianceClause(input);
    },
    async removeClause(input) {
      await ofis.mirrorRemoveComplianceClause(input);
    },
  };
}
