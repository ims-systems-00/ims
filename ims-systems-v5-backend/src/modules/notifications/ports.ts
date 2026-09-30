/**
 * Cross-module ports for Notifications.
 * Spec: docs/module-specifications/notifications.md §5 / §12
 */

import type { SecurityIdentity } from "../../security";

/**
 * Resolve organisation members for broadcast notices.
 * Implemented via Users list in /api/v1 composition.
 */
export type NotificationsUsersPort = {
  listActiveUserIds(identity: SecurityIdentity): Promise<string[]>;
};

export class EmptyNotificationsUsersAdapter implements NotificationsUsersPort {
  async listActiveUserIds(): Promise<string[]> {
    return [];
  }
}
