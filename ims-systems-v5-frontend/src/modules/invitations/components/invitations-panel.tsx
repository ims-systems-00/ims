import { useEffect, useMemo, useState } from "react";
import { Loader2, Mail, RotateCw, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { RowActionsMenu } from "@/shared/components/row-actions-menu";
import { SearchInput } from "@/shared/components/search-input";
import { StatusBadge } from "@/shared/components/status-badge";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import type { Invitation } from "../types";
import {
  useInvitationsQuery,
  useRemoveInvitationMutation,
  useResendInvitationMutation,
} from "../hooks/use-invitations";
import { formatDateTime } from "@/shared/lib/format-date";

/**
 * "Invited people" — pending organisation invitations with resend/remove.
 */
export function InvitationsPanel() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pendingRemove, setPendingRemove] = useState<Invitation | null>(null);

  const resendMutation = useResendInvitationMutation();
  const removeMutation = useRemoveInvitationMutation();

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const params = useMemo(
    () => ({ page, pageSize: 10, search: search || undefined }),
    [page, search]
  );
  const listQuery = useInvitationsQuery(params);

  async function handleResend(invitation: Invitation) {
    try {
      await resendMutation.mutateAsync(invitation.id);
      notify.success("Invitation resent");
    } catch (error) {
      notify.error(
        isApiClientError(error)
          ? error.message
          : "Could not resend the invitation."
      );
    }
  }

  async function handleRemove() {
    if (!pendingRemove) return;
    try {
      await removeMutation.mutateAsync(pendingRemove.id);
      notify.success("Invitation removed");
      setPendingRemove(null);
    } catch (error) {
      notify.error(
        isApiClientError(error)
          ? error.message
          : "Could not remove the invitation."
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="ims-toolbar">
        <SearchInput
          placeholder="Search invited people by email"
          aria-label="Search invitations"
          containerClassName="min-w-[16rem] max-w-md flex-1"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
      </div>

      {listQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading invitations…
        </div>
      ) : null}

      {listQuery.isError ? (
        <p className="ims-alert ims-alert-error" role="alert">
          {isApiClientError(listQuery.error)
            ? listQuery.error.message
            : "Unable to load invitations."}
        </p>
      ) : null}

      {listQuery.isSuccess && listQuery.data.total === 0 ? (
        <EmptyState
          icon={<Mail />}
          title={search ? "No invitations match your search" : "No pending invitations"}
          description={
            search
              ? "Try a different email address."
              : "Use Add user to invite someone to your organisation."
          }
        />
      ) : null}

      {listQuery.isSuccess && listQuery.data.items.length > 0 ? (
        <div className="ims-table-wrap">
          <table className="ims-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Sent on</th>
                <th>Account</th>
                <th className="w-12 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {listQuery.data.items.map((invitation) => (
                <tr key={invitation.id}>
                  <td className="font-medium">{invitation.email}</td>
                  <td className="text-muted-foreground">{invitation.role}</td>
                  <td>
                    <StatusBadge
                      tone={invitation.status === "Pending" ? "warning" : "neutral"}
                    >
                      {invitation.status === "Pending" ? "Sent" : "Expired"}
                    </StatusBadge>
                  </td>
                  <td className="text-muted-foreground">
                    {formatDateTime(invitation.updatedAt)}
                  </td>
                  <td className="text-muted-foreground">
                    {invitation.hasAccount ? "Has account" : "No account yet"}
                  </td>
                  <td className="text-right">
                    <RowActionsMenu
                      label={`Actions for ${invitation.email}`}
                      actions={[
                        {
                          id: "resend",
                          label: "Resend",
                          icon: <RotateCw />,
                          onSelect: () => void handleResend(invitation),
                        },
                        {
                          id: "remove",
                          label: "Remove",
                          icon: <Trash2 />,
                          variant: "destructive" as const,
                          onSelect: () => setPendingRemove(invitation),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {listQuery.isSuccess && listQuery.data.totalPages > 1 ? (
        <div className="ims-pagination">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <span>
            Page {listQuery.data.page} of {listQuery.data.totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= listQuery.data.totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingRemove !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null);
        }}
        title="Remove invitation"
        description={
          pendingRemove
            ? `Remove the invitation for ${pendingRemove.email}? Their invitation link will stop working.`
            : ""
        }
        confirmLabel="Remove"
        pending={removeMutation.isPending}
        onConfirm={handleRemove}
      />
    </div>
  );
}
