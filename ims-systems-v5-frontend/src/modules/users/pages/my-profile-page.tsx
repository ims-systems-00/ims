import { PageHeader } from "@/shared/layout";
import { DEV_STUB_IDENTITY, resolveProfileUserId } from "@/security";
import { UserDetailsContent } from "../components/user-details-content";

/**
 * Session user's profile — linked from the navbar account menu.
 * Spec: docs/module-specifications/users.md (own profile via navbar).
 */
export function MyProfilePage() {
  const userId = resolveProfileUserId(DEV_STUB_IDENTITY);

  return (
    <div className="mx-auto max-w-8xl space-y-5">
      <PageHeader
        title="My Profile"
        description="Your account identity, joined business units, and organisation membership for the current session."
      />
      {userId ? (
        <UserDetailsContent userId={userId} canEditProfile />
      ) : (
        <p className="ims-alert ims-alert-error" role="alert">
          Unable to resolve the current session user.
        </p>
      )}
    </div>
  );
}
