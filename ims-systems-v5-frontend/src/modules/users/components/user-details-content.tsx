import { useState, type ReactNode } from "react";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/status-badge";
import { isApiClientError } from "@/shared/lib/http/errors";
import { useSessionProfileUserId } from "@/security";
import { ImageUploadControl } from "@/modules/files/components/image-upload-control";
import { notify } from "@/shared/lib/toast";
import {
  useProfileImageUrl,
  useUpdateProfileImageMutation,
  useUserQuery,
} from "../hooks/use-users";
import type { OrgMembershipView, User } from "../types";
import { EditProfileSheet } from "./edit-profile-sheet";
import { ManageEmploymentSheet } from "./manage-employment-sheet";
import { UserAvatar } from "./user-avatar";
import { UserBusinessUnitsCard } from "./user-business-units-card";
import { formatDate, formatDateTime } from "@/shared/lib/format-date";

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
  const sessionProfileId = useSessionProfileUserId();
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
  const [employmentOpen, setEmploymentOpen] = useState(false);
  const groupIds = membership?.groupIds ?? [];
  const profileImageUrl = useProfileImageUrl(user);
  const profileImageMutation = useUpdateProfileImageMutation(user.id);

  const workingDays = membership?.workShift
    ? (
        [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ] as const
      ).filter((day) => membership.workShift?.[day]).length
    : 0;

  return (
    <div className="space-y-4">
      <section className="ims-panel overflow-hidden">
        <div className="flex flex-wrap items-start gap-4 px-4 py-5">
          {canEditProfile ? (
            <ImageUploadControl
              imageUrl={profileImageUrl}
              alt={`${user.name} profile picture`}
              fallbackLabel={(user.name || user.email || "U")
                .slice(0, 2)
                .toUpperCase()}
              uploadLabel="Upload photo"
              changeLabel="Change photo"
              onUploaded={async (meta, viewUrl) => {
                await profileImageMutation.mutateAsync({
                  url: viewUrl,
                  fileName: meta.Name,
                  storageKey: meta.Key || meta.key,
                  bucket: meta.Bucket,
                });
                notify.success("Profile picture updated");
              }}
            />
          ) : (
            <UserAvatar
              name={user.name}
              imageUrl={profileImageUrl}
              size="lg"
              className="size-14 text-sm"
            />
          )}
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
                      {formatDate(user.emailVerified.on)}
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

        <ProfileCard
          title="Employment"
          action={
            membership ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setEmploymentOpen(true)}
              >
                Manage
              </Button>
            ) : null
          }
        >
          {membership ? (
            <dl className="ims-detail-grid">
              <DetailItem label="Role" value={membership.role || "—"} />
              <DetailItem
                label="Job title"
                value={membership.jobTitle || "Not set"}
              />
              <DetailItem
                label="Working place"
                value={membership.workLocationType || "On-site"}
              />
              <DetailItem
                label="Salary"
                value={
                  membership.salary != null ? String(membership.salary) : "0"
                }
              />
              <DetailItem
                label="Country"
                value={membership.country || "United Kingdom"}
              />
              <DetailItem
                label="Annual leave entitlement"
                value={
                  membership.leaveDaysEntitled != null
                    ? String(membership.leaveDaysEntitled)
                    : "0"
                }
              />
              <DetailItem
                label="TOIL balance"
                value={
                  membership.toilBalance != null
                    ? String(membership.toilBalance)
                    : "0"
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
              <DetailItem
                label="Operating hours"
                value={
                  workingDays > 0
                    ? `${workingDays} day${workingDays === 1 ? "" : "s"} set`
                    : "Not set"
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
              value={formatDate(user.systemAccess.expires)}
            />
            <DetailItem
              label="Last logged in"
              value={formatDateTime(user.loggedIn.on)}
            />
            <DetailItem label="Created" value={formatDateTime(user.createdAt)} />
            <DetailItem label="Updated" value={formatDateTime(user.updatedAt)} />
            <DetailItem
              label="Access policies"
              value={
                (user.accessPolicies?.length ?? 0) > 0
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
      {membership && employmentOpen ? (
        <ManageEmploymentSheet
          open={employmentOpen}
          userId={user.id}
          membership={membership}
          onOpenChange={setEmploymentOpen}
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
