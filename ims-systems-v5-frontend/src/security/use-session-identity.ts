/**
 * Session identity helpers for product UI (M7).
 * Stub keeps DEV_STUB_*; Auth0 uses GET /users/me.
 */

import { useSessionUserQuery } from "@/modules/users/hooks/use-users";
import { loadPublicEnv } from "@/shared/lib/env";
import {
  DEV_STUB_IDENTITY,
  resolveProfileUserId,
} from "./development-stub";

/**
 * IMS subject used for authored records / task filters.
 * Stub: `dev-stub-user`. Auth0: Mongo user ObjectId from /users/me.
 */
export function useSessionSubjectId(): string | undefined {
  const provider = loadPublicEnv().VITE_SECURITY_PROVIDER;
  const stubProfileId =
    provider === "development-stub"
      ? resolveProfileUserId(DEV_STUB_IDENTITY)
      : undefined;
  const sessionQuery = useSessionUserQuery(stubProfileId);

  if (provider === "development-stub") {
    return DEV_STUB_IDENTITY.subjectId;
  }
  return sessionQuery.data?.user.id;
}

/**
 * Users-directory id for profile / default owners.
 * Stub: demo Ada ObjectId. Auth0: same as subject (IMS user id).
 */
export function useSessionProfileUserId(): string | undefined {
  const provider = loadPublicEnv().VITE_SECURITY_PROVIDER;
  const stubProfileId =
    provider === "development-stub"
      ? resolveProfileUserId(DEV_STUB_IDENTITY)
      : undefined;
  const sessionQuery = useSessionUserQuery(stubProfileId);
  return sessionQuery.data?.user.id ?? stubProfileId;
}
