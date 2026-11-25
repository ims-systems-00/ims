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
 * Confirm + email a no-login document upload link to selected suppliers.
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
            ? "Upload link sent"
            : `Upload links sent to ${sent} suppliers`
        );
      } else {
        notify.info(
          `Sent ${sent}, failed ${failed}. Check results for details.`
        );
      }
      onDone?.(results);
      onOpenChange(false);
    } catch (error) {
      notify.fromError(error, "Unable to send upload links");
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Send upload link"
      description={
        label ??
        (count === 1
          ? "Email this supplier a secure link to upload insurance or other documents. They do not need to log in — the uploaded file is saved on their ASL record."
          : `Email ${count} suppliers a secure no-login upload link for insurance or other documents. Uploads are saved on each supplier’s ASL record.`)
      }
      confirmLabel={mutation.isPending ? "Sending…" : "Send link"}
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
        <p className="font-medium">Upload link results</p>
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
