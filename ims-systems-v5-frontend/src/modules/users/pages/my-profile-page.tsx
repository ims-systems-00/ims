import { PageHeader } from "@/shared/layout";
import {
  DEV_STUB_IDENTITY,
  resolveProfileUserId,
} from "@/security";
import { loadPublicEnv } from "@/shared/lib/env";
import { UserDetailsContent } from "../components/user-details-content";
import { useSessionUserQuery } from "../hooks/use-users";

/**
 * Session user's profile — linked from the navbar account menu.
 * Spec: docs/module-specifications/users.md (own profile via navbar).
 * Auth0: loads via GET /users/me (Bearer → IMS user id).
 */
export function MyProfilePage() {
  const provider = loadPublicEnv().VITE_SECURITY_PROVIDER;
  const stubUserId =
    provider === "development-stub"
      ? resolveProfileUserId(DEV_STUB_IDENTITY)
      : undefined;
  const sessionQuery = useSessionUserQuery(stubUserId);
  const userId = sessionQuery.data?.user.id ?? stubUserId;

  return (
    <div className="mx-auto max-w-8xl space-y-5">
      <PageHeader
        title="My Profile"
        description="Your account identity, joined business units, and organisation membership for the current session."
      />
      {sessionQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading profile…</p>
      ) : userId ? (
        <UserDetailsContent userId={userId} canEditProfile />
      ) : (
        <p className="ims-alert ims-alert-error" role="alert">
          Unable to resolve the current session user.
        </p>
      )}
    </div>
  );
}
