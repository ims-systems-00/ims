/**
 * Adapter: Users public list → NotificationsUsersPort for broadcast fan-out.
 */

import type { SecurityIdentity } from "../../../security";
import type { UsersService } from "../../users";
import type { NotificationsUsersPort } from "../ports";
import { MAX_NOTIFICATION_RECIPIENTS } from "../types";

export function createNotificationsUsersAdapter(
  users: UsersService
): NotificationsUsersPort {
  return {
    async listActiveUserIds(identity: SecurityIdentity) {
      const ids: string[] = [];
      let page = 1;
      let totalPages = 1;

      do {
        const listed = await users.list(identity, {
          page,
          pageSize: 100,
        });
        totalPages = listed.totalPages;
        for (const row of listed.items) {
          ids.push(row.user.id);
          if (ids.length >= MAX_NOTIFICATION_RECIPIENTS) {
            return ids.slice(0, MAX_NOTIFICATION_RECIPIENTS);
          }
        }
        page += 1;
      } while (page <= totalPages);

      return ids;
    },
  };
}
