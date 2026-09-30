/**
 * Notifications application service.
 * Spec: docs/module-specifications/notifications.md
 *
 * Public createForRecipients is the only path other modules may use.
 */

import type { Authorizer, SecurityIdentity } from "../../../security";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import type { NotificationsUsersPort } from "../ports";
import type { NotificationRepository } from "../repositories/notification.repository";
import {
  MAX_NOTIFICATION_MESSAGE_LENGTH,
  MAX_NOTIFICATION_RECIPIENTS,
  MAX_NOTIFICATION_TITLE_LENGTH,
  NOTIFICATIONS_RESOURCE,
  type BroadcastNoticeInput,
  type CreateNotificationRecipientInput,
  type CreateNotificationsInput,
  type ListNotificationsQuery,
  type Notification,
  type PaginatedNotifications,
  type PopupStatus,
  type UnsentCount,
} from "../types";

function requireOrgIdentity(identity: SecurityIdentity | null | undefined): {
  identity: SecurityIdentity;
  organizationId: string;
  subjectId: string;
} {
  if (!identity?.subjectId) throw new UnauthorizedError();
  if (!identity.organizationId) {
    throw new ForbiddenError("Organisation context is required");
  }
  return {
    identity,
    organizationId: identity.organizationId,
    subjectId: identity.subjectId,
  };
}

function assertRecipientPayload(
  recipients: CreateNotificationRecipientInput[]
): void {
  if (recipients.length === 0) {
    throw new ValidationAppError("At least one recipient is required");
  }
  if (recipients.length > MAX_NOTIFICATION_RECIPIENTS) {
    throw new ValidationAppError(
      `At most ${MAX_NOTIFICATION_RECIPIENTS} recipients are allowed per request`
    );
  }
  for (const recipient of recipients) {
    if (!recipient.recipientUserId?.trim()) {
      throw new ValidationAppError("recipientUserId is required");
    }
    if (!recipient.title?.trim()) {
      throw new ValidationAppError("title is required");
    }
    if (recipient.title.trim().length > MAX_NOTIFICATION_TITLE_LENGTH) {
      throw new ValidationAppError(
        `title must be at most ${MAX_NOTIFICATION_TITLE_LENGTH} characters`
      );
    }
    if (!recipient.message?.trim()) {
      throw new ValidationAppError("message is required");
    }
    if (recipient.message.trim().length > MAX_NOTIFICATION_MESSAGE_LENGTH) {
      throw new ValidationAppError(
        `message must be at most ${MAX_NOTIFICATION_MESSAGE_LENGTH} characters`
      );
    }
  }
}

export type NotificationsServiceDeps = {
  repository: NotificationRepository;
  authorizer: Authorizer;
  users: NotificationsUsersPort;
};

export type NotificationsService = ReturnType<typeof createNotificationsService>;

/**
 * Narrow public application interface for other modules.
 * Do not import the repository or Mongoose model from outside this module.
 */
export type NotificationsApplicationPort = {
  createForRecipients(
    input: CreateNotificationsInput
  ): Promise<Notification[]>;
};

