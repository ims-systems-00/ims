import { useState } from "react";
import { Loader2, Mail, X } from "lucide-react";
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
import { notify } from "@/shared/lib/toast";
import type { DocumentTreeNode } from "../types";
import { useShareDocumentMutation } from "../hooks/use-document-management";

type ShareDocumentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repositoryId: string;
  node: DocumentTreeNode;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Share-by-email (spec §2): each recipient gets a 2-day token link that
 * resolves to a fresh signed view URL on the backend.
 */
export function ShareDocumentDialog({
  open,
  onOpenChange,
  repositoryId,
  node,
}: ShareDocumentDialogProps) {
  const shareMutation = useShareDocumentMutation(repositoryId);
  const [emailInput, setEmailInput] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  function addEmails() {
    const candidates = emailInput
      .split(/[\s,;]+/)
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    if (candidates.length === 0) return;
    const invalid = candidates.filter((value) => !EMAIL_PATTERN.test(value));
    if (invalid.length > 0) {
      notify.error(`Invalid email: ${invalid[0]}`);
      return;
    }
    setEmails((prev) => [...new Set([...prev, ...candidates])]);
    setEmailInput("");
  }

  async function handleShare() {
    const pending = emailInput.trim();
    const all = pending
      ? [...new Set([...emails, pending.toLowerCase()])]
      : emails;
    if (pending && !EMAIL_PATTERN.test(pending)) {
      notify.error("Enter a valid email address");
      return;
    }
    if (all.length === 0) {
      notify.error("Add at least one recipient email");
      return;
    }
    try {
      const result = await shareMutation.mutateAsync({
        nodeId: node.id,
        emails: all,
        message: message.trim() || undefined,
      });
      notify.success(
        `Shared with ${result.sharedWith.length} recipient${
          result.sharedWith.length === 1 ? "" : "s"
        }`
      );
      setEmails([]);
      setEmailInput("");
      setMessage("");
      onOpenChange(false);
    } catch {
      notify.error("Could not share this document. Please try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share document</DialogTitle>
          <DialogDescription>
            Email a view link for{" "}
            <span className="font-medium text-foreground">{node.name}</span>.
            Each link stays valid for 2 days.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormField label="Recipient emails" htmlFor="share-email">
            <div className="flex gap-2">
              <Input
                id="share-email"
                type="email"
                placeholder="person@example.com"
                value={emailInput}
                onChange={(event) => setEmailInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addEmails();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addEmails}>
                Add
              </Button>
            </div>
          </FormField>

          {emails.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {emails.map((email) => (
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
                      setEmails((prev) => prev.filter((e) => e !== email))
                    }
                  >
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <FormField label="Message (optional)" htmlFor="share-message">
            <Textarea
              id="share-message"
              rows={3}
              placeholder="Sharing this document with you for review."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </FormField>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={shareMutation.isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={shareMutation.isPending}
            onClick={() => void handleShare()}
          >
            {shareMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Mail className="size-3.5" />
            )}
            Share
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
