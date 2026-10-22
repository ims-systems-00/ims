import { lazy, Suspense, useMemo, useState } from "react";
import { Loader2, PenLine, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { ErrorBoundary } from "@/shared/components/error-boundary";
import { notify } from "@/shared/lib/toast";
import { useUsersQuery } from "@/modules/users/hooks/use-users";
import type { DocumentTreeNode, SignatureLocation } from "../types";
import {
  useInviteSignaturesMutation,
  usePreservedReviewersQuery,
} from "../hooks/use-document-management";
import { OwnerMultiSelect } from "./owner-multi-select";

// Lazy: pdf.js is heavy and must never block (or break) the main bundle.
const SignaturePlacementEditor = lazy(() =>
  import("./signature-placement-editor").then((module) => ({
    default: module.SignaturePlacementEditor,
  }))
);

type RequestSignatureDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repositoryId: string;
  node: DocumentTreeNode;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Request e-signatures (spec §10): internal users are notified in-app,
 * external invitees receive a tokenised signing link by email. Signature
 * locations are stamped onto the PDF when each invitee signs.
 */
export function RequestSignatureDialog({
  open,
  onOpenChange,
  repositoryId,
  node,
}: RequestSignatureDialogProps) {
  const usersQuery = useUsersQuery({ page: 1, pageSize: 100 });
  const inviteMutation = useInviteSignaturesMutation(repositoryId);
  const preservedQuery = usePreservedReviewersQuery(
    repositoryId,
    node.id,
    open
  );

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [externalEmails, setExternalEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [message, setMessage] = useState("");
  const [locations, setLocations] = useState<SignatureLocation[]>([
    { page: 1, x: 0.1, y: 0.8 },
  ]);

  const userOptions = useMemo(
    () =>
      (usersQuery.data?.items ?? []).map((row) => ({
        id: row.user.id,
        label: row.user.name?.trim() || row.user.email,
        email: row.user.email,
      })),
    [usersQuery.data]
  );

  const userById = useMemo(() => {
    const map = new Map(userOptions.map((option) => [option.id, option]));
    return map;
  }, [userOptions]);

  function addExternalEmail() {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    if (!EMAIL_PATTERN.test(email)) {
      notify.error("Enter a valid external email");
      return;
    }
    setExternalEmails((prev) =>
      prev.includes(email) ? prev : [...prev, email]
    );
    setEmailInput("");
  }

  async function handleSend() {
    const pendingEmail = emailInput.trim().toLowerCase();
    const externals = pendingEmail
      ? [...new Set([...externalEmails, pendingEmail])]
      : externalEmails;
    if (pendingEmail && !EMAIL_PATTERN.test(pendingEmail)) {
      notify.error("Enter a valid external email");
      return;
    }
    if (selectedUserIds.length === 0 && externals.length === 0) {
      notify.error("Select at least one user or add an external email");
      return;
    }
    if (locations.length === 0) {
      notify.error("Add at least one signature location");
      return;
    }

    try {
      const created = await inviteMutation.mutateAsync({
        nodeId: node.id,
        body: {
          internalUsers: selectedUserIds.map((userId) => ({
            userId,
            displayName: userById.get(userId)?.label ?? userId,
            email: userById.get(userId)?.email,
          })),
          externalEmails: externals,
          message: message.trim() || undefined,
          signatureLocations: locations,
        },
      });
      notify.success(
        created.length === 1
          ? "Signature request sent"
          : `${created.length} signature requests sent`
      );
      setSelectedUserIds([]);
      setExternalEmails([]);
      setEmailInput("");
      setMessage("");
      onOpenChange(false);
    } catch {
      notify.error(
        "Could not send signature requests. Only published documents can be sent for signature."
      );
    }
  }

  const preserved = preservedQuery.data ?? [];
  const fileName =
    node.documentData?.storageInfo?.Name ?? node.name ?? "";
  const isPdf = /\.pdf$/i.test(fileName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request signature</DialogTitle>
          <DialogDescription>
            Invite internal users or external emails to sign{" "}
            <span className="font-medium text-foreground">{node.name}</span>.
            External invitees get a secure signing link by email.
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

          <FormField label="External emails" htmlFor="sig-email">
            <div className="flex gap-2">
              <Input
                id="sig-email"
                type="email"
                placeholder="partner@example.com"
                value={emailInput}
                onChange={(event) => setEmailInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addExternalEmail();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addExternalEmail}
              >
                Add
              </Button>
            </div>
          </FormField>

          {externalEmails.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {externalEmails.map((email) => (
                <li
                  key={email}
                  className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs"
                >
                  {email}
                  <button
                    type="button"
                    aria-label={`Remove ${email}`}
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      setExternalEmails((prev) =>
                        prev.filter((e) => e !== email)
                      )
                    }
                  >
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {preserved.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[0.75rem] font-medium text-muted-foreground">
                Previously invited on this document
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {preserved.map((reviewer) => (
                  <li
                    key={`${reviewer.inviteeType}:${reviewer.userId ?? reviewer.email}`}
                    className="rounded-full border border-border-subtle px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    {reviewer.displayName}
                    {reviewer.inviteeType === "email" ? " (external)" : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <FormField label="Message (optional)" htmlFor="sig-message">
            <Textarea
              id="sig-message"
              rows={3}
              placeholder="Please review and sign this document."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </FormField>

          <FormField label="Signature placement">
            {/* Boundary is essential: if the lazy pdf.js chunk ever fails
                to load, only this panel degrades — the dialog (and app)
                must never blank. The default location stays usable. */}
            <ErrorBoundary
              resetKey={`${node.id}:${open}`}
              fallback={
                <div className="rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2.5 text-[0.75rem] text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  The visual placement editor could not be loaded. You can
                  still send this request — the signature will be placed at
                  the default position (first page, lower area).
                </div>
              }
            >
              <Suspense
                fallback={
                  <div className="flex items-center gap-2 rounded-md border border-border-subtle px-3 py-6 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading placement editor…
                  </div>
                }
              >
                <SignaturePlacementEditor
                  value={locations}
                  onChange={setLocations}
                  file={node.documentData?.storageInfo ?? null}
                />
              </Suspense>
            </ErrorBoundary>
          </FormField>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={inviteMutation.isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={inviteMutation.isPending || !isPdf}
            title={
              !isPdf
                ? "Signature requests are currently supported for PDF documents only"
                : undefined
            }
            onClick={() => void handleSend()}
          >
            {inviteMutation.isPending ? (
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
