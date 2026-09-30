import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Contact, Eye, Loader2, Plus, Trash2 } from "lucide-react";
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
import {
  CustomerStageBadge,
  CustomerStatusBadge,
} from "../components/customer-badges";
import {
  CustomerSheet,
  type CustomerSheetMode,
} from "../components/customer-sheet";
import {
  useCustomersQuery,
  useDeleteCustomerMutation,
} from "../hooks/use-customers";
import {
  CUSTOMER_STATUSES,
  type CustomerStage,
  type CustomerStatus,
} from "../types";

type PendingDelete = { id: string; label: string };

const STAGE_PRESETS: Array<{
  id: string;
  label: string;
  stages?: CustomerStage[];
  myCustomers?: boolean;
}> = [
  { id: "all", label: "All customers" },
  { id: "mine", label: "My customers", myCustomers: true },
  { id: "live", label: "Live", stages: ["Live"] },
  { id: "prospects", label: "Prospects", stages: ["Prospect"] },
  { id: "warm", label: "Warm leads", stages: ["Warm lead"] },
  { id: "qualified", label: "Qualified", stages: ["Qualified"] },
  { id: "proposals", label: "Proposals", stages: ["Proposal"] },
];

function ManagerCell({ userId }: { userId?: string }) {
  const query = useUserQuery(userId, Boolean(userId));
  if (!userId) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="truncate">
      {query.data?.user.name ?? userId.slice(0, 8)}
    </span>
  );
}

