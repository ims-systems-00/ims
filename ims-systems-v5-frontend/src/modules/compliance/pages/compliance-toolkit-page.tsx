import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Eye, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { EntityTableRow } from "@/shared/components/entity-table-row";
import { RowActionsMenu } from "@/shared/components/row-actions-menu";
import { SearchInput } from "@/shared/components/search-input";
import { PageHeader } from "@/shared/layout";
import { isApiClientError } from "@/shared/lib/http/errors";
import { cn } from "@/shared/lib/utils";
import { notify } from "@/shared/lib/toast";
import { useUserQuery } from "@/modules/users/hooks/use-users";
import {
  useComplianceControlsQuery,
  useComplianceOverviewQuery,
  useComplianceToolkitsQuery,
  useProvisionToolkitMutation,
} from "../hooks/use-compliance";
import {
  decodeToolkitName,
  isComplianceToolkitName,
  selectedDisplayLabel,
  toolkitDisplayLabel,
  type ComplianceToolkitName,
} from "../types";
import {
  CompliancePercentBadge,
  ControlStateBadge,
} from "../components/control-badges";
import { ControlSheet } from "../components/control-sheet";
import { ToolkitOverviewPanel } from "../components/toolkit-overview-panel";

type TabId = "overview" | "toolkit";

function formatUpdated(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function UpdatedByCell({ userId }: { userId?: string | null }) {
  const query = useUserQuery(userId ?? undefined, Boolean(userId));
  if (!userId) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="truncate">
      {query.data?.user.name ?? userId.slice(0, 8)}
    </span>
  );
}

/**
 * Per-toolkit workspace: Overview + toolkit controls tab.
 * Licence module deferred — all catalogue toolkits are reachable from the sidebar.
 */