export function createNotificationsService(deps: NotificationsServiceDeps) {
  const { repository, authorizer, users } = deps;

  async function assertAllowed(
    identity: SecurityIdentity,
    action: "read" | "create" | "update"
  ): Promise<void> {
    const allowed = await authorizer.allow({
      identity,
      action,
      resourceType: NOTIFICATIONS_RESOURCE,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError(
        "User does not have permission to access Notifications"
      );
    }
  }

  const service = {
    /**
     * Module/system create path — organisation/createdBy must be supplied by
     * the calling module's trusted adapter (not by HTTP clients).
     */
    async createForRecipients(
      input: CreateNotificationsInput
    ): Promise<Notification[]> {
      if (!input.organizationId?.trim()) {
        throw new ValidationAppError("organizationId is required");
      }
      if (!input.createdBy?.trim()) {
        throw new ValidationAppError("createdBy is required");
      }
      assertRecipientPayload(input.recipients);

      const uniqueRecipients = new Map<string, CreateNotificationRecipientInput>();
      for (const recipient of input.recipients) {
        const key = `${recipient.recipientUserId}:${recipient.referenceType}:${recipient.referenceModuleId ?? ""}:${recipient.message}`;
        uniqueRecipients.set(key, {
          ...recipient,
          title: recipient.title.trim(),
          message: recipient.message.trim(),
          recipientUserId: recipient.recipientUserId.trim(),
        });
      }

      return repository.insertMany({
        organizationId: input.organizationId,
        createdBy: input.createdBy,
        createdOn: new Date(),
        recipients: [...uniqueRecipients.values()],
      });
    },

    async list(
      identity: SecurityIdentity | null | undefined,
      query: ListNotificationsQuery
    ): Promise<PaginatedNotifications> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      return repository.list(organizationId, subjectId, query);
    },

    async getById(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<Notification> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const notification = await repository.findById(organizationId, id);
      if (!notification) {
        throw new NotFoundError("Notification not found");
      }
      if (notification.recipientUserId !== subjectId) {
        throw new NotFoundError("Notification not found");
      }
      return notification;
    },

    async unsentCount(
      identity: SecurityIdentity | null | undefined
    ): Promise<UnsentCount> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const count = await repository.countUnsent(organizationId, subjectId);
      return { count };
    },

    async markAllSent(
      identity: SecurityIdentity | null | undefined
    ): Promise<{ modifiedCount: number }> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "update");
      const modifiedCount = await repository.markAllSent(
        organizationId,
        subjectId,
        new Date()
      );
      return { modifiedCount };
    },

    async markRead(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<Notification> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "update");
      const updated = await repository.markRead(
        organizationId,
        subjectId,
        id,
        new Date()
      );
      if (!updated) {
        throw new NotFoundError("Notification not found");
      }
      return updated;
    },

    async markPopup(
      identity: SecurityIdentity | null | undefined,
      id: string,
      status: PopupStatus = "read"
    ): Promise<Notification> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "update");
      const updated = await repository.markPopup(
        organizationId,
        subjectId,
        id,
        status,
        new Date()
      );
      if (!updated) {
        throw new NotFoundError("Notification not found");
      }
      return updated;
    },

    async markAllPopupsRead(
      identity: SecurityIdentity | null | undefined
    ): Promise<{ modifiedCount: number }> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "update");
      const modifiedCount = await repository.markAllPopupsRead(
        organizationId,
        subjectId,
        new Date()
      );
      return { modifiedCount };
    },

    async broadcast(
      identity: SecurityIdentity | null | undefined,
      input: BroadcastNoticeInput
    ): Promise<{ createdCount: number; sample: Notification | null }> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");

      const message = input.message.trim();
      if (!message) {
        throw new ValidationAppError("Message is required");
      }
      if (message.length > MAX_NOTIFICATION_MESSAGE_LENGTH) {
        throw new ValidationAppError(
          `Message must be at most ${MAX_NOTIFICATION_MESSAGE_LENGTH} characters`
        );
      }

      // Spec / V4: audience selector is currently ineffective — always all org users.
      void input.audience;

      const userIds = await users.listActiveUserIds(actor);
      if (userIds.length === 0) {
        return { createdCount: 0, sample: null };
      }
      if (userIds.length > MAX_NOTIFICATION_RECIPIENTS) {
        throw new ValidationAppError(
          `Broadcast exceeds the maximum of ${MAX_NOTIFICATION_RECIPIENTS} recipients`
        );
      }

      const created = await service.createForRecipients({
        organizationId,
        createdBy: subjectId,
        recipients: userIds.map((recipientUserId) => ({
          recipientUserId,
          title: "Notice",
          message,
          referenceType: "notifications",
          screenIdentifier: "",
          params: { id: null, businessUnitId: null },
          popUpStatus: "unread",
          isOrganizational: true,
        })),
      });

      return {
        createdCount: created.length,
        sample: created[0] ?? null,
      };
    },
  };

  return service;
}
