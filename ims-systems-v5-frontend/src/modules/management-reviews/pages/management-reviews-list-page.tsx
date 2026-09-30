import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarCheck, Eye, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { EntityTableRow } from "@/shared/components/entity-table-row";
import { RowActionsMenu } from "@/shared/components/row-actions-menu";
import { SearchInput } from "@/shared/components/search-input";
import { PageHeader } from "@/shared/layout";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import { useFunctionalUnitsQuery } from "@/modules/functional-units/hooks/use-functional-units";
import { useUsersQuery } from "@/modules/users/hooks/use-users";
import {
  ReviewIntervalBadge,
  ReviewPrivacyBadge,
  ReviewStatusBadge,
} from "../components/review-badges";
import { ReviewSheet, type ReviewSheetMode } from "../components/review-sheet";
import { ReviewStatsCards } from "../components/review-stats-cards";
import {
  useDeleteManagementReviewMutation,
  useManagementReviewsQuery,
  useManagementReviewStatsQuery,
} from "../hooks/use-management-reviews";
import {
  REVIEW_INTERVALS,
  REVIEW_PRIVACY,
  REVIEW_STATUS_OPTIONS,
  type ReviewDisplayStatus,
  type ReviewInterval,
  type ReviewPrivacy,
} from "../types";

type PendingDelete = { id: string; label: string };

function UnitCell({ unitId }: { unitId?: string }) {
  const unitsQuery = useFunctionalUnitsQuery({ page: 1, pageSize: 100 });
  if (!unitId) return <span className="text-muted-foreground">—</span>;
  const name = unitsQuery.data?.items.find((u) => u.id === unitId)?.name;
  return <span className="truncate">{name ?? unitId.slice(0, 8)}</span>;
}

