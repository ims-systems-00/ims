import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Eye, Loader2, Users } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { EntityTableRow } from "@/shared/components/entity-table-row";
import { RowActionsMenu } from "@/shared/components/row-actions-menu";
import { SearchInput } from "@/shared/components/search-input";
import { StatusBadge } from "@/shared/components/status-badge";
import { PageHeader } from "@/shared/layout";
import { isApiClientError } from "@/shared/lib/http/errors";
import { UserAvatar } from "../components/user-avatar";
import { UserDetailsSheet } from "../components/user-details-sheet";
import { useUsersQuery } from "../hooks/use-users";

/**
 * Organisation Users directory — Active members of the current organisation.
 * Row click / Details action opens the shared User Details sheet.
 * Invitation and admin mutations arrive in later Users frontend tasks.
 */
export function UsersListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const userId = searchParams.get("user");
  const sheetOpen = Boolean(userId);

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
  const listQuery = useUsersQuery(params);

  function openUser(id: string) {
    setSearchParams({ user: id });
  }

  function closeSheet() {
    setSearchParams({});
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users"
        description="Organisation directory of people with Active system access."
      />

      <div className="ims-toolbar">
        <SearchInput
          placeholder="Search by name or email"
          aria-label="Search users"
          containerClassName="min-w-[16rem] max-w-md flex-1"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
      </div>

      {listQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading users…
        </div>
      ) : null}

      {listQuery.isError ? (
        <p className="ims-alert ims-alert-error" role="alert">
          {isApiClientError(listQuery.error)
            ? listQuery.error.message
            : "Unable to load users."}
        </p>
      ) : null}

      {listQuery.isSuccess && listQuery.data.total === 0 ? (
        <EmptyState
          icon={<Users />}
          title={search ? "No users match your search" : "No active users"}
          description={
            search
              ? "Try a different name or email."
              : "Active organisation members will appear here."
          }
        />
      ) : null}

      {listQuery.isSuccess && listQuery.data.items.length > 0 ? (
        <div className="ims-table-wrap">
          <table className="ims-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Job title</th>
                <th>Role</th>
                <th>Status</th>
                <th className="w-12 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {listQuery.data.items.map(({ user, membership }) => (
                <EntityTableRow
                  key={user.id}
                  onOpen={() => openUser(user.id)}
                >
                  <td>
                    <div className="flex items-center gap-2.5">
                      <UserAvatar name={user.name} size="sm" />
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </td>
                  <td className="text-muted-foreground">{user.email}</td>
                  <td className="text-muted-foreground">
                    {membership?.jobTitle ?? "—"}
                  </td>
                  <td className="text-muted-foreground">
                    {membership?.role ?? "—"}
                  </td>
                  <td>
                    <StatusBadge
                      tone={
                        user.systemAccess.status === "Active"
                          ? "success"
                          : "neutral"
                      }
                    >
                      {user.systemAccess.status}
                    </StatusBadge>
                  </td>
                  <td className="text-right">
                    <RowActionsMenu
                      label={`Actions for ${user.name}`}
                      actions={[
                        {
                          id: "details",
                          label: "Details",
                          icon: <Eye />,
                          onSelect: () => openUser(user.id),
                        },
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

      <UserDetailsSheet
        open={sheetOpen}
        userId={userId}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
      />
    </div>
  );
}
