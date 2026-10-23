import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarOff, Eye, Loader2, Plus, Send, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { EntityTableRow } from "@/shared/components/entity-table-row";
import { RowActionsMenu } from "@/shared/components/row-actions-menu";
import { SearchInput } from "@/shared/components/search-input";
import { PageHeader } from "@/shared/layout";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import { useSessionSubjectId } from "@/security";
import { LeaveSheet } from "../components/leave-sheet";
import { LeaveStatusBadge } from "../components/leave-status-badge";
import {
  useDeleteLeaveMutation,
  useLeavesQuery,
  useSubmitLeaveMutation,
} from "../hooks/use-leaves";
import {
  LEAVE_STATUSES,
  LEAVE_TYPES,
  type LeaveListScope,
  type LeaveStatus,
  type LeaveType,
} from "../types";
import { formatDate } from "@/shared/lib/format-date";

const SCOPES: { value: LeaveListScope; label: string }[] = [
  { value: "mine", label: "My leave" },
  { value: "managed", label: "Managed" },
];

type PendingDelete = { id: string; label: string };

/**
 * Staff wallet — leave requests list (iHR / My Wallet).
 * URL sheet state: `?create=1` | `?leave=<id>`
 */
export function LeavesListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const subjectId = useSessionSubjectId();
  const [scope, setScope] = useState<LeaveListScope>("mine");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<LeaveStatus | "">("");
  const [type, setType] = useState<LeaveType | "">("");
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null
  );

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const createOpen = searchParams.get("create") === "1";
  const leaveId = searchParams.get("leave");
  const sheetOpen = createOpen || Boolean(leaveId);

  const queryParams = useMemo(
    () => ({
      page,
      pageSize: 10,
      scope,
      search: search || undefined,
      status: status || undefined,
      type: type || undefined,
      sortDir: "desc" as const,
    }),
    [page, scope, search, status, type]
  );

  const listQuery = useLeavesQuery(queryParams);
  const submitMutation = useSubmitLeaveMutation();
  const deleteMutation = useDeleteLeaveMutation();

  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const pageSize = listQuery.data?.pageSize ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function openCreate() {
    setSearchParams({ create: "1" });
  }

  function openLeave(id: string) {
    setSearchParams({ leave: id });
  }

  function closeSheet() {
    setSearchParams({});
  }

  function changeScope(next: LeaveListScope) {
    setScope(next);
    setPage(1);
  }

  return (
    <div className="mx-auto max-w-8xl space-y-5">
      <PageHeader
        title="Leaves"
        description="Request annual or sick leave and review requests from your team."
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus /> Request leave
          </Button>
        }
      />

      <div
        role="tablist"
        aria-label="Leave scope"
        className="inline-flex rounded-md border border-border bg-surface p-0.5"
      >
        {SCOPES.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={scope === option.value}
            onClick={() => changeScope(option.value)}
            className={cn(
              "rounded-[5px] px-3 py-1.5 text-[0.8125rem] font-medium transition-colors",
              scope === option.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by reference or description…"
          containerClassName="max-w-xs"
        />
        <select
          className="ims-select w-40"
          value={type}
          onChange={(e) => {
            setPage(1);
            setType(e.target.value as LeaveType | "");
          }}
          aria-label="Filter by type"
        >
          <option value="">All types</option>
          {LEAVE_TYPES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          className="ims-select w-40"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as LeaveStatus | "");
          }}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {LEAVE_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      {listQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading leave requests…
        </div>
      ) : null}

      {listQuery.isError ? (
        <p className="text-sm text-destructive">
          Unable to load leave requests.
        </p>
      ) : null}

      {listQuery.isSuccess && total === 0 ? (
        <EmptyState
          icon={<CalendarOff />}
          title={
            scope === "managed"
              ? "No leave requests to review"
              : "No leave requests yet"
          }
          description={
            scope === "managed"
              ? "Requests from the people you manage will appear here."
              : "Request annual or sick leave and send it to your line manager."
          }
          action={
            scope === "mine" ? (
              <Button type="button" onClick={openCreate}>
                <Plus /> Request leave
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {listQuery.isSuccess && items.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Days</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((leave) => {
                const leaveStatus = leave.submission.status;
                const isOwner = Boolean(
                  subjectId && leave.createdBy === subjectId
                );
                const canSubmit =
                  isOwner &&
                  (leaveStatus === "Draft" || leaveStatus === "Ongoing");
                const canDelete = isOwner && leaveStatus === "Draft";
                return (
                  <EntityTableRow
                    key={leave.id}
                    onOpen={() => openLeave(leave.id)}
                  >
                    <td className="px-4 py-3 font-medium">{leave.reference}</td>
                    <td className="px-4 py-3">{leave.type}</td>
                    <td className="px-4 py-3 tabular-nums">{leave.days}</td>
                    <td className="px-4 py-3">{formatDate(leave.createdOn)}</td>
                    <td className="px-4 py-3">
                      {formatDate(leave.submission.submissionDate)}
                    </td>
                    <td className="px-4 py-3">
                      <LeaveStatusBadge status={leaveStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <RowActionsMenu
                        label={`Actions for ${leave.reference}`}
                        actions={[
                          {
                            id: "view",
                            label: "View",
                            icon: <Eye />,
                            onSelect: () => openLeave(leave.id),
                          },
                          ...(canSubmit
                            ? [
                                {
                                  id: "submit",
                                  label: "Submit",
                                  icon: <Send />,
                                  onSelect: () =>
                                    void submitMutation
                                      .mutateAsync(leave.id)
                                      .then(() =>
                                        notify.success(
                                          "Leave request submitted to your line manager successfully"
                                        )
                                      )
                                      .catch((e) =>
                                        notify.fromError(
                                          e,
                                          "Unable to submit leave request"
                                        )
                                      ),
                                },
                              ]
                            : []),
                          ...(canDelete
                            ? [
                                {
                                  id: "delete",
                                  label: "Delete",
                                  icon: <Trash2 />,
                                  variant: "destructive" as const,
                                  onSelect: () =>
                                    setPendingDelete({
                                      id: leave.id,
                                      label: leave.reference,
                                    }),
                                },
                              ]
                            : []),
                        ]}
                      />
                    </td>
                  </EntityTableRow>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {listQuery.isSuccess && totalPages > 1 ? (
        <div className="ims-pagination flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            {total} leave request{total === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <LeaveSheet
        open={sheetOpen}
        mode={createOpen ? "create" : "view"}
        leaveId={leaveId}
        onOpenChange={(next) => {
          if (!next) closeSheet();
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete draft leave request?"
        description={
          pendingDelete
            ? `Delete ${pendingDelete.label}? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        pending={deleteMutation.isPending}
        onConfirm={() => {
          if (!pendingDelete) return;
          void deleteMutation
            .mutateAsync(pendingDelete.id)
            .then(() => {
              notify.success("Leave request deleted successfully");
              setPendingDelete(null);
            })
            .catch((e) =>
              notify.fromError(e, "Unable to delete leave request")
            );
        }}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      />
    </div>
  );
}
