/**
 * Compliance Overview repository (organisation-scoped).
 */

import type {
  ComplianceOverview,
  ComplianceToolkitName,
} from "../types";
import {
  getComplianceOverviewModel,
  type ComplianceOverviewDocument,
} from "./compliance-overview.model";

function mapDoc(doc: ComplianceOverviewDocument): ComplianceOverview {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    name: doc.name as ComplianceToolkitName,
    totalPercentage: doc.totalPercentage ?? 0,
    controlsSelected: doc.controlsSelected ?? 0,
    controlsImplemented: doc.controlsImplemented ?? 0,
    deletedAt: doc.deletedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type ComplianceOverviewRepository = ReturnType<
  typeof createComplianceOverviewRepository
>;

export function createComplianceOverviewRepository() {
  const Model = getComplianceOverviewModel();

  return {
    async create(
      organizationId: string,
      name: ComplianceToolkitName
    ): Promise<ComplianceOverview> {
      const doc = await Model.create({
        organizationId,
        name,
        totalPercentage: 0,
        controlsSelected: 0,
        controlsImplemented: 0,
        deletedAt: null,
      });
      return mapDoc(doc);
    },

    async findByName(
      organizationId: string,
      name: ComplianceToolkitName
    ): Promise<ComplianceOverview | null> {
      const doc = await Model.findOne({
        organizationId,
        name,
        deletedAt: null,
      }).exec();
      return doc ? mapDoc(doc) : null;
    },

    async listForOrganization(
      organizationId: string
    ): Promise<ComplianceOverview[]> {
      const docs = await Model.find({
        organizationId,
        deletedAt: null,
      })
        .sort({ name: 1 })
        .exec();
      return docs.map(mapDoc);
    },

    async updateTotals(
      organizationId: string,
      name: ComplianceToolkitName,
      totals: {
        totalPercentage: number;
        controlsSelected: number;
        controlsImplemented: number;
      }
    ): Promise<ComplianceOverview | null> {
      const doc = await Model.findOneAndUpdate(
        { organizationId, name, deletedAt: null },
        { $set: totals },
        { new: true }
      ).exec();
      return doc ? mapDoc(doc) : null;
    },

    async softDelete(
      organizationId: string,
      name: ComplianceToolkitName
    ): Promise<boolean> {
      const result = await Model.updateOne(
        { organizationId, name, deletedAt: null },
        { $set: { deletedAt: new Date() } }
      ).exec();
      return (result.modifiedCount ?? 0) > 0;
    },
  };
}
