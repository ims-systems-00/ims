import { useEffect, useState } from "react";
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
import { useDeleteFunctionalUnitMutation } from "../hooks/use-functional-units";

type DeleteFunctionalUnitDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: string;
  unitName: string;
  memberCount: number;
  onDeleted?: () => void;
};

/**
 * Super Admin typed-confirm delete for a functional unit.
 * Soft-deletes the unit, cascades members, and reclaims a group licence.
 */
export function DeleteFunctionalUnitDialog({
  open,
  onOpenChange,
  unitId,
  unitName,
  memberCount,
  onDeleted,
}: DeleteFunctionalUnitDialogProps) {
  const [confirmName, setConfirmName] = useState("");
  const deleteMutation = useDeleteFunctionalUnitMutation();

  useEffect(() => {
    if (!open) setConfirmName("");
  }, [open]);

  const nameMatches =
    confirmName.trim().toLowerCase() === unitName.trim().toLowerCase();
  const pending = deleteMutation.isPending;

  async function handleDelete() {
    if (!nameMatches) return;
    try {
      await deleteMutation.mutateAsync(unitId);
      notify.success("Functional unit deleted");
      onOpenChange(false);
      onDeleted?.();
    } catch (error) {
      notify.error(
        isApiClientError(error)
          ? error.message
          : "Could not delete functional unit"
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
              <DialogTitle>Delete functional unit</DialogTitle>
              <DialogDescription>
                Soft-delete <strong>{unitName}</strong>. Members are removed
                from this unit (not from the organisation) and one group
                licence seat is reclaimed.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {memberCount > 0 ? (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
              This unit currently has <strong>{memberCount}</strong> member
              {memberCount === 1 ? "" : "s"}. They will be unassigned from the
              unit when it is deleted.
            </p>
          ) : (
            <p className="text-muted-foreground">This unit has no members.</p>
          )}

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Type <strong>{unitName}</strong> to confirm
            </span>
            <Input
              value={confirmName}
              disabled={pending}
              onChange={(event) => setConfirmName(event.target.value)}
              autoComplete="off"
              placeholder={unitName}
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
            disabled={pending || !nameMatches}
            onClick={() => void handleDelete()}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Delete functional unit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
