/**
 * Calendar Event persistence.
 */

import type { CalendarListScope } from "../ports";
import type {
  CalendarEvent,
  CalendarEventColor,
  CalendarEventReference,
  ListCalendarEventsQuery,
  PaginatedCalendarEvents,
} from "../types";
import {
  getCalendarEventModel,
  type CalendarEventDocument,
} from "./calendar-event.model";

function toDomain(doc: CalendarEventDocument): CalendarEvent {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    reference: doc.reference ?? "",
    title: doc.title,
    description: doc.description ?? "",
    start: doc.start,
    end: doc.end,
    color: doc.color as CalendarEventColor,
    systemEventId: doc.systemEventId ?? null,
    eventReference: (doc.eventReference ??
      null) as CalendarEventReference | null,
    attendeeIds: [...(doc.attendeeIds ?? [])],
    groupIds: [...(doc.groupIds ?? [])],
    createdBy: doc.createdBy,
    createdOn: doc.createdOn,
    updatedBy: doc.updatedBy ?? null,
    updatedOn: doc.updatedOn ?? null,
    deletedAt: doc.deletedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function applyListScope(
  filter: Record<string, unknown>,
  scope: CalendarListScope
): void {
  if (scope.mode === "all") return;
  filter.$or = [
    { groupIds: { $exists: false } },
    { groupIds: { $size: 0 } },
    { groupIds: { $in: scope.businessUnitIds } },
  ];
}

export type PersistCalendarCreate = {
  reference?: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  color: CalendarEventColor;
  systemEventId?: string | null;
  eventReference?: CalendarEventReference | null;
  attendeeIds?: string[];
  groupIds?: string[];
  createdBy: string;
  createdOn: Date;
};

export type PersistCalendarPatch = {
  title?: string;
  description?: string;
  start?: Date;
  end?: Date;
  color?: CalendarEventColor;
  attendeeIds?: string[];
  groupIds?: string[];
  updatedBy: string;
  updatedOn: Date;
};

export type PersistSystemUpsert = {
  title: string;
  description: string;
  start: Date;
  end: Date;
  color: CalendarEventColor;
  systemEventId: string;
  eventReference: CalendarEventReference;
  attendeeIds: string[];
  groupIds: string[];
  createdBy: string;
  createdOn: Date;
};

export type CalendarEventRepository = {
  create: (
    organizationId: string,
    input: PersistCalendarCreate
  ) => Promise<CalendarEvent>;
  findById: (
    organizationId: string,
    id: string,
    options?: { includeDeleted?: boolean }
  ) => Promise<CalendarEvent | null>;
  findBySystemEvent: (
    organizationId: string,
    systemEventId: string,
    eventReference: CalendarEventReference
  ) => Promise<CalendarEvent | null>;
  list: (
    organizationId: string,
    query: ListCalendarEventsQuery,
    scope: CalendarListScope
  ) => Promise<PaginatedCalendarEvents>;
  update: (
    organizationId: string,
    id: string,
    patch: PersistCalendarPatch
  ) => Promise<CalendarEvent | null>;
  upsertBySystemEvent: (
    organizationId: string,
    input: PersistSystemUpsert
  ) => Promise<CalendarEvent>;
  softDelete: (organizationId: string, id: string) => Promise<boolean>;
  softDeleteBySystemEvent: (
    organizationId: string,
    systemEventId: string,
    eventReference: CalendarEventReference
  ) => Promise<boolean>;
};

export function createCalendarEventRepository(): CalendarEventRepository {
  const model = getCalendarEventModel();

  return {
    async create(organizationId, input) {
      const docs = await model.create([
        {
          organizationId,
          reference: input.reference ?? "",
          title: input.title,
          description: input.description ?? "",
          start: input.start,
          end: input.end,
          color: input.color,
          ...(input.systemEventId
            ? { systemEventId: input.systemEventId }
            : { systemEventId: null }),
          ...(input.eventReference
            ? { eventReference: input.eventReference }
            : {}),
          attendeeIds: input.attendeeIds ?? [],
          groupIds: input.groupIds ?? [],
          createdBy: input.createdBy,
          createdOn: input.createdOn,
          deletedAt: null,
        },
      ]);
      return toDomain(docs[0]! as unknown as CalendarEventDocument);
    },

    async findById(organizationId, id, options = {}) {
      const filter: Record<string, unknown> = { _id: id, organizationId };
      if (!options.includeDeleted) filter.deletedAt = null;
      const doc = await model.findOne(filter).exec();
      return doc ? toDomain(doc) : null;
    },

    async findBySystemEvent(organizationId, systemEventId, eventReference) {
      const doc = await model
        .findOne({
          organizationId,
          systemEventId,
          eventReference,
          deletedAt: null,
        })
        .exec();
      return doc ? toDomain(doc) : null;
    },

    async list(organizationId, query, scope) {
      const filter: Record<string, unknown> = {
        organizationId,
        deletedAt: null,
      };
      applyListScope(filter, scope);

      if (query.search) {
        filter.$and = [
          ...((filter.$and as unknown[]) ?? []),
          {
            $or: [
              { title: { $regex: query.search, $options: "i" } },
              { description: { $regex: query.search, $options: "i" } },
            ],
          },
        ];
      }

      if (query.from || query.to) {
        const range: Record<string, Date> = {};
        if (query.from) range.$gte = query.from;
        if (query.to) range.$lte = query.to;
        // Overlap: event.start <= to AND event.end >= from
        if (query.from) {
          filter.end = {
            ...((filter.end as object) ?? {}),
            $gte: query.from,
          };
        }
        if (query.to) {
          filter.start = {
            ...((filter.start as object) ?? {}),
            $lte: query.to,
          };
        }
      }

      if (query.eventReferences?.length) {
        filter.eventReference = { $in: query.eventReferences };
      }
      if (query.colors?.length) {
        filter.color = { $in: query.colors };
      }
      if (query.standaloneOnly) {
        filter.$and = [
          ...((filter.$and as unknown[]) ?? []),
          {
            $or: [{ systemEventId: null }, { systemEventId: { $exists: false } }],
          },
        ];
      }

      const sortField = query.sort ?? "start";
      const sortDir = query.sortDir === "desc" ? -1 : 1;
      const skip = (query.page - 1) * query.pageSize;

      const [total, docs] = await Promise.all([
        model.countDocuments(filter).exec(),
        model
          .find(filter)
          .sort({ [sortField]: sortDir, _id: 1 })
          .skip(skip)
          .limit(query.pageSize)
          .exec(),
      ]);

      const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
      return {
        items: docs.map((doc) => toDomain(doc)),
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages,
      };
    },

    async update(organizationId, id, patch) {
      const $set: Record<string, unknown> = {
        updatedBy: patch.updatedBy,
        updatedOn: patch.updatedOn,
      };
      if (patch.title !== undefined) $set.title = patch.title;
      if (patch.description !== undefined) $set.description = patch.description;
      if (patch.start !== undefined) $set.start = patch.start;
      if (patch.end !== undefined) $set.end = patch.end;
      if (patch.color !== undefined) $set.color = patch.color;
      if (patch.attendeeIds !== undefined) $set.attendeeIds = patch.attendeeIds;
      if (patch.groupIds !== undefined) $set.groupIds = patch.groupIds;

      const doc = await model
        .findOneAndUpdate(
          { _id: id, organizationId, deletedAt: null },
          { $set },
          { returnDocument: "after" }
        )
        .exec();
      return doc ? toDomain(doc) : null;
    },

    async upsertBySystemEvent(organizationId, input) {
      const existing = await model
        .findOne({
          organizationId,
          systemEventId: input.systemEventId,
          eventReference: input.eventReference,
          deletedAt: null,
        })
        .exec();

      if (existing) {
        const doc = await model
          .findOneAndUpdate(
            { _id: existing._id },
            {
              $set: {
                title: input.title,
                description: input.description,
                start: input.start,
                end: input.end,
                color: input.color,
                attendeeIds: input.attendeeIds,
                groupIds: input.groupIds,
                updatedBy: input.createdBy,
                updatedOn: new Date(),
              },
            },
            { returnDocument: "after" }
          )
          .exec();
        return toDomain(doc!);
      }

      const docs = await model.create([
        {
          organizationId,
          reference: "",
          title: input.title,
          description: input.description,
          start: input.start,
          end: input.end,
          color: input.color,
          systemEventId: input.systemEventId,
          eventReference: input.eventReference,
          attendeeIds: input.attendeeIds,
          groupIds: input.groupIds,
          createdBy: input.createdBy,
          createdOn: input.createdOn,
          deletedAt: null,
        },
      ]);
      return toDomain(docs[0]! as unknown as CalendarEventDocument);
    },

    async softDelete(organizationId, id) {
      const result = await model
        .updateOne(
          { _id: id, organizationId, deletedAt: null },
          { $set: { deletedAt: new Date() } }
        )
        .exec();
      return result.modifiedCount > 0;
    },

    async softDeleteBySystemEvent(
      organizationId,
      systemEventId,
      eventReference
    ) {
      const result = await model
        .updateOne(
          {
            organizationId,
            systemEventId,
            eventReference,
            deletedAt: null,
          },
          { $set: { deletedAt: new Date() } }
        )
        .exec();
      return result.modifiedCount > 0;
    },
  };
}
