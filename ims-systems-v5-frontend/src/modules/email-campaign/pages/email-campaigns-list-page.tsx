import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, Loader2, Mail, Plus, Trash2 } from "lucide-react";
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
import { useUserQuery } from "@/modules/users/hooks/use-users";
import { CampaignStatusBadge } from "../components/campaign-badges";
import {
  CampaignSheet,
  type CampaignSheetMode,
} from "../components/campaign-sheet";
import {
  useDeleteEmailCampaignMutation,
  useEmailCampaignsQuery,
} from "../hooks/use-email-campaigns";
import type { CampaignStatus } from "../types";
import { formatDate } from "@/shared/lib/format-date";

type PendingDelete = { id: string; label: string };

function CreatorCell({ userId }: { userId: string }) {
  const query = useUserQuery(userId, Boolean(userId));
  return (
    <span className="truncate">
      {query.data?.user.name ?? userId.slice(0, 8)}
    </span>
  );
}

function UnitCell({ unitId }: { unitId: string }) {
  const unitsQuery = useFunctionalUnitsQuery({ page: 1, pageSize: 100 });
  const name = unitsQuery.data?.items.find((u) => u.id === unitId)?.name;
  return <span className="truncate">{name ?? unitId.slice(0, 8)}</span>;
}

/**
 * URL sheet state:
 * - `?create=1` → create sheet
 * - `?campaign=<id>` → view (edit is in-sheet local mode)
 */
export function EmailCampaignsListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<CampaignStatus | "">("");
  const [businessUnitId, setBusinessUnitId] = useState("");
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
  const campaignId = searchParams.get("campaign");
  const sheetOpen = createOpen || Boolean(campaignId);
  const sheetMode: CampaignSheetMode = createOpen
    ? "create"
    : editMode
      ? "edit"
      : "view";

  const queryParams = useMemo(
    () => ({
      page,
      pageSize: 10,
      search: search || undefined,
      statuses: status ? [status] : undefined,
      businessUnitIds: businessUnitId ? [businessUnitId] : undefined,
      sort: "createdOn" as const,
      sortDir: "desc" as const,
    }),
    [page, search, status, businessUnitId]
  );

  const listQuery = useEmailCampaignsQuery(queryParams);
  const unitsQuery = useFunctionalUnitsQuery({ page: 1, pageSize: 100 });
  const deleteMutation = useDeleteEmailCampaignMutation();

  const hasFilters = Boolean(search || status || businessUnitId);

  function openCreate() {
    setEditMode(false);
    setSearchParams({ create: "1" });
  }

  function openCampaign(id: string) {
    setEditMode(false);
    setSearchParams({ campaign: id });
  }

  function closeSheet() {
    setEditMode(false);
    setSearchParams({});
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setBusinessUnitId("");
    setPage(1);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync(pendingDelete.id);
      notify.success("Campaign deleted");
      setPendingDelete(null);
      if (campaignId === pendingDelete.id) closeSheet();
    } catch (error) {
      notify.error(
        isApiClientError(error) ? error.message : "Failed to delete campaign"
      );
    }
  }

  const items = listQuery.data?.items ?? [];
  const totalPages = listQuery.data?.totalPages ?? 1;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Email Campaign"
        description="Create, launch, and track bulk email to CRM customers."
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus />
            Add campaign
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by reference…"
          aria-label="Search campaigns"
        />
        <select
          className="ims-select ims-field-sm w-auto min-w-[10rem]"
          value={status}
          aria-label="Filter by status"
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value as CampaignStatus | "");
          }}
        >
          <option value="">All statuses</option>
          <option value="Draft">Draft</option>
          <option value="Queued">Queued</option>
          <option value="Sent">Sent</option>
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
        {hasFilters ? (
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        ) : null}
      </div>

      {listQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading campaigns…
        </div>
      ) : null}

      {listQuery.isSuccess && listQuery.data.total === 0 ? (
        <EmptyState
          icon={<Mail />}
          title="No data found"
          description={
            hasFilters
              ? "Try clearing filters or search."
              : "Create your first email campaign to reach customers."
          }
          action={
            !hasFilters ? (
              <Button type="button" onClick={openCreate}>
                <Plus />
                Add campaign
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {listQuery.isSuccess && items.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Business unit</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created on</th>
                <th className="px-4 py-3 font-medium">Created by</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((campaign) => (
                <EntityTableRow
                  key={campaign.id}
                  onOpen={() => openCampaign(campaign.id)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {campaign.reference}
                  </td>
                  <td className="px-4 py-3">
                    <UnitCell unitId={campaign.businessUnitId} />
                  </td>
                  <td className="max-w-[14rem] truncate px-4 py-3 font-medium">
                    {campaign.subject}
                  </td>
                  <td className="max-w-[10rem] truncate px-4 py-3">
                    {campaign.target.length > 0
                      ? campaign.target.join(", ")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <CampaignStatusBadge status={campaign.status} />
                  </td>
                  <td className="px-4 py-3">
                    {formatDate(campaign.createdOn)}
                  </td>
                  <td className="px-4 py-3">
                    <CreatorCell userId={campaign.createdBy} />
                  </td>
                  <td className="px-4 py-3">
                    <RowActionsMenu
                      label={`Actions for ${campaign.reference}`}
                      actions={[
                        {
                          id: "details",
                          label: "Full detail",
                          icon: <Eye />,
                          onSelect: () =>
                            navigate(`/email-campaigns/${campaign.id}`),
                        },
                        ...(campaign.status !== "Sent"
                          ? [
                              {
                                id: "delete",
                                label: "Delete",
                                icon: <Trash2 />,
                                variant: "destructive" as const,
                                onSelect: () =>
                                  setPendingDelete({
                                    id: campaign.id,
                                    label: campaign.reference,
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

      {listQuery.isSuccess && totalPages > 1 ? (
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
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}

      <CampaignSheet
        open={sheetOpen}
        mode={sheetMode}
        campaignId={campaignId}
        onOpenChange={(next) => {
          if (!next) closeSheet();
        }}
        onModeChange={(mode) => {
          setEditMode(mode === "edit");
        }}
        onCreated={() => {
          void listQuery.refetch();
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
        title="Delete campaign"
        description={`Delete ${pendingDelete?.label ?? "this campaign"}? This cannot be undone.`}
        confirmLabel="Delete"
        pending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
