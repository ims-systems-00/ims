import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import {
  useRemoveUserFromOrganisationMutation,
  useTransferUserOwnershipMutation,
  useUserOwnershipQuery,
  useUsersQuery,
} from "../hooks/use-users";

type RemoveUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  userRole: string | null | undefined;
  onRemoved?: () => void;
};

/**
 * Cautious Super Admin offboarding flow:
 * ownership check → optional transfer → typed name confirm → remove.
 */
export function RemoveUserDialog({
  open,
  onOpenChange,
  userId,
  userName,
  userRole,
  onRemoved,
}: RemoveUserDialogProps) {
  const [confirmName, setConfirmName] = useState("");
  const [destinationUserId, setDestinationUserId] = useState("");

  const ownershipQuery = useUserOwnershipQuery(userId, open);
  const directoryQuery = useUsersQuery({ page: 1, pageSize: 100 });
  const transferMutation = useTransferUserOwnershipMutation(userId);
  const removeMutation = useRemoveUserFromOrganisationMutation();

  useEffect(() => {
    if (!open) {
      setConfirmName("");
      setDestinationUserId("");
    }
  }, [open]);

  const destinationOptions = useMemo(() => {
    const items = directoryQuery.data?.items ?? [];
    return items.filter(({ user }) => user.id !== userId);
  }, [directoryQuery.data?.items, userId]);

  const nameMatches =
    confirmName.trim().toLowerCase() === userName.trim().toLowerCase();
  const hasOwnedData = ownershipQuery.data?.hasOwnedData === true;
  const pending =
    ownershipQuery.isLoading ||
    transferMutation.isPending ||
    removeMutation.isPending;

  async function handleTransfer() {
    if (!destinationUserId) {
      notify.error("Choose a destination user for ownership transfer");
      return;
    }
    try {
      await transferMutation.mutateAsync(destinationUserId);
      notify.success("Ownership transferred");
      setDestinationUserId("");
    } catch (error) {
      notify.error(
        isApiClientError(error)
          ? error.message
          : "Ownership transfer failed"
      );
    }
  }

  async function handleRemove() {
    if (!nameMatches || hasOwnedData) return;
    try {
      await removeMutation.mutateAsync(userId);
      notify.success("User removed from organisation");
      onOpenChange(false);
      onRemoved?.();
    } catch (error) {
      notify.error(
        isApiClientError(error)
          ? error.message
          : "Could not remove user from organisation"
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent showClose={!pending} className="gap-5 sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
              <AlertTriangle className="size-4" aria-hidden />
            </span>
            <div className="space-y-1">
              <DialogTitle>Remove from organisation</DialogTitle>
              <DialogDescription>
                Permanently remove {userName} from this organisation. Their
                seat is freed and they lose access immediately. This does not
                delete their global account.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <dl className="grid gap-2 rounded-md border border-border-subtle p-3">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{userName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Role</dt>
              <dd className="font-medium">{userRole ?? "—"}</dd>
            </div>
          </dl>

          {ownershipQuery.isLoading ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Checking owned records…
            </p>
          ) : null}

          {ownershipQuery.isError ? (
            <p className="ims-alert ims-alert-error" role="alert">
              {isApiClientError(ownershipQuery.error)
                ? ownershipQuery.error.message
                : "Unable to check ownership."}
            </p>
          ) : null}

          {hasOwnedData ? (
            <div className="space-y-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
              <p>
                This user still owns records in:{" "}
                <strong>
                  {(ownershipQuery.data?.modules ?? []).join(", ") ||
                    "one or more modules"}
                </strong>
                . Transfer ownership before removing them.
              </p>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Transfer to
                </span>
                <select
                  className="ims-select w-full"
                  value={destinationUserId}
                  disabled={pending}
                  onChange={(event) => setDestinationUserId(event.target.value)}
                >
                  <option value="">Select a user…</option>
                  {destinationOptions.map(({ user, membership }) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                      {membership?.role ? ` (${membership.role})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                type="button"
                variant="outline"
                disabled={pending || !destinationUserId}
                onClick={() => void handleTransfer()}
              >
                {transferMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Transfer ownership
              </Button>
            </div>
          ) : ownershipQuery.isSuccess ? (
            <p className="text-muted-foreground">
              No owned records blocking removal.
            </p>
          ) : null}

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Type <strong>{userName}</strong> to confirm
            </span>
            <Input
              value={confirmName}
              disabled={pending || hasOwnedData}
              onChange={(event) => setConfirmName(event.target.value)}
              autoComplete="off"
              placeholder={userName}
            />
          </label>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending || !nameMatches || hasOwnedData}
            onClick={() => void handleRemove()}
          >
            {removeMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Remove from organisation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
