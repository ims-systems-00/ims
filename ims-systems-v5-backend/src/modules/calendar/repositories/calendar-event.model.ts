/**
 * Calendar Event Mongoose model.
 * Spec: docs/module-specifications/calendar.md
 *
 * Collection name uses V5 spelling (`calendarevents`), not the V4 typo
 * `calenderevents` (see V5_ARCHITECTURE naming guidance).
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import {
  CALENDAR_EVENT_COLORS,
  CALENDAR_EVENT_REFERENCES,
} from "../types";

const calendarEventSchema = new Schema(
  {
    organizationId: { type: String, required: true },
    /** Spec leaves standalone references empty; do not require a non-empty value. */
    reference: { type: String, default: "" },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    color: {
      type: String,
      enum: [...CALENDAR_EVENT_COLORS],
      required: true,
      default: "default",
    },
    systemEventId: { type: String, default: null },
    eventReference: {
      type: String,
      enum: [...CALENDAR_EVENT_REFERENCES],
      default: null,
      required: false,
    },
    attendeeIds: { type: [String], default: [] },
    groupIds: { type: [String], default: [] },
    createdBy: { type: String, required: true },
    createdOn: { type: Date, required: true },
    updatedBy: { type: String, default: null },
    updatedOn: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

calendarEventSchema.index({ organizationId: 1, deletedAt: 1, start: 1 });
calendarEventSchema.index({ organizationId: 1, deletedAt: 1, end: 1 });
calendarEventSchema.index({
  organizationId: 1,
  deletedAt: 1,
  eventReference: 1,
});
calendarEventSchema.index(
  { organizationId: 1, systemEventId: 1, eventReference: 1 },
  {
    unique: true,
    partialFilterExpression: {
      systemEventId: { $type: "string" },
      deletedAt: null,
    },
  }
);

export type CalendarEventDocument = InferSchemaType<
  typeof calendarEventSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type CalendarEventModel = Model<CalendarEventDocument>;

export const CalendarEventModelName = "CalendarEvent";

export function getCalendarEventModel(): CalendarEventModel {
  return (
    (mongoose.models[CalendarEventModelName] as
      | CalendarEventModel
      | undefined) ??
    mongoose.model<CalendarEventDocument>(
      CalendarEventModelName,
      calendarEventSchema
    )
  );
}