export function ComplianceToolkitPage() {
  const params = useParams<{ toolkitName: string }>();
  const rawName = decodeToolkitName(params.toolkitName ?? "");
  const toolkitName = isComplianceToolkitName(rawName) ? rawName : null;

  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<TabId>("overview");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [section, setSection] = useState("");
  const [page, setPage] = useState(1);
  const [autoProvisionAttempted, setAutoProvisionAttempted] = useState(false);

  const controlId = searchParams.get("control");
  const sheetOpen = Boolean(controlId);
  const displayName = toolkitName
    ? toolkitDisplayLabel(toolkitName)
    : "Compliance";

  useEffect(() => {
    setTab("overview");
    setSearchInput("");
    setSearch("");
    setSection("");
    setPage(1);
    setAutoProvisionAttempted(false);
  }, [toolkitName]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const toolkitsQuery = useComplianceToolkitsQuery();
  const overviewQuery = useComplianceOverviewQuery(toolkitName ?? undefined);
  const controlsQuery = useComplianceControlsQuery(toolkitName ?? undefined, {
    page,
    pageSize: 25,
    search: search || undefined,
    section: section || undefined,
    sort: "clause",
    sortDir: "asc",
  });
  const provisionMutation = useProvisionToolkitMutation();

  const summary = useMemo(
    () => toolkitsQuery.data?.find((row) => row.name === toolkitName),
    [toolkitsQuery.data, toolkitName]
  );

  const sectionOptions = useMemo(() => {
    const sections = overviewQuery.data?.sections ?? [];
    return sections.map((row) => ({
      value: row.section,
      label: `${row.section} ${row.title}`,
    }));
  }, [overviewQuery.data]);

  const notProvisioned =
    Boolean(toolkitName) &&
    toolkitsQuery.isSuccess &&
    Boolean(summary && !summary.provisioned);
  const missingOverview =
    overviewQuery.isError &&
    !overviewQuery.isFetching &&
    isApiClientError(overviewQuery.error) &&
    overviewQuery.error.status === 404;
  const needsProvision = notProvisioned || missingOverview;

  useEffect(() => {
    if (!toolkitName || !needsProvision || autoProvisionAttempted) return;
    if (provisionMutation.isPending) return;
    setAutoProvisionAttempted(true);
    void provisionMutation
      .mutateAsync(toolkitName)
      .then(() => {
        notify.success(`${displayName} activated`);
      })
      .catch((error) => {
        notify.fromError(error, "Unable to activate toolkit");
      });
  }, [
    toolkitName,
    needsProvision,
    autoProvisionAttempted,
    provisionMutation,
    displayName,
  ]);

  function openControl(id: string) {
    const next = new URLSearchParams(searchParams);
    next.set("control", id);
    setSearchParams(next);
  }

  function closeControl(open: boolean) {
    if (open) return;
    const next = new URLSearchParams(searchParams);
    next.delete("control");
    setSearchParams(next);
  }

  async function handleActivate(name: ComplianceToolkitName) {
    try {
      await provisionMutation.mutateAsync(name);
      notify.success(`${toolkitDisplayLabel(name)} activated`);
    } catch (error) {
      notify.fromError(error, "Unable to activate toolkit");
    }
  }

  if (!toolkitName) {
    return (
      <EmptyState
        title="Unknown compliance toolkit"
        description="This toolkit is not part of the compliance catalogue."
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={displayName}
        description="Track control implementation and overall compliance for this framework."
      />

      {needsProvision ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Preparing toolkit controls…
          </div>
          {autoProvisionAttempted && provisionMutation.isError ? (
            <EmptyState
              title="Toolkit not activated"
              description="Activation failed. Retry to create organisation control statuses for this framework."
              action={
                <Button
                  type="button"
                  disabled={provisionMutation.isPending}
                  onClick={() => handleActivate(toolkitName)}
                >
                  {provisionMutation.isPending
                    ? "Activating…"
                    : "Activate toolkit"}
                </Button>
              }
            />
          ) : null}
        </div>
      ) : (
        <>
          <div
            className="flex flex-wrap gap-1 border-b border-border-subtle"
            role="tablist"
            aria-label="Toolkit views"
          >
            {(
              [
                { id: "overview", label: "Overview" },
                { id: "toolkit", label: displayName },
              ] as const
            ).map((item) => {
              const selected = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={cn(
                    "relative px-3 py-2 text-sm font-medium transition-colors",
                    selected
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                  {selected ? (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {tab === "overview" ? (
            overviewQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading overview…
              </div>
            ) : overviewQuery.isError || !overviewQuery.data ? (
              <EmptyState
                title="Unable to load overview"
                description="This iso tool has been deleted or removed."
              />
            ) : (
              <ToolkitOverviewPanel overview={overviewQuery.data} />
            )
          ) : null}

          {tab === "toolkit" ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <SearchInput
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search clause, title, or description"
                  containerClassName="sm:max-w-sm"
                />
                <select
                  className="ims-select sm:max-w-xs"
                  value={section}
                  aria-label="Filter by section"
                  onChange={(event) => {
                    setPage(1);
                    setSection(event.target.value);
                  }}
                >
                  <option value="">All sections</option>
                  {sectionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {controlsQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading controls…
                </div>
              ) : controlsQuery.isError ? (
                <EmptyState title="Unable to load controls" />
              ) : (controlsQuery.data?.items.length ?? 0) === 0 ? (
                <EmptyState
                  title="No controls found"
                  description="Try a different search or section filter."
                />
              ) : (
                <>
                  <div className="ims-table-wrap">
                    <table className="ims-table min-w-[56rem]">
                      <thead>
                        <tr>
                          <th>Clause</th>
                          <th>Title</th>
                          <th>Selected</th>
                          <th>Status</th>
                          <th>Compliance</th>
                          <th>Last updated</th>
                          <th>Updated by</th>
                          <th className="w-12 text-right">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {controlsQuery.data?.items.map((control) => (
                          <EntityTableRow
                            key={control.id}
                            onOpen={() => openControl(control.id)}
                          >
                            <td className="tabular-nums tracking-tight text-muted-foreground">
                              {control.clause}
                            </td>
                            <td className="max-w-[16rem] truncate font-medium">
                              {control.title}
                            </td>

                            <td className="text-muted-foreground">
                              {selectedDisplayLabel(control.selected)}
                            </td>
                            <td>
                              <ControlStateBadge state={control.state} />
                            </td>
                            <td>
                              <CompliancePercentBadge
                                value={control.compliancePercentage}
                              />
                            </td>
                            <td className="whitespace-nowrap text-muted-foreground">
                              {formatUpdated(control.updatedOn)}
                            </td>
                            <td className="max-w-[8rem]">
                              <UpdatedByCell userId={control.updatedBy} />
                            </td>
                            <td className="text-right">
                              <RowActionsMenu
                                label={`Actions for clause ${control.clause}`}
                                actions={[
                                  {
                                    id: "view",
                                    label: "View details",
                                    icon: <Eye className="size-3.5" />,
                                    onSelect: () => openControl(control.id),
                                  },
                                ]}
                              />
                            </td>
                          </EntityTableRow>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="ims-pagination">
                    <p>
                      Page {controlsQuery.data?.page ?? page} of{" "}
                      {controlsQuery.data?.totalPages ?? 1} ·{" "}
                      {controlsQuery.data?.total ?? 0} controls
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={page <= 1}
                        onClick={() => setPage((current) => current - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={
                          page >= (controlsQuery.data?.totalPages ?? 1)
                        }
                        onClick={() => setPage((current) => current + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </>
      )}

      <ControlSheet
        open={sheetOpen}
        controlId={controlId}
        onOpenChange={closeControl}
      />
    </div>
  );
}
