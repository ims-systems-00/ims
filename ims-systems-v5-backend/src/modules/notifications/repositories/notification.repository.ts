/**
 * Notification persistence.
 */

import type {
  CreateNotificationRecipientInput,
  ListNotificationsQuery,
  Notification,
  NotificationParams,
  NotificationReferenceType,
  PaginatedNotifications,
  PopupStatus,
  ReadStatus,
  SentStatus,
} from "../types";
import {
  getNotificationModel,
  type NotificationDocument,
} from "./notification.model";

function toParams(value: unknown): NotificationParams {
  if (!value || typeof value !== "object") {
    return { id: null, businessUnitId: null };
  }
  const raw = value as { id?: string | null; businessUnitId?: string | null };
  return {
    id: raw.id ?? null,
    businessUnitId: raw.businessUnitId ?? null,
  };
}

function toStateFlag<T extends string>(
  value: unknown,
  fallback: T
): { status: T; on: Date | null } {
  if (!value || typeof value !== "object") {
    return { status: fallback, on: null };
  }
  const raw = value as { status?: string; on?: Date | null };
  return {
    status: (raw.status as T) ?? fallback,
    on: raw.on ?? null,
  };
}

function toDomain(doc: NotificationDocument): Notification {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    recipientUserId: doc.recipientUserId,
    businessUnitId: doc.businessUnitId ?? undefined,
    title: doc.title,
    message: doc.message,
    referenceType: doc.referenceType as NotificationReferenceType,
    referenceModuleId: doc.referenceModuleId ?? undefined,
    screenIdentifier: doc.screenIdentifier ?? undefined,
    params: toParams(doc.params),
    icon: doc.icon ?? undefined,
    sent: toStateFlag<SentStatus>(doc.sent, "unsent"),
    read: toStateFlag<ReadStatus>(doc.read, "unread"),
    popUp: toStateFlag<PopupStatus>(doc.popUp, "read"),
    isOrganizational: Boolean(doc.isOrganizational),
    createdBy: doc.createdBy,
    createdOn: doc.createdOn,
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date,
  };
}

export type NotificationRepository = ReturnType<
  typeof createNotificationRepository
>;

export function createNotificationRepository() {
  const Model = getNotificationModel();

  return {
    async insertMany(input: {
      organizationId: string;
      createdBy: string;
      createdOn: Date;
      recipients: CreateNotificationRecipientInput[];
    }): Promise<Notification[]> {
      if (input.recipients.length === 0) return [];
      const docs = await Model.insertMany(
        input.recipients.map((recipient) => ({
          organizationId: input.organizationId,
          recipientUserId: recipient.recipientUserId,
          businessUnitId: recipient.businessUnitId,
          title: recipient.title,
          message: recipient.message,
          referenceType: recipient.referenceType,
          referenceModuleId: recipient.referenceModuleId,
          screenIdentifier: recipient.screenIdentifier,
          params: {
            id: recipient.params?.id ?? null,
            businessUnitId: recipient.params?.businessUnitId ?? null,
          },
          icon: recipient.icon,
          sent: { status: "unsent", on: null },
          read: { status: "unread", on: null },
          popUp: {
            status: recipient.popUpStatus ?? "read",
            on: recipient.popUpStatus === "unread" ? input.createdOn : null,
          },
          isOrganizational: recipient.isOrganizational ?? false,
          createdBy: input.createdBy,
          createdOn: input.createdOn,
        }))
      );
      return docs.map((doc) => toDomain(doc as NotificationDocument));
    },

    async findById(
      organizationId: string,
      id: string
    ): Promise<Notification | null> {
      const doc = await Model.findOne({ _id: id, organizationId }).lean();
      return doc ? toDomain(doc as NotificationDocument) : null;
    },

    async list(
      organizationId: string,
      recipientUserId: string,
      query: ListNotificationsQuery
    ): Promise<PaginatedNotifications> {
      const filter: Record<string, unknown> = { organizationId };

      if (query.actor) {
        filter.createdBy = recipientUserId;
      } else {
        filter.recipientUserId = recipientUserId;
      }

      if (query.push) {
        filter.referenceType = "notifications";
      }
      if (query.referenceType) {
        filter.referenceType = query.referenceType;
      }
      if (query.sent) {
        filter["sent.status"] = query.sent;
      }
      if (query.read) {
        filter["read.status"] = query.read;
      }
      if (query.popUp) {
        filter["popUp.status"] = query.popUp;
      }

      const sortDir = query.sortDir === "asc" ? 1 : -1;
      const skip = (query.page - 1) * query.pageSize;

      const [total, docs] = await Promise.all([
        Model.countDocuments(filter),
        Model.find(filter)
          .sort({ createdOn: sortDir, _id: sortDir })
          .skip(skip)
          .limit(query.pageSize)
          .lean(),
      ]);

      return {
        items: docs.map((doc) => toDomain(doc as NotificationDocument)),
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize) || 1),
      };
    },

    async countUnsent(
      organizationId: string,
      recipientUserId: string
    ): Promise<number> {
      return Model.countDocuments({
        organizationId,
        recipientUserId,
        "sent.status": "unsent",
      });
    },

    async markAllSent(
      organizationId: string,
      recipientUserId: string,
      at: Date
    ): Promise<number> {
      const result = await Model.updateMany(
        {
          organizationId,
          recipientUserId,
          "sent.status": "unsent",
        },
        {
          $set: {
            "sent.status": "sent",
            "sent.on": at,
          },
        }
      );
      return result.modifiedCount;
    },

    async markRead(
      organizationId: string,
      recipientUserId: string,
      id: string,
      at: Date
    ): Promise<Notification | null> {
      const doc = await Model.findOneAndUpdate(
        {
          _id: id,
          organizationId,
          recipientUserId,
        },
        {
          $set: {
            "read.status": "read",
            "read.on": at,
          },
        },
        { returnDocument: "after" }
      ).lean();
      return doc ? toDomain(doc as NotificationDocument) : null;
    },

    async markPopup(
      organizationId: string,
      recipientUserId: string,
      id: string,
      status: PopupStatus,
      at: Date
    ): Promise<Notification | null> {
      const doc = await Model.findOneAndUpdate(
        {
          _id: id,
          organizationId,
          recipientUserId,
        },
        {
          $set: {
            "popUp.status": status,
            "popUp.on": at,
          },
        },
        { returnDocument: "after" }
      ).lean();
      return doc ? toDomain(doc as NotificationDocument) : null;
    },

    async markAllPopupsRead(
      organizationId: string,
      recipientUserId: string,
      at: Date
    ): Promise<number> {
      const result = await Model.updateMany(
        {
          organizationId,
          recipientUserId,
          "popUp.status": "unread",
        },
        {
          $set: {
            "popUp.status": "read",
            "popUp.on": at,
          },
        }
      );
      return result.modifiedCount;
    },
  };
}
