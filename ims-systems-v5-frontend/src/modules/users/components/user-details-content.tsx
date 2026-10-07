import { useState, type ReactNode } from "react";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/status-badge";
import { isApiClientError } from "@/shared/lib/http/errors";
import { DEV_STUB_IDENTITY, resolveProfileUserId } from "@/security";
import { useUserQuery } from "../hooks/use-users";
import type { OrgMembershipView, User } from "../types";
import { EditProfileSheet } from "./edit-profile-sheet";
import { UserAvatar } from "./user-avatar";
import { UserBusinessUnitsCard } from "./user-business-units-card";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function accessTone(
  status: string
): "success" | "warning" | "destructive" | "neutral" {
  if (status === "Active") return "success";
  if (status === "Blocked") return "destructive";
  if (status === "Deactivated") return "warning";
  return "neutral";
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <dt className="ims-detail-label">{label}</dt>
      <dd className="ims-detail-value break-words">{value ?? "—"}</dd>
    </div>
  );
}

function ProfileCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="ims-panel overflow-hidden">
      <div className="ims-panel-header">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {action}
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

type UserDetailsContentProps = {
  userId: string;
  /** When false, skip fetching (sheet closed). Default true. */
  enabled?: boolean;
  /**
   * Force edit affordance. When omitted, edit is available for the session
   * profile user (My Profile / own directory row).
   */
  canEditProfile?: boolean;
};

/**
 * Fetches and renders classified user detail for a given user id.
 * Shared by My Profile, Users directory, and Functional Units member views.
 */
export function UserDetailsContent({
  userId,
  enabled = true,
  canEditProfile,
}: UserDetailsContentProps) {
  const query = useUserQuery(userId, enabled);
  const sessionProfileId = resolveProfileUserId(DEV_STUB_IDENTITY);
  const allowEdit =
    canEditProfile ?? (Boolean(sessionProfileId) && userId === sessionProfileId);

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading user details…
      </div>
    );
  }

  if (query.isError) {
    return <UserDetailsError error={query.error} />;
  }

  if (!query.data) {
    return null;
  }

  return (
    <UserDetailsView
      user={query.data.user}
      membership={query.data.membership}
      canEditProfile={allowEdit}
    />
  );
}

export function UserDetailsView({
  user,
  membership,
  canEditProfile = false,
}: {
  user: User;
  membership: OrgMembershipView | null;
  canEditProfile?: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const groupIds = membership?.groupIds ?? [];

  return (
    <div className="space-y-4">
      <section className="ims-panel overflow-hidden">
        <div className="flex flex-wrap items-start gap-4 px-4 py-5">
          <UserAvatar
            name={user.name}
            imageUrl={user.profileImage?.url}
            size="lg"
            className="size-14 text-sm"
          />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[1.125rem] font-semibold tracking-[-0.015em] text-foreground">
                {user.name}
              </h2>
              <StatusBadge tone={accessTone(user.systemAccess.status)}>
                {user.systemAccess.status}
              </StatusBadge>
            </div>
            <p className="truncate text-[0.8125rem] text-muted-foreground">
              {user.email}
            </p>
            <p className="ims-text-meta font-mono">{user.reference}</p>
            {membership?.jobTitle || membership?.role ? (
              <p className="text-[0.8125rem] text-muted-foreground">
                {[membership.jobTitle, membership.role]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
          </div>
          {canEditProfile ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setEditOpen(true)}
            >
              <Pencil />
              Edit profile
            </Button>
          ) : null}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileCard title="Profile">
          <dl className="ims-detail-grid">
            <DetailItem label="First name" value={user.firstName} />
            <DetailItem label="Last name" value={user.lastName} />
            <DetailItem label="User type" value={user.type} />
            <DetailItem
              label="Email verification"
              value={
                <span className="inline-flex flex-wrap items-center gap-2">
                  <StatusBadge
                    tone={
                      user.emailVerified.status === "verified"
                        ? "success"
                        : "neutral"
                    }
                  >
                    {user.emailVerified.status}
                  </StatusBadge>
                  {user.emailVerified.on ? (
                    <span className="text-xs text-muted-foreground">
                      {formatDateOnly(user.emailVerified.on)}
                    </span>
                  ) : null}
                </span>
              }
            />
            <DetailItem label="Phone" value={user.phone || "—"} />
            <DetailItem
              label="Country"
              value={
                user.country?.name
                  ? `${user.country.name}${user.country.code ? ` (${user.country.code})` : ""}`
                  : "—"
              }
            />
          </dl>
        </ProfileCard>

        <ProfileCard title="Employment">
          {membership ? (
            <dl className="ims-detail-grid">
              <DetailItem label="Role" value={membership.role || "—"} />
              <DetailItem
                label="Job title"
                value={membership.jobTitle || "—"}
              />
              <DetailItem
                label="Work location type"
                value={membership.workLocationType || "—"}
              />
              <DetailItem
                label="Employment country"
                value={membership.country || "—"}
              />
              <DetailItem
                label="Leave days entitled"
                value={
                  membership.leaveDaysEntitled != null
                    ? String(membership.leaveDaysEntitled)
                    : "—"
                }
              />
              <DetailItem
                label="TOIL balance"
                value={
                  membership.toilBalance != null
                    ? String(membership.toilBalance)
                    : "—"
                }
              />
              <DetailItem
                label="Line managers"
                value={
                  membership.lineManagerIds &&
                  membership.lineManagerIds.length > 0
                    ? `${membership.lineManagerIds.length} assigned`
                    : "None assigned"
                }
              />
            </dl>
          ) : (
            <p className="text-[0.8125rem] text-muted-foreground">
              No organisation membership details available.
            </p>
          )}
        </ProfileCard>

        <UserBusinessUnitsCard groupIds={groupIds} />

        <ProfileCard title="Account">
          <dl className="ims-detail-grid">
            <DetailItem
              label="Access period"
              value={user.systemAccess.period || "—"}
            />
            <DetailItem
              label="Access expires"
              value={formatDateOnly(user.systemAccess.expires)}
            />
            <DetailItem
              label="Last logged in"
              value={formatDate(user.loggedIn.on)}
            />
            <DetailItem label="Created" value={formatDate(user.createdAt)} />
            <DetailItem label="Updated" value={formatDate(user.updatedAt)} />
            <DetailItem
              label="Access policies"
              value={
                user.accessPolicies.length > 0
                  ? `${user.accessPolicies.length} polic${user.accessPolicies.length === 1 ? "y" : "ies"}`
                  : "None"
              }
            />
          </dl>
        </ProfileCard>
      </div>

      {canEditProfile ? (
        <EditProfileSheet
          open={editOpen}
          user={user}
          onOpenChange={setEditOpen}
        />
      ) : null}
    </div>
  );
}

function UserDetailsError({ error }: { error: unknown }) {
  if (isApiClientError(error)) {
    if (error.status === 404) {
      return (
        <p className="ims-alert ims-alert-info" role="status">
          User not found.
        </p>
      );
    }
    if (error.status === 403 || error.code === "FORBIDDEN") {
      return (
        <p className="ims-alert ims-alert-error" role="alert">
          You do not have permission to view this user.
        </p>
      );
    }
    return (
      <p className="ims-alert ims-alert-error" role="alert">
        {error.message}
      </p>
    );
  }
  return (
    <p className="ims-alert ims-alert-error" role="alert">
      Unable to load user details.
    </p>
  );
}
