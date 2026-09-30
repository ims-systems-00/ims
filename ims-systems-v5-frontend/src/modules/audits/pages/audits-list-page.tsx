import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ClipboardCheck, Eye, Loader2, Plus, Trash2 } from "lucide-react";
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
import { useUserQuery, useUsersQuery } from "@/modules/users/hooks/use-users";
import { AuditSheet, type AuditSheetMode } from "../components/audit-sheet";
import {
  AuditIntervalBadge,
  AuditStatusBadge,
} from "../components/audit-badges";
import { AuditStatsCards } from "../components/audit-stats-cards";
import {
  useAuditsQuery,
  useAuditStatsQuery,
  useDeleteAuditMutation,
} from "../hooks/use-audits";
import {
  AUDIT_STATUS_OPTIONS,
  type AuditDisplayStatus,
  type AuditType,
} from "../types";

type PendingDelete = { id: string; label: string };

function AuditorCell({ auditorId }: { auditorId?: string }) {
  const query = useUserQuery(auditorId, Boolean(auditorId));
  if (!auditorId) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="truncate">
      {query.data?.user.name ?? auditorId.slice(0, 8)}
    </span>
  );
}

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

type AuditsListPageProps = {
  auditType: AuditType;
};

/**
 * URL sheet state:
 * - `?create=1` → schedule sheet
 * - `?audit=<id>` → view (edit is in-sheet local mode)
 */
export function AuditsListPage({ auditType }: AuditsListPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<AuditDisplayStatus | "">("");
  const [upcoming, setUpcoming] = useState(false);
  const [businessUnitId, setBusinessUnitId] = useState("");
  const [auditorId, setAuditorId] = useState("");
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
  const auditId = searchParams.get("audit");
  const sheetOpen = createOpen || Boolean(auditId);
  const sheetMode: AuditSheetMode = createOpen
    ? "create"
    : editMode
      ? "edit"
      : "view";

  const queryParams = useMemo(
    () => ({
      page,
      pageSize: 10,
      type: auditType,
      search: search || undefined,
      status: upcoming ? undefined : status || undefined,
      upcoming: upcoming || undefined,
      businessUnitIds: businessUnitId ? [businessUnitId] : undefined,
      auditorIds: auditorId ? [auditorId] : undefined,
      sort: "startDate" as const,
      sortDir: "desc" as const,
    }),
    [page, auditType, search, status, upcoming, businessUnitId, auditorId]
  );

  const listQuery = useAuditsQuery(queryParams);
  const statsQuery = useAuditStatsQuery(auditType);
  const unitsQuery = useFunctionalUnitsQuery({ page: 1, pageSize: 100 });
  const usersQuery = useUsersQuery({ page: 1, pageSize: 100 });
  const deleteMutation = useDeleteAuditMutation();

  const hasFilters = Boolean(
    search || status || upcoming || businessUnitId || auditorId
  );

  function openCreate() {
    setEditMode(false);
    setSearchParams({ create: "1" });
  }

  function openAudit(id: string) {
    setEditMode(false);
    setSearchParams({ audit: id });
  }

  function closeSheet() {
    setEditMode(false);
    setSearchParams({});
  }

  function handleModeChange(mode: AuditSheetMode) {
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
    setBusinessUnitId("");
    setAuditorId("");
    setPage(1);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    try {
      await deleteMutation.mutateAsync(id);
      setPendingDelete(null);
      notify.success("Audit deleted successfully");
      if (auditId === id) closeSheet();
    } catch (error) {
      setPendingDelete(null);
      notify.fromError(error, "Unable to delete audit");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${auditType} audits`}
        description={`Organisation ${auditType.toLowerCase()} audit register — schedule, conduct, and complete audits.`}
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus />
            Schedule audit
          </Button>
        }
      />

      {statsQuery.isSuccess ? (
        <AuditStatsCards
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
          placeholder="Search reference, title, or focus area"
          aria-label="Search audits"
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
            setStatus(event.target.value as AuditDisplayStatus | "");
          }}
        >
          <option value="">All statuses</option>
          {AUDIT_STATUS_OPTIONS.map((option) => (
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
          value={auditorId}
          aria-label="Filter by auditor"
          onChange={(event) => {
            setPage(1);
            setAuditorId(event.target.value);
          }}
        >
          <option value="">All auditors</option>
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
          Loading audits…
        </div>
      ) : null}

      {listQuery.isError ? <ErrorState error={listQuery.error} /> : null}

      {listQuery.isSuccess && listQuery.data.total === 0 ? (
        <EmptyState
          icon={<ClipboardCheck />}
          title={
            hasFilters
              ? "No audits match your filters"
              : `No ${auditType.toLowerCase()} audits scheduled yet`
          }
          description={
            hasFilters
              ? "Try clearing filters or adjusting your search."
              : "Schedule an audit to start the register."
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
                Schedule audit
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
                <th>Unit</th>
                <th>Compliance body</th>
                <th>Auditor</th>
                <th>Status</th>
                <th>Schedule</th>
                <th>Interval</th>
                <th className="w-12 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {listQuery.data.items.map((audit) => (
                <EntityTableRow
                  key={audit.id}
                  onOpen={() => openAudit(audit.id)}
                >
                  <td className="font-mono text-xs text-muted-foreground">
                    {audit.reference}
                  </td>
                  <td className="max-w-[14rem] truncate font-medium">
                    {audit.title}
                  </td>
                  <td className="max-w-[9rem]">
                    <UnitCell unitId={audit.businessUnitId} />
                  </td>
                  <td className="max-w-[9rem]">
                    <UnitCell unitId={audit.complianceBodyId} />
                  </td>
                  <td className="max-w-[10rem]">
                    <AuditorCell auditorId={audit.auditorId} />
                  </td>
                  <td>
                    <AuditStatusBadge status={audit.displayStatus} />
                  </td>
                  <td className="text-muted-foreground whitespace-nowrap">
                    {formatSchedule(audit.startDate)}
                  </td>
                  <td>
                    <AuditIntervalBadge interval={audit.interval} />
                  </td>
                  <td className="text-right">
                    <RowActionsMenu
                      label={`Actions for ${audit.title}`}
                      actions={[
                        {
                          id: "details",
                          label: "Details",
                          icon: <Eye />,
                          onSelect: () => openAudit(audit.id),
                        },
                        ...(!audit.completed.status
                          ? [
                              {
                                id: "delete",
                                label: "Delete",
                                icon: <Trash2 />,
                                variant: "destructive" as const,
                                onSelect: () =>
                                  setPendingDelete({
                                    id: audit.id,
                                    label: audit.title,
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

      <AuditSheet
        open={sheetOpen}
        mode={sheetMode}
        auditId={auditId}
        auditType={auditType}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        onModeChange={handleModeChange}
        onCreated={(count) =>
          notify.success(
            count > 1
              ? `${count} audits scheduled successfully`
              : "Audit scheduled successfully"
          )
        }
        onDeleted={() => notify.success("Audit deleted successfully")}
        onActionMessage={(message) => notify.success(message)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete this audit?"
        description={
          pendingDelete
            ? `“${pendingDelete.label}” will be removed from the register.`
            : "This audit will be removed from the register."
        }
        confirmLabel="Delete audit"
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
          You do not have permission to view audits.
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
      Unable to load audits.
    </p>
  );
}

export function InternalAuditsListPage() {
  return <AuditsListPage auditType="Internal" />;
}

export function ExternalAuditsListPage() {
  return <AuditsListPage auditType="External" />;
}
