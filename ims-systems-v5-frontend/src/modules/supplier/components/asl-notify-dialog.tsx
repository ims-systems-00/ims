import { Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { useNotifyAslMutation } from "../hooks/use-asl-supplier";
import type { AslNotifyResult } from "../types";

type AslNotifyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ids: string[];
  label?: string;
  onDone?: (results: AslNotifyResult[]) => void;
};

/**
 * Confirm + send ASL chase/notify emails for selected suppliers.
 */
export function AslNotifyDialog({
  open,
  onOpenChange,
  ids,
  label,
  onDone,
}: AslNotifyDialogProps) {
  const mutation = useNotifyAslMutation();
  const count = ids.length;

  async function handleConfirm() {
    if (!count) return;
    try {
      const results = await mutation.mutateAsync(ids);
      const sent = results.filter((r) => r.sent).length;
      const failed = results.length - sent;
      if (failed === 0) {
        notify.success(
          sent === 1
            ? "Notification sent"
            : `Notifications sent to ${sent} suppliers`
        );
      } else {
        notify.info(
          `Sent ${sent}, failed ${failed}. Check results for details.`
        );
      }
      onDone?.(results);
      onOpenChange(false);
    } catch (error) {
      notify.fromError(error, "Unable to send notifications");
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Notify suppliers"
      description={
        label ??
        (count === 1
          ? "Send a document chase / notification email to this supplier?"
          : `Send notification emails to ${count} selected suppliers?`)
      }
      confirmLabel={mutation.isPending ? "Sending…" : "Send"}
      pending={mutation.isPending}
      destructive={false}
      onConfirm={() => {
        void handleConfirm();
      }}
    />
  );
}

type AslNotifyResultsProps = {
  results: AslNotifyResult[];
  onClear?: () => void;
};

export function AslNotifyResults({ results, onClear }: AslNotifyResultsProps) {
  if (!results.length) return null;
  return (
    <div className="space-y-2 rounded-md border border-border-subtle bg-muted/30 p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">Notify results</p>
        {onClear ? (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            Dismiss
          </Button>
        ) : null}
      </div>
      <ul className="space-y-1">
        {results.map((r) => (
          <li key={r.supplierId} className="flex flex-wrap gap-x-2">
            <span className="font-medium">{r.name || r.supplierId}</span>
            <span className={r.sent ? "text-emerald-700" : "text-destructive"}>
              {r.sent ? "Sent" : r.error || "Failed"}
            </span>
            {r.subject ? (
              <span className="text-muted-foreground truncate">{r.subject}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AslNotifyBusy({ pending }: { pending: boolean }) {
  if (!pending) return null;
  return (
    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
      <Loader2 className="size-3.5 animate-spin" /> Sending…
    </span>
  );
}