function formatSchedule(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * URL sheet state:
 * - `?create=1` → schedule sheet
 * - `?review=<id>` → view (edit is in-sheet local mode)
 */
export function ManagementReviewsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ReviewDisplayStatus | "">("");
  const [upcoming, setUpcoming] = useState(false);
  const [privacy, setPrivacy] = useState<ReviewPrivacy | "">("");
  const [interval, setInterval] = useState<ReviewInterval | "">("");
  const [businessUnitId, setBusinessUnitId] = useState("");
  const [attendeeId, setAttendeeId] = useState("");
  const [editMode, setEditMode] = useState(false);
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
  const reviewId = searchParams.get("review");
  const sheetOpen = createOpen || Boolean(reviewId);
  const sheetMode: ReviewSheetMode = createOpen
    ? "create"
    : editMode
      ? "edit"
      : "view";

  const nowIso = useMemo(() => new Date().toISOString(), []);

  const queryParams = useMemo(
    () => ({
      page,
      pageSize: 10,
      search: search || undefined,
      status: upcoming ? ("Scheduled" as const) : status || undefined,
      dateFrom: upcoming ? nowIso : undefined,
      privacy: privacy || undefined,
      interval: interval || undefined,
      businessUnitIds: businessUnitId ? [businessUnitId] : undefined,
      attendeeIds: attendeeId ? [attendeeId] : undefined,
      sort: "date" as const,
      sortDir: "desc" as const,
    }),
    [
      page,
      search,
      status,
      upcoming,
      nowIso,
      privacy,
      interval,
      businessUnitId,
      attendeeId,
    ]
  );

  const listQuery = useManagementReviewsQuery(queryParams);
  const statsQuery = useManagementReviewStatsQuery();
  const unitsQuery = useFunctionalUnitsQuery({ page: 1, pageSize: 100 });
  const usersQuery = useUsersQuery({ page: 1, pageSize: 100 });
  const deleteMutation = useDeleteManagementReviewMutation();

  const hasFilters = Boolean(
    search || status || upcoming || privacy || interval || businessUnitId || attendeeId
  );

  function openCreate() {
    setEditMode(false);
    setSearchParams({ create: "1" });
  }

  function openReview(id: string) {
    setEditMode(false);
    setSearchParams({ review: id });
  }

  function closeSheet() {
    setEditMode(false);
    setSearchParams({});
  }

  function handleModeChange(mode: ReviewSheetMode) {
    if (mode === "edit") {
      setEditMode(true);
      return;
    }
    if (mode === "view") setEditMode(false);
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setUpcoming(false);
    setPrivacy("");
    setInterval("");
    setBusinessUnitId("");
    setAttendeeId("");
    setPage(1);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    try {
      await deleteMutation.mutateAsync(id);
      setPendingDelete(null);
      notify.success("Management review deleted successfully");
      if (reviewId === id) closeSheet();
    } catch (error) {
      setPendingDelete(null);
      notify.fromError(error, "Unable to delete management review");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Management reviews"
        description="Organisation management review schedule — plan meetings, attach agenda, and mark reviews complete."
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus />
            Schedule review
          </Button>
        }
      />

      {statsQuery.isSuccess ? (
        <ReviewStatsCards
          stats={statsQuery.data}
          activeStatus={status}
          upcoming={upcoming}
          onSelectStatus={(next) => {
            setPage(1);
            setStatus(next);
            setUpcoming(false);
          }}
          onSelectUpcoming={(next) => {
            setPage(1);
            setUpcoming(next);
            if (next) setStatus("");
          }}
        />
      ) : null}

      <div className="ims-toolbar">
        <SearchInput
          placeholder="Search reference or title"
          aria-label="Search management reviews"
          containerClassName="min-w-[16rem] flex-1"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <select
          className="ims-select ims-field-sm w-auto min-w-[9rem]"
          value={status}
          aria-label="Filter by status"
          disabled={upcoming}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value as ReviewDisplayStatus | "");
          }}
        >
          <option value="">All statuses</option>
          {REVIEW_STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          className="ims-select ims-field-sm w-auto min-w-[9rem]"
          value={privacy}
          aria-label="Filter by privacy"
          onChange={(event) => {
            setPage(1);
            setPrivacy(event.target.value as ReviewPrivacy | "");
          }}
        >
          <option value="">All privacy</option>
          {REVIEW_PRIVACY.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          className="ims-select ims-field-sm w-auto min-w-[9rem]"
          value={interval}
          aria-label="Filter by interval"
          onChange={(event) => {
            setPage(1);
            setInterval(event.target.value as ReviewInterval | "");
          }}
        >
          <option value="">All intervals</option>
          {REVIEW_INTERVALS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          className="ims-select ims-field-sm w-auto min-w-[10rem]"
          value={businessUnitId}
          aria-label="Filter by business unit"
          onChange={(event) => {
            setPage(1);
            setBusinessUnitId(event.target.value);
          }}
        >
          <option value="">All units</option>
          {(unitsQuery.data?.items ?? []).map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
            </option>
          ))}
        </select>
        <select
          className="ims-select ims-field-sm w-auto min-w-[10rem]"
          value={attendeeId}
          aria-label="Filter by attendee"
          onChange={(event) => {
            setPage(1);
            setAttendeeId(event.target.value);
          }}
        >
          <option value="">All attendees</option>
          {(usersQuery.data?.items ?? []).map((row) => (
            <option key={row.user.id} value={row.user.id}>
              {row.user.name}
            </option>
          ))}
        </select>
        {hasFilters ? (
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        ) : null}
      </div>

      {listQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading management reviews…
        </div>
      ) : null}

      {listQuery.isError ? <ErrorState error={listQuery.error} /> : null}

      {listQuery.isSuccess && listQuery.data.total === 0 ? (
        <EmptyState
          icon={<CalendarCheck />}
          title={
            hasFilters
              ? "No management reviews match your filters"
              : "No management reviews scheduled yet"
          }
          description={
            hasFilters
              ? "Try clearing filters or adjusting your search."
              : "Schedule a management review to start the register."
          }
          action={
            hasFilters ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={openCreate}>
                <Plus />
                Schedule review
              </Button>
            )
          }
        />
      ) : null}

      {listQuery.isSuccess && listQuery.data.items.length > 0 ? (
        <div className="ims-table-wrap">
          <table className="ims-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Title</th>
                <th>Status</th>
                <th>Date</th>
                <th>Interval</th>
                <th>Privacy</th>
                <th>Unit</th>
                <th className="w-12 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {listQuery.data.items.map((review) => (
                <EntityTableRow
                  key={review.id}
                  onOpen={() => openReview(review.id)}
                >
                  <td className="font-mono text-xs text-muted-foreground">
                    {review.reference}
                  </td>
                  <td className="max-w-[14rem] truncate font-medium">
                    {review.title}
                  </td>
                  <td>
                    <ReviewStatusBadge status={review.displayStatus} />
                  </td>
                  <td className="text-muted-foreground whitespace-nowrap">
                    {formatSchedule(review.date)}
                  </td>
                  <td>
                    <ReviewIntervalBadge interval={review.interval} />
                  </td>
                  <td>
                    <ReviewPrivacyBadge privacy={review.privacy} />
                  </td>
                  <td className="max-w-[9rem]">
                    <UnitCell unitId={review.businessUnitId} />
                  </td>
                  <td className="text-right">
                    <RowActionsMenu
                      label={`Actions for ${review.title}`}
                      actions={[
                        {
                          id: "details",
                          label: "Details",
                          icon: <Eye />,
                          onSelect: () => openReview(review.id),
                        },
                        ...(!review.completed.status
                          ? [
                              {
                                id: "delete",
                                label: "Delete",
                                icon: <Trash2 />,
                                variant: "destructive" as const,
                                onSelect: () =>
                                  setPendingDelete({
                                    id: review.id,
                                    label: review.title,
                                  }),
                              },
                            ]
                          : []),
                      ]}
                    />
                  </td>
                </EntityTableRow>
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
          <span className="ims-text-meta tabular-nums">
            Page {listQuery.data.page} of {listQuery.data.totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= listQuery.data.totalPages}
            onClick={() =>
              setPage((current) =>
                Math.min(listQuery.data.totalPages, current + 1)
              )
            }
          >
            Next
          </Button>
        </div>
      ) : null}

      <ReviewSheet
        open={sheetOpen}
        mode={sheetMode}
        reviewId={reviewId}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        onModeChange={handleModeChange}
        onCreated={(count) =>
          notify.success(
            count > 1
              ? `${count} management reviews scheduled successfully`
              : "Management review scheduled successfully"
          )
        }
        onDeleted={() =>
          notify.success("Management review deleted successfully")
        }
        onActionMessage={(message) => notify.success(message)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete this management review?"
        description={
          pendingDelete
            ? `“${pendingDelete.label}” will be removed from the register.`
            : "This management review will be removed from the register."
        }
        confirmLabel="Delete review"
        pending={deleteMutation.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

function ErrorState({ error }: { error: unknown }) {
  if (isApiClientError(error)) {
    if (error.status === 403 || error.code === "FORBIDDEN") {
      return (
        <p className="ims-alert ims-alert-error" role="alert">
          You do not have permission to view management reviews.
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
      Unable to load management reviews.
    </p>
  );
}
