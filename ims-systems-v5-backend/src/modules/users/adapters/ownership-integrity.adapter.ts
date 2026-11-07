/**
 * Real OwnershipIntegrityPort (U-06) — aggregates records a user owns
 * across modules (risk/incident/OFI owners, audit auditors, task
 * assignees, management-review attendees, document owners) so the
 * user-delete flow can check and transfer ownership first.
 * Wired in auth0-openfga mode; development-stub keeps the NoOp.
 */

import { getAiResponseModel } from "../../ai/repositories/ai-response.model";
import { getAuditModel } from "../../audits/repositories/audit.model";
import { getDocumentTreeModel } from "../../document-management/repositories/document-tree.model";
import { getIncidentModel } from "../../incidents/repositories/incident.model";
import { getManagementReviewModel } from "../../management-reviews/repositories/management-review.model";
import { getOfiModel } from "../../ofi/repositories/ofi.model";
import { getRiskModel } from "../../risks/repositories/risk.model";
import { getTaskModel } from "../../tasks/repositories/task.model";
import type { OwnershipIntegrityPort } from "../ports";

type OwnedModule = {
  name: string;
  count: (organizationId: string, userId: string) => Promise<number>;
  transfer: (
    organizationId: string,
    sourceUserId: string,
    destinationUserId: string
  ) => Promise<void>;
};

function scalarField(
  model: { countDocuments: Function; updateMany: Function },
  field: string
): Pick<OwnedModule, "count" | "transfer"> {
  return {
    async count(organizationId, userId) {
      return model.countDocuments({
        organizationId,
        deletedAt: null,
        [field]: userId,
      });
    },
    async transfer(organizationId, sourceUserId, destinationUserId) {
      await model.updateMany(
        { organizationId, deletedAt: null, [field]: sourceUserId },
        { $set: { [field]: destinationUserId } }
      );
    },
  };
}

function stringArrayField(
  model: { countDocuments: Function; updateMany: Function },
  field: string
): Pick<OwnedModule, "count" | "transfer"> {
  return {
    async count(organizationId, userId) {
      return model.countDocuments({
        organizationId,
        deletedAt: null,
        [field]: userId,
      });
    },
    async transfer(organizationId, sourceUserId, destinationUserId) {
      // Replace source with destination, avoiding duplicates when the
      // destination is already present on the same record.
      await model.updateMany(
        { organizationId, deletedAt: null, [field]: sourceUserId },
        { $set: { [`${field}.$[elem]`]: destinationUserId } },
        { arrayFilters: [{ elem: sourceUserId }] }
      );
    },
  };
}

function ownedModules(): OwnedModule[] {
  return [
    { name: "Risks", ...scalarField(getRiskModel() as never, "ownerId") },
    {
      name: "Incidents",
      ...scalarField(getIncidentModel() as never, "ownerId"),
    },
    { name: "OFIs", ...scalarField(getOfiModel() as never, "ownerId") },
    { name: "Audits", ...scalarField(getAuditModel() as never, "auditorId") },
    {
      name: "Tasks",
      count: async (organizationId, userId) =>
        getTaskModel().countDocuments({
          organizationId,
          deletedAt: null,
          "assignees.userId": userId,
        }),
      transfer: async (organizationId, sourceUserId, destinationUserId) => {
        await getTaskModel().updateMany(
          {
            organizationId,
            deletedAt: null,
            "assignees.userId": sourceUserId,
          },
          { $set: { "assignees.$[elem].userId": destinationUserId } },
          { arrayFilters: [{ "elem.userId": sourceUserId }] }
        );
      },
    },
    {
      name: "Management Reviews",
      ...stringArrayField(
        getManagementReviewModel() as never,
        "attendees"
      ),
    },
    {
      name: "Documents",
      ...stringArrayField(
        getDocumentTreeModel() as never,
        "documentData.owners"
      ),
    },
    {
      // AI responses are hard-deleted (no deletedAt soft-delete field).
      name: "AI Responses",
      count: async (organizationId, userId) =>
        getAiResponseModel().countDocuments({
          organizationId,
          createdBy: userId,
        }),
      transfer: async (organizationId, sourceUserId, destinationUserId) => {
        await getAiResponseModel().updateMany(
          { organizationId, createdBy: sourceUserId },
          { $set: { createdBy: destinationUserId } }
        );
      },
    },
  ];
}

export function createOwnershipIntegrityAdapter(): OwnershipIntegrityPort {
  return {
    async check({ organizationId, userId }) {
      const modules: string[] = [];
      for (const mod of ownedModules()) {
        if ((await mod.count(organizationId, userId)) > 0) {
          modules.push(mod.name);
        }
      }
      return {
        hasOwnedData: modules.length > 0,
        // Transfer runs synchronously; nothing is ever "in progress".
        inProgress: false,
        modules,
      };
    },

    async transfer({ organizationId, sourceUserId, destinationUserId }) {
      for (const mod of ownedModules()) {
        await mod.transfer(organizationId, sourceUserId, destinationUserId);
      }
    },
  };
}
