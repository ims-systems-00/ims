/**
 * Live Compliance persisted state.
 *
 * - AdviceState: per-org lifecycle of a (derived) advice item — first seen,
 *   snoozed until, resolved. Advice content itself is recomputed each recalc.
 * - Activity: the live activity feed ("Clause 7.2 back to Sustained").
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const adviceStateSchema = new Schema(
  {
    organizationId: { type: String, required: true },
    adviceId: { type: String, required: true },
    module: { type: String, required: true },
    clause: { type: String, required: true },
    severity: { type: String, required: true },
    title: { type: String, required: true },
    firstSeenAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    snoozedUntil: { type: Date, default: null },
    snoozedBy: { type: String, default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

adviceStateSchema.index({ organizationId: 1, adviceId: 1 }, { unique: true });
adviceStateSchema.index({ organizationId: 1, resolvedAt: 1 });

const activitySchema = new Schema(
  {
    organizationId: { type: String, required: true },
    source: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true },
    at: { type: Date, required: true },
    actorUserId: { type: String, default: null },
    clause: { type: String, default: null },
  },
  { timestamps: true }
);

activitySchema.index({ organizationId: 1, at: -1 });

export type AdviceStateDocument = InferSchemaType<typeof adviceStateSchema> & {
  _id: mongoose.Types.ObjectId;
};
export type ComplianceActivityDocument = InferSchemaType<typeof activitySchema> & {
  _id: mongoose.Types.ObjectId;
};

let adviceModel: Model<AdviceStateDocument> | null = null;
let activityModel: Model<ComplianceActivityDocument> | null = null;

export function getAdviceStateModel(): Model<AdviceStateDocument> {
  if (adviceModel) return adviceModel;
  adviceModel =
    (mongoose.models.LiveComplianceAdviceState as Model<AdviceStateDocument> | undefined) ??
    mongoose.model<AdviceStateDocument>(
      "LiveComplianceAdviceState",
      adviceStateSchema,
      "liveComplianceAdviceStates"
    );
  return adviceModel;
}

export function getComplianceActivityModel(): Model<ComplianceActivityDocument> {
  if (activityModel) return activityModel;
  activityModel =
    (mongoose.models.LiveComplianceActivity as Model<ComplianceActivityDocument> | undefined) ??
    mongoose.model<ComplianceActivityDocument>(
      "LiveComplianceActivity",
      activitySchema,
      "liveComplianceActivity"
    );
  return activityModel;
}

/** Per-organisation bookkeeping for scheduled work (digest dedupe). */
const orgStateSchema = new Schema(
  {
    organizationId: { type: String, required: true, unique: true },
    /** ISO day (YYYY-MM-DD) the last daily digest was claimed for. */
    lastDigestOn: { type: String, default: null },
    /** "Get ready for ISO" steps a person marked done. */
    journeyCompleted: { type: [String], default: [] },
  },
  { timestamps: true }
);

export type LiveComplianceOrgStateDocument = InferSchemaType<typeof orgStateSchema> & {
  _id: mongoose.Types.ObjectId;
};

let orgStateModel: Model<LiveComplianceOrgStateDocument> | null = null;

export function getLiveComplianceOrgStateModel(): Model<LiveComplianceOrgStateDocument> {
  if (orgStateModel) return orgStateModel;
  orgStateModel =
    (mongoose.models.LiveComplianceOrgState as
      | Model<LiveComplianceOrgStateDocument>
      | undefined) ??
    mongoose.model<LiveComplianceOrgStateDocument>(
      "LiveComplianceOrgState",
      orgStateSchema,
      "liveComplianceOrgState"
    );
  return orgStateModel;
}
