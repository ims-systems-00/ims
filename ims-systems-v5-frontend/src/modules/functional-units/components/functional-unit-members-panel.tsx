import { useEffect, useState } from "react";
import { ChevronRight, Loader2, UserMinus, UserPlus, Users } from "lucide-react";
import { AppSheet } from "@/shared/components/app-sheet";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { SearchInput } from "@/shared/components/search-input";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import { UserAvatar } from "@/modules/users/components/user-avatar";
import { UserDetailsSheet } from "@/modules/users/components/user-details-sheet";
import {
  useAddFunctionalUnitMembersMutation,
  useEligibleFunctionalUnitMembersQuery,
  useFunctionalUnitMembersQuery,
  useRemoveFunctionalUnitMemberMutation,
} from "../hooks/use-functional-units";
import type { FunctionalUnit, UnitMember } from "../types";

type FunctionalUnitMembersPanelProps = {
  unit: FunctionalUnit;
};

/**
 * All members + Add members panels for a Functional Unit view sheet.
 * Member selection opens the shared Users → User Details experience.
 */
export function FunctionalUnitMembersPanel({
  unit,
}: FunctionalUnitMembersPanelProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<UnitMember | null>(null);
  const membersQuery = useFunctionalUnitMembersQuery(unit.id);
  const removeMutation = useRemoveFunctionalUnitMemberMutation(unit.id);

  async function confirmRemove() {
    if (!pendingRemove) return;
    try {
      await removeMutation.mutateAsync(pendingRemove.id);
      setPendingRemove(null);
      notify.success("Member removed");
    } catch (error) {
      setPendingRemove(null);
      notify.fromError(error, "Unable to remove member");
    }
  }

  return (
    <div className="ims-section mt-6 border-t border-border-subtle pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="ims-text-section">All members</h3>
        {!unit.isSystemDefault ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setAddOpen(true)}
          >
            <UserPlus />
            Add members
          </Button>
        ) : null}
      </div>

      {membersQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading members…
        </div>
      ) : null}

      {membersQuery.isError ? (
        <p className="ims-alert ims-alert-error" role="alert">
          {isApiClientError(membersQuery.error)
            ? membersQuery.error.message
            : "Unable to load members."}
        </p>
      ) : null}

      {membersQuery.isSuccess && membersQuery.data.items.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="No members assigned"
          description="Add organisation users to this functional unit."
          className="py-8"
        />
      ) : null}

      {membersQuery.isSuccess && membersQuery.data.items.length > 0 ? (
        <ul className="divide-y divide-border-subtle rounded-md border border-border bg-surface">
          {membersQuery.data.items.map((member) => (
            <li key={member.id}>
              <div className="flex items-stretch gap-1 pr-1.5">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  onClick={() => setDetailUserId(member.id)}
                >
                  <UserAvatar
                    name={member.name}
                    imageUrl={member.profileImageUrl}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[0.8125rem] font-medium">
                        {member.name}
                      </span>
                      <StatusBadge
                        tone={
                          member.systemAccessStatus === "Active"
                            ? "success"
                            : "neutral"
                        }
                      >
                        {member.systemAccessStatus}
                      </StatusBadge>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {member.email}
                      {member.role ? ` · ${member.role}` : ""}
                      {member.jobTitle ? ` · ${member.jobTitle}` : ""}
                    </span>
                  </span>
                  <ChevronRight
                    className="size-4 shrink-0 text-muted-foreground/70"
                    aria-hidden
                  />
                  <span className="sr-only">View details</span>
                </button>
                {!unit.isSystemDefault ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="my-1.5 shrink-0 self-center text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={removeMutation.isPending}
                    aria-label={`Remove member ${member.name}`}
                    onClick={() => setPendingRemove(member)}
                  >
                    <UserMinus />
                    Remove member
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <AddMembersSheet
        unit={unit}
        open={addOpen}
        onOpenChange={setAddOpen}
      />

      <UserDetailsSheet
        open={Boolean(detailUserId)}
        userId={detailUserId}
        onOpenChange={(open) => {
          if (!open) setDetailUserId(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingRemove)}
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null);
        }}
        title="Remove member?"
        description={
          pendingRemove
            ? `“${pendingRemove.name}” will be removed from ${unit.name}. Their user account will not be deleted.`
            : ""
        }
        confirmLabel="Remove member"
        pending={removeMutation.isPending}
        onConfirm={confirmRemove}
      />
    </div>
  );
}

type AddMembersSheetProps = {
  unit: FunctionalUnit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function AddMembersSheet({ unit, open, onOpenChange }: AddMembersSheetProps) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const eligibleQuery = useEligibleFunctionalUnitMembersQuery(
    unit.id,
    search,
    open
  );
  const addMutation = useAddFunctionalUnitMembersMutation(unit.id);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 250);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setSearchInput("");
      setSearch("");
    }
  }, [open]);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleConfirm() {
    if (selected.size === 0) return;
    try {
      await addMutation.mutateAsync([...selected]);
      notify.success(
        selected.size === 1 ? "Member added" : "Members added"
      );
      onOpenChange(false);
    } catch (error) {
      notify.fromError(error, "Unable to add members");
    }
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Add members"
      description={`Select organisation users to assign to ${unit.name}.`}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={selected.size === 0 || addMutation.isPending}
            onClick={() => void handleConfirm()}
          >
            {addMutation.isPending ? "Adding…" : "Confirm"}
          </Button>
        </>
      }
    >
      <SearchInput
        placeholder="Search by name or email"
        aria-label="Search eligible users"
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
      />

      {eligibleQuery.isLoading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading eligible users…
        </div>
      ) : null}

      {eligibleQuery.isError ? (
        <p className="mt-4 ims-alert ims-alert-error" role="alert">
          {isApiClientError(eligibleQuery.error)
            ? eligibleQuery.error.message
            : "Unable to load eligible users."}
        </p>
      ) : null}

      {eligibleQuery.isSuccess && eligibleQuery.data.items.length === 0 ? (
        <EmptyState
          className="mt-4 py-8"
          title="No eligible users"
          description="Everyone available is already a member, or none match your search."
        />
      ) : null}

      {eligibleQuery.isSuccess && eligibleQuery.data.items.length > 0 ? (
        <ul className="mt-4 max-h-[24rem] space-y-1.5 overflow-y-auto">
          {eligibleQuery.data.items.map((user) => {
            const checked = selected.has(user.id);
            return (
              <li key={user.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-surface px-3 py-2.5 text-sm transition-colors hover:bg-accent/40 has-[:checked]:border-ring/40 has-[:checked]:bg-accent/30">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-3.5 rounded-sm border-input accent-primary"
                    checked={checked}
                    onChange={() => toggle(user.id)}
                  />
                  <span className="min-w-0">
                    <span className="block text-[0.8125rem] font-medium">
                      {user.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {user.email}
                      {user.jobTitle ? ` · ${user.jobTitle}` : ""}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      ) : null}
    </AppSheet>
  );
}
