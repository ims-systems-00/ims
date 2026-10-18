import { useMemo, useState } from "react";
import { Loader2, PenLine, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { FormField } from "@/shared/components/form-field";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import { useUsersQuery } from "@/modules/users/hooks/use-users";
import { useDocumentSignaturesStore } from "../store/use-document-signatures-store";
import type { DocumentTreeNode } from "../types";
import { OwnerMultiSelect } from "./owner-multi-select";

type RequestSignatureDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: DocumentTreeNode;
};

/**
 * Demo request-signature flow (local persistence).
 * Full e-sign / PDF stamp backend is not in V5 yet.
 */
export function RequestSignatureDialog({
  open,
  onOpenChange,
  node,
}: RequestSignatureDialogProps) {
  const usersQuery = useUsersQuery({ page: 1, pageSize: 100 });
  const allRequests = useDocumentSignaturesStore((state) => state.requests);
  const addRequests = useDocumentSignaturesStore((state) => state.addRequests);
  const markSigned = useDocumentSignaturesStore((state) => state.markSigned);
  const removeRequest = useDocumentSignaturesStore(
    (state) => state.removeRequest
  );
  const requests = useMemo(
    () => allRequests.filter((row) => row.documentNodeId === node.id),
    [allRequests, node.id]
  );

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [externalEmail, setExternalEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const userOptions = useMemo(
    () =>
      (usersQuery.data?.items ?? []).map((row) => ({
        id: row.user.id,
        label: row.user.name?.trim() || row.user.email,
        email: row.user.email,
      })),
    [usersQuery.data]
  );

  const userLabelById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const option of userOptions) map[option.id] = option.label;
    return map;
  }, [userOptions]);

  async function handleSend() {
    const email = externalEmail.trim();
    const invites: Array<{
      inviteeType: "user" | "email";
      userId?: string;
      email?: string;
      displayName: string;
      message?: string;
    }> = [];

    for (const userId of selectedUserIds) {
      invites.push({
        inviteeType: "user",
        userId,
        displayName: userLabelById[userId] ?? userId,
        message,
      });
    }

    if (email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        notify.error("Enter a valid external email");
        return;
      }
      invites.push({
        inviteeType: "email",
        email,
        displayName: email,
        message,
      });
    }

    if (invites.length === 0) {
      notify.error("Select at least one user or enter an external email");
      return;
    }

    setSubmitting(true);
    try {
      // Demo latency so the UI feels like a real invite call.
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      addRequests(node.id, invites);
      notify.success(
        invites.length === 1
          ? "Signature request sent"
          : `${invites.length} signature requests sent`
      );
      setSelectedUserIds([]);
      setExternalEmail("");
      setMessage("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request signature</DialogTitle>
          <DialogDescription>
            Invite internal users or an external email to sign{" "}
            <span className="font-medium text-foreground">{node.name}</span>.
            Demo mode stores requests locally until the full signature backend
            is ready.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormField label="Internal signers">
            <OwnerMultiSelect
              options={userOptions}
              value={selectedUserIds}
              onChange={setSelectedUserIds}
              loading={usersQuery.isLoading}
              max={10}
              allowEmpty
            />
          </FormField>

          <FormField label="External email" htmlFor="sig-email">
            <Input
              id="sig-email"
              type="email"
              placeholder="partner@example.com"
              value={externalEmail}
              onChange={(event) => setExternalEmail(event.target.value)}
            />
          </FormField>

          <FormField label="Message (optional)" htmlFor="sig-message">
            <Textarea
              id="sig-message"
              rows={3}
              placeholder="Please review and sign this document."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </FormField>

          <div className="space-y-2">
            <p className="text-[0.75rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              Requests on this document
            </p>
            {requests.length === 0 ? (
              <p className="rounded-md border border-dashed border-border-subtle px-3 py-4 text-[0.8125rem] text-muted-foreground">
                No signature requests yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {requests.map((row) => (
                  <li
                    key={row.id}
                    className={cn(
                      "flex items-start justify-between gap-3 rounded-md border border-border-subtle px-3 py-2.5"
                    )}
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-medium">
                        {row.displayName}
                      </p>
                      <p className="text-[0.6875rem] text-muted-foreground">
                        {row.inviteeType === "email"
                          ? "External"
                          : "Internal"}{" "}
                        · {new Date(row.requestedAt).toLocaleString()}
                      </p>
                      <StatusBadge
                        tone={row.status === "Signed" ? "success" : "warning"}
                      >
                        {row.status}
                      </StatusBadge>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      {row.status === "Pending" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            markSigned(row.id);
                            notify.success("Marked as signed (demo)");
                          }}
                        >
                          <PenLine className="size-3.5" />
                          Sign
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeRequest(row.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            disabled={submitting}
            onClick={() => void handleSend()}
          >
            {submitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <PenLine className="size-3.5" />
            )}
            Send requests
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