function UnitCell({ unitId }: { unitId?: string }) {
  const unitsQuery = useFunctionalUnitsQuery({ page: 1, pageSize: 100 });
  if (!unitId) return <span className="text-muted-foreground">—</span>;
  const name = unitsQuery.data?.items.find((u) => u.id === unitId)?.name;
  return <span className="truncate">{name ?? unitId.slice(0, 8)}</span>;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
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
 * - `?create=1` → register sheet
 * - `?customer=<id>` → view (edit is in-sheet local mode)
 */
export function CustomersListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [presetId, setPresetId] = useState("all");
  const [status, setStatus] = useState<CustomerStatus | "">("");
  const [businessUnitId, setBusinessUnitId] = useState("");
  const [accountManagerId, setAccountManagerId] = useState("");
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
  const customerId = searchParams.get("customer");
  const sheetOpen = createOpen || Boolean(customerId);
  const sheetMode: CustomerSheetMode = createOpen
    ? "create"
    : editMode
      ? "edit"
      : "view";

  const preset = STAGE_PRESETS.find((item) => item.id === presetId);

  const queryParams = useMemo(
    () => ({
      page,
      pageSize: 10,
      search: search || undefined,
      stages: preset?.stages,
      statuses: status ? [status] : undefined,
      businessUnitIds: businessUnitId ? [businessUnitId] : undefined,
      accountManagerIds: accountManagerId ? [accountManagerId] : undefined,
      myCustomers: preset?.myCustomers,
      sort: "createdOn" as const,
      sortDir: "desc" as const,
    }),
    [page, search, preset, status, businessUnitId, accountManagerId]
  );

  const listQuery = useCustomersQuery(queryParams);
  const unitsQuery = useFunctionalUnitsQuery({ page: 1, pageSize: 100 });
  const usersQuery = useUsersQuery({ page: 1, pageSize: 100 });
  const deleteMutation = useDeleteCustomerMutation();

  const hasFilters = Boolean(
    search ||
      presetId !== "all" ||
      status ||
      businessUnitId ||
      accountManagerId
  );

  function openCreate() {
    setEditMode(false);
    setSearchParams({ create: "1" });
  }

  function openCustomer(id: string) {
    setEditMode(false);
    setSearchParams({ customer: id });
  }

  function closeSheet() {
    setEditMode(false);
    setSearchParams({});
  }

  function handleModeChange(mode: CustomerSheetMode) {
    if (mode === "edit") setEditMode(true);
    if (mode === "view") setEditMode(false);
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setPresetId("all");
    setStatus("");
    setBusinessUnitId("");
    setAccountManagerId("");
    setPage(1);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    try {
      await deleteMutation.mutateAsync(id);
      setPendingDelete(null);
      if (customerId === id) closeSheet();
      notify.success("Customer deleted successfully");
    } catch (error) {
      setPendingDelete(null);
      notify.fromError(error, "Unable to delete customer");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customers"
        description="CRM register — prospects through live customers, ownership, contracts, and linked follow-up."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" asChild>
              <Link to="/customers/overview">MY CRM</Link>
            </Button>
            <Button type="button" onClick={openCreate}>
              <Plus />
              Register customer
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {STAGE_PRESETS.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={presetId === item.id ? "default" : "outline"}
            onClick={() => {
              setPage(1);
              setPresetId(item.id);
            }}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="ims-toolbar">
        <SearchInput
          placeholder="Search reference, name, email, or service"
          aria-label="Search customers"
          containerClassName="min-w-[16rem] flex-1"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <select
          className="ims-select ims-field-sm w-auto min-w-[9rem]"
          value={status}
          aria-label="Filter by status"
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value as CustomerStatus | "");
          }}
        >
          <option value="">All statuses</option>
          {CUSTOMER_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
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
          value={accountManagerId}
          aria-label="Filter by account manager"
          onChange={(event) => {
            setPage(1);
            setAccountManagerId(event.target.value);
          }}
        >
          <option value="">All managers</option>
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
          Loading customers…
        </div>
      ) : null}

      {listQuery.isError ? <ErrorState error={listQuery.error} /> : null}

      {listQuery.isSuccess && listQuery.data.total === 0 ? (
        <EmptyState
          icon={<Contact />}
          title={
            hasFilters
              ? "No customers match your filters"
              : "No customers in the register yet"
          }
          description={
            hasFilters
              ? "Try clearing filters or adjusting your search."
              : "Register a customer to start tracking the sales pipeline."
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
                Register customer
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
                <th>Organisation</th>
                <th>Unit</th>
                <th>Profile</th>
                <th>Manager</th>
                <th>Updated</th>
                <th className="w-12 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {listQuery.data.items.map((customer) => (
                <EntityTableRow
                  key={customer.id}
                  onOpen={() => openCustomer(customer.id)}
                >
                  <td className="font-mono text-xs text-muted-foreground">
                    {customer.reference}
                  </td>
                  <td className="max-w-[14rem] truncate font-medium">
                    {customer.name}
                  </td>
                  <td className="max-w-[9rem]">
                    <UnitCell unitId={customer.businessUnitId} />
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <CustomerStageBadge stage={customer.stage} />
                      {customer.stage !== "Live" ? (
                        <CustomerStatusBadge status={customer.status} />
                      ) : null}
                    </div>
                  </td>
                  <td className="max-w-[10rem]">
                    <ManagerCell userId={customer.accountManager} />
                  </td>
                  <td className="whitespace-nowrap text-muted-foreground">
                    {formatDate(customer.updatedOn ?? customer.updatedAt)}
                  </td>
                  <td className="text-right">
                    <RowActionsMenu
                      label={`Actions for ${customer.name}`}
                      actions={[
                        {
                          id: "details",
                          label: "Details",
                          icon: <Eye />,
                          onSelect: () => openCustomer(customer.id),
                        },
                        ...(customer.stage !== "Live"
                          ? [
                              {
                                id: "delete",
                                label: "Delete",
                                icon: <Trash2 />,
                                variant: "destructive" as const,
                                onSelect: () =>
                                  setPendingDelete({
                                    id: customer.id,
                                    label: customer.name,
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

      <CustomerSheet
        open={sheetOpen}
        mode={sheetMode}
        customerId={customerId}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        onModeChange={handleModeChange}
        onCreated={() => notify.success("Customer registered successfully")}
        onDeleted={() => notify.success("Customer deleted successfully")}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete this customer?"
        description={
          pendingDelete
            ? `“${pendingDelete.label}” will be removed from the register.`
            : "This customer will be removed from the register."
        }
        confirmLabel="Delete customer"
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
          You do not have permission to view customers.
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
      Unable to load customers.
    </p>
  );
}
