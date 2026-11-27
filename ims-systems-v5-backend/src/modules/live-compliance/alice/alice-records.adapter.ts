/**
 * Record lookups for ALICE context (trusted reads, organisation-scoped).
 * Same precedent as the live snapshot collectors: read sibling models
 * directly; writes always go through the owning module's service.
 */

import mongoose from "mongoose";
import { getIncidentModel } from "../../incidents/repositories/incident.model";
import { getRiskModel } from "../../risks/repositories/risk.model";
import { createTrainingCompetencyRepository } from "../../training/repositories/training-competency.repository";
import { createTrainingRoleRepository } from "../../training/repositories/training-role.repository";
import type { AliceRecordsPort } from "./tasks";

const day = (value: unknown): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

export function createAliceRecordsAdapter(): AliceRecordsPort {
  return {
    async incident(organizationId, id) {
      if (!mongoose.isValidObjectId(id)) return null;
      const doc = await getIncidentModel()
        .findOne({ _id: id, organizationId, deletedAt: null })
        .lean()
        .exec();
      if (!doc) return null;
      const d = doc as Record<string, any>;
      return {
        id: String(d._id),
        reference: d.reference,
        title: d.title,
        description: d.description ?? "",
        type: d.incidentType ?? null,
        area: d.area ?? null,
        occurredOn: day(d.occurredOn ?? d.raisedOn),
        rootCause: d.investigation?.rootCause ?? null,
      };
    },

    async risk(organizationId, id) {
      if (!mongoose.isValidObjectId(id)) return null;
      const doc = await getRiskModel()
        .findOne({ _id: id, organizationId, deletedAt: null })
        .lean()
        .exec();
      if (!doc) return null;
      const d = doc as Record<string, any>;
      return {
        id: String(d._id),
        reference: d.reference,
        title: d.title,
        description: d.description ?? "",
        type: d.type,
        likelihood: d.currentScore?.likelihood ?? 1,
        consequence: d.currentScore?.consequence ?? 1,
        area: d.area ?? null,
        mitigation: d.mitigationText ?? null,
      };
    },

    async trainingRole(organizationId, id) {
      if (!mongoose.isValidObjectId(id)) return null;
      const role = await createTrainingRoleRepository().findById(organizationId, id);
      return role
        ? { id: role.id, name: role.name, description: role.description, mandatory: role.mandatory }
        : null;
    },

    async competencies(organizationId) {
      const list = await createTrainingCompetencyRepository().list(organizationId);
      return list.map((c) => ({ id: c.id, name: c.name, evidence: c.evidence, months: c.months }));
    },
  };
}
