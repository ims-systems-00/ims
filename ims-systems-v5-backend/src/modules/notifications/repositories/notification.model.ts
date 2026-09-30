/**
 * Notification Mongoose model.
 * Spec: docs/module-specifications/notifications.md §6–7
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import {
  NOTIFICATION_REFERENCE_TYPES,
  POPUP_STATUSES,
  READ_STATUSES,
  SENT_STATUSES,
} from "../types";

const stateFlagSchema = (statuses: readonly string[], defaultStatus: string) =>
  new Schema(
    {
      status: {
        type: String,
        required: true,
        enum: [...statuses],
        default: defaultStatus,
      },
      on: { type: Date, default: null },
    },
    { _id: false }
  );

const paramsSchema = new Schema(
  {
    id: { type: String, default: null },
    businessUnitId: { type: String, default: null },
  },
  { _id: false }
);

const notificationSchema = new Schema(
  {
    organizationId: { type: String, required: true },
    recipientUserId: { type: String, required: true },
    businessUnitId: { type: String },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    referenceType: {
      type: String,
      required: true,
      enum: [...NOTIFICATION_REFERENCE_TYPES],
    },
    referenceModuleId: { type: String },
    screenIdentifier: { type: String, trim: true },
    params: {
      type: paramsSchema,
      default: () => ({ id: null, businessUnitId: null }),
    },
    icon: { type: String, trim: true },
    sent: {
      type: stateFlagSchema(SENT_STATUSES, "unsent"),
      default: () => ({ status: "unsent", on: null }),
    },
    read: {
      type: stateFlagSchema(READ_STATUSES, "unread"),
      default: () => ({ status: "unread", on: null }),
    },
    popUp: {
      type: stateFlagSchema(POPUP_STATUSES, "read"),
      default: () => ({ status: "read", on: null }),
    },
    isOrganizational: { type: Boolean, default: false },
    createdBy: { type: String, required: true },
    createdOn: { type: Date, required: true },
  },
  { timestamps: true }
);

notificationSchema.index({
  organizationId: 1,
  recipientUserId: 1,
  createdOn: -1,
});
notificationSchema.index({
  organizationId: 1,
  recipientUserId: 1,
  "sent.status": 1,
});
notificationSchema.index({
  organizationId: 1,
  recipientUserId: 1,
  "read.status": 1,
});
notificationSchema.index({
  organizationId: 1,
  recipientUserId: 1,
  "popUp.status": 1,
});
notificationSchema.index({
  organizationId: 1,
  createdBy: 1,
  referenceType: 1,
  createdOn: -1,
});
notificationSchema.index({
  organizationId: 1,
  referenceType: 1,
  referenceModuleId: 1,
});

export type NotificationDocument = InferSchemaType<typeof notificationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type NotificationModel = Model<NotificationDocument>;

let cached: NotificationModel | null = null;

export function getNotificationModel(): NotificationModel {
  if (cached) return cached;
  cached =
    (mongoose.models.Notification as NotificationModel | undefined) ??
    mongoose.model<NotificationDocument>("Notification", notificationSchema);
  return cached;
}
