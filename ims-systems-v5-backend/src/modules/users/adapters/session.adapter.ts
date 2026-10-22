/**
 * Real SessionPort (N-13): revokes the user's Auth0 grants/refresh
 * tokens when access is revoked, the user is soft-deleted, or an
 * expired account is blocked. Best-effort — failures are logged by the
 * caller pattern (service awaits but revocation must not resurrect a
 * deleted user flow), and users without an Auth0 subject are skipped.
 */

import type { Logger } from "../../../infrastructure/logging/logger";
import type { Auth0ManagementApi } from "../../../security/auth0/auth0-management-api";
import { createUserRepository } from "../repositories/user.repository";
import type { SessionPort } from "../ports";

export interface SessionAdapterDeps {
  mgmt: Auth0ManagementApi;
  logger?: Logger;
  findAuth0SubjectId?: (userId: string) => Promise<string | null>;
}

export function createAuth0SessionAdapter(deps: SessionAdapterDeps): SessionPort {
  const findSubject =
    deps.findAuth0SubjectId ??
    (async (userId: string) => {
      const user = await createUserRepository().findByIdIncludingDeleted(userId);
      return user?.auth0SubjectId ?? null;
    });
  return {
    async clearSessionsForUser(userId: string): Promise<void> {
      try {
        const subject = await findSubject(userId);
        if (!subject) return;
        await deps.mgmt.revokeUserGrants(subject);
      } catch (error) {
        deps.logger?.warn(
          { userId, err: error instanceof Error ? error.message : String(error) },
          "N-13: Auth0 session revocation failed (access tokens expire naturally)",
        );
      }
    },
  };
}
