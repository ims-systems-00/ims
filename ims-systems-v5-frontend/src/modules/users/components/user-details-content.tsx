import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { StatusBadge } from "@/shared/components/status-badge";
import { isApiClientError } from "@/shared/lib/http/errors";
import { useUserQuery } from "../hooks/use-users";
import type { OrgMembershipView, User } from "../types";
import { UserAvatar } from "./user-avatar";

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

type DetailItemProps = {
  label: string;
  value: ReactNode;
  className?: string;
};

function DetailItem({ label, value, className }: DetailItemProps) {
  return (
    <div className={className}>
      <dt className="ims-detail-label">{label}</dt>
      <dd className="ims-detail-value break-words">{value ?? "—"}</dd>
    </div>
  );
}

type SectionProps = {
  title: string;
  children: ReactNode;
};

function Section({ title, children }: SectionProps) {
  return (
    <section className="space-y-3">
      <h3 className="ims-text-section border-b border-border-subtle pb-2">
        {title}
      </h3>
      {children}
    </section>
  );
}

type UserDetailsContentProps = {
  userId: string;
  /** When false, skip fetching (sheet closed). Default true. */
  enabled?: boolean;
};

/**
 * Fetches and renders classified user detail for a given user id.
 * Shared by Users directory and Functional Units member views.
 */
export function UserDetailsContent({
  userId,
  enabled = true,
}: UserDetailsContentProps) {
  const query = useUserQuery(userId, enabled);

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
    <UserDetailsView user={query.data.user} membership={query.data.membership} />
  );
}

export function UserDetailsView({
  user,
  membership,
}: {
  user: User;
  membership: OrgMembershipView | null;
}) {
  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3.5">
        <UserAvatar
          name={user.name}
          imageUrl={user.profileImage?.url}
          size="lg"
        />
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[1.0625rem] font-semibold tracking-[-0.015em] text-foreground">
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
        </div>
      </header>

      <Section title="Profile">
        <dl className="ims-detail-grid">
          <DetailItem label="First name" value={user.firstName} />
          <DetailItem label="Last name" value={user.lastName} />
          <DetailItem label="User type" value={user.type} />
          <DetailItem
            label="Email verification"
            value={
              <span className="inline-flex items-center gap-2">
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
      </Section>

      <Section title="Organisation">
        {membership ? (
          <dl className="ims-detail-grid">
            <DetailItem label="Role" value={membership.role || "—"} />
            <DetailItem label="Job title" value={membership.jobTitle || "—"} />
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
              label="Business units"
              value={
                membership.groupIds && membership.groupIds.length > 0
                  ? `${membership.groupIds.length} assigned`
                  : "None assigned"
              }
            />
            <DetailItem
              label="Line managers"
              value={
                membership.lineManagerIds && membership.lineManagerIds.length > 0
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
      </Section>

      <Section title="Account">
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
                ? `${user.accessPolicies.length} policy${user.accessPolicies.length === 1 ? "" : "ies"}`
                : "None"
            }
          />
        </dl>
      </Section>
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
