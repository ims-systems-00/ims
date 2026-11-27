/**
 * Incident Mongoose model.
 * Spec: docs/module-specifications/incident.md
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import {
  INCIDENT_PRIORITIES,
  INCIDENT_PRIVACY,
  INCIDENT_TYPES,
  INVESTIGATION_STATUSES,
} from "../types";

const lifecycleFlagSchema = new Schema(
  {
    status: { type: Boolean, default: false },
    by: { type: String, default: null },
    on: { type: Date, default: null },
  },
  { _id: false }
);

const attachmentSchema = new Schema(
  {
    id: { type: String, required: true },
    fileName: { type: String, required: true, trim: true },
    mimeType: { type: String, trim: true },
    sizeBytes: { type: Number },
    storageKey: { type: String, trim: true },
    url: { type: String, trim: true },
    uploadedBy: { type: String, required: true },
    uploadedAt: { type: Date, required: true },
  },
  { _id: false }
);

const complianceLinkSchema = new Schema(
  {
    toolkitId: { type: String, required: true, trim: true },
    clauseIds: { type: [String], default: [] },
  },
  { _id: false }
);

const sourceSchema = new Schema(
  {
    moduleType: { type: String, required: true, trim: true },
    moduleId: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const activitySchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    message: { type: String, required: true },
    actorId: { type: String, default: null },
    at: { type: Date, required: true },
  },
  { _id: false }
);

const investigationSchema = new Schema(
  {
    status: {
      type: String,
      enum: [...INVESTIGATION_STATUSES],
      default: "not_started",
    },
    startedOn: { type: Date, default: null },
    startedBy: { type: String, default: null },
    completedOn: { type: Date, default: null },
    rootCause: { type: String, trim: true },
  },
  { _id: false }
);

const incidentSchema = new Schema(
  {
    organizationId: { type: String, required: true },
    reference: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    businessUnitId: { type: String },
    priority: {
      type: String,
      required: true,
      enum: [...INCIDENT_PRIORITIES],
      default: "P3",
    },
    ownerId: { type: String },
    methodOfNotification: { type: String, trim: true },
    affectedService: { type: String, trim: true },
    categoryId: { type: String },
    /** Live compliance (ISO 9.1 / 10.2 / 6.1.2). */
    incidentType: { type: String, enum: [...INCIDENT_TYPES] },
    occurredOn: { type: Date, default: null },
    area: { type: String, trim: true },
    investigation: {
      type: investigationSchema,
      default: () => ({
        status: "not_started",
        startedOn: null,
        startedBy: null,
        completedOn: null,
      }),
    },
    privacy: {
      type: String,
      required: true,
      enum: [...INCIDENT_PRIVACY],
      default: "Business unit",
    },
    resolution: { type: String, trim: true },
    resolved: {
      type: lifecycleFlagSchema,
      default: () => ({ status: false, by: null, on: null }),
    },
    resolutionTimeMs: { type: Number, default: null },
    escalated: {
      type: lifecycleFlagSchema,
      default: () => ({ status: false, by: null, on: null }),
    },
    attachments: { type: [attachmentSchema], default: [] },
    complianceLinks: { type: [complianceLinkSchema], default: [] },
    source: { type: sourceSchema },
    activity: { type: [activitySchema], default: [] },
    raisedBy: { type: String, required: true },
    raisedOn: { type: Date, required: true },
    updatedBy: { type: String, default: null },
    updatedOn: { type: Date, default: null },
    nextNudgeAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

incidentSchema.index({ organizationId: 1, deletedAt: 1, raisedOn: -1 });
incidentSchema.index({ organizationId: 1, deletedAt: 1, "resolved.status": 1 });
incidentSchema.index({
  organizationId: 1,
  deletedAt: 1,
  "escalated.status": 1,
});
incidentSchema.index({ organizationId: 1, deletedAt: 1, ownerId: 1 });
incidentSchema.index({ organizationId: 1, deletedAt: 1, businessUnitId: 1 });
incidentSchema.index({ organizationId: 1, deletedAt: 1, priority: 1 });
incidentSchema.index({
  organizationId: 1,
  deletedAt: 1,
  "source.moduleType": 1,
  "source.moduleId": 1,
});
incidentSchema.index({ organizationId: 1, reference: 1 }, { unique: true });

export type IncidentDocument = InferSchemaType<typeof incidentSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type IncidentModel = Model<IncidentDocument>;

export const IncidentModelName = "Incident";

export function getIncidentModel(): IncidentModel {
  return (
    (mongoose.models[IncidentModelName] as IncidentModel | undefined) ??
    mongoose.model<IncidentDocument>(IncidentModelName, incidentSchema)
  );
}
