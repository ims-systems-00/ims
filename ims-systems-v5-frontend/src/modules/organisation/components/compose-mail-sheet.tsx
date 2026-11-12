import { useMemo, useRef, useState } from "react";
import { Loader2, Mail, Paperclip, Trash2 } from "lucide-react";
import { AppSheet } from "@/shared/components/app-sheet";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import { useUsersQuery } from "@/modules/users/hooks/use-users";
import { useComposeOrganisationMailMutation } from "../hooks/use-organisations";
import type { ComposeOrganisationMailAttachment } from "../types";

type ComposeMailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type StagedAttachment = ComposeOrganisationMailAttachment & {
  id: string;
  sizeBytes: number;
};

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64 = result.includes(",") ? result.split(",")[1] ?? "" : result;
      if (!base64) {
        reject(new Error(`Unable to read ${file.name}`));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/**
 * Compose Mail drawer — send an email to selected organisation members.
 */
export function ComposeMailSheet({
  open,
  onOpenChange,
}: ComposeMailSheetProps) {
  const mutation = useComposeOrganisationMailMutation();
  const membersQuery = useUsersQuery({ page: 1, pageSize: 100 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<StagedAttachment[]>([]);
  const [attaching, setAttaching] = useState(false);

  const memberOptions = useMemo(() => {
    const items = membersQuery.data?.items ?? [];
    return items
      .map((row) => ({
        id: row.user.id,
        label: row.user.name || row.user.email,
        email: row.user.email,
      }))
      .filter((row) => Boolean(row.email?.trim()))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [membersQuery.data?.items]);

  function reset() {
    setRecipientIds([]);
    setSubject("");
    setBody("");
    setAttachments([]);
    setAttaching(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function toggleRecipient(userId: string) {
    setRecipientIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    );
  }

  function selectAllRecipients() {
    setRecipientIds(memberOptions.map((member) => member.id));
  }

  function clearRecipients() {
    setRecipientIds([]);
  }

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const remaining = MAX_ATTACHMENTS - attachments.length;
    if (remaining <= 0) {
      notify.error(`You can attach up to ${MAX_ATTACHMENTS} files`);
      return;
    }

    const files = Array.from(fileList).slice(0, remaining);
    setAttaching(true);
    try {
      const next: StagedAttachment[] = [];
      for (const file of files) {
        if (file.size > MAX_ATTACHMENT_BYTES) {
          notify.error(`${file.name} exceeds the 5 MB limit`);
          continue;
        }
        const contentBase64 = await readFileAsBase64(file);
        next.push({
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
          filename: file.name,
          contentBase64,
          type: file.type || undefined,
          sizeBytes: file.size,
        });
      }
      if (next.length > 0) {
        setAttachments((current) => [...current, ...next].slice(0, MAX_ATTACHMENTS));
      }
    } catch (error) {
      notify.fromError(error, "Unable to attach files");
    } finally {
      setAttaching(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit() {
    if (recipientIds.length === 0) {
      notify.error("Select at least one recipient");
      return;
    }
    if (!subject.trim()) {
      notify.error("Subject is required");
      return;
    }
    if (!body.trim()) {
      notify.error("Email body is required");
      return;
    }

    try {
      const result = await mutation.mutateAsync({
        subject: subject.trim(),
        body: body.trim(),
        recipientUserIds: recipientIds,
        attachments: attachments.map(({ filename, contentBase64, type }) => ({
          filename,
          contentBase64,
          type,
        })),
      });
      notify.success(
        result.emailed
          ? `Email sent to ${result.recipientCount} recipient${result.recipientCount === 1 ? "" : "s"}`
          : `Accepted for ${result.recipientCount} recipient${result.recipientCount === 1 ? "" : "s"} (email delivery is disabled in this environment)`
      );
      reset();
      onOpenChange(false);
    } catch (error) {
      notify.fromError(error, "Unable to send email");
    }
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title="Compose mail"
      description="Send an email to selected members of this organisation."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={mutation.isPending || attaching}
            onClick={() => void handleSubmit()}
          >
            {mutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Mail className="size-3.5" />
            )}
            Send
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Recipients" htmlFor="compose-recipients">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={membersQuery.isLoading || memberOptions.length === 0}
              onClick={selectAllRecipients}
            >
              Select all
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={recipientIds.length === 0}
              onClick={clearRecipients}
            >
              Clear
            </Button>
            <span className="text-[0.75rem] text-muted-foreground">
              {recipientIds.length} selected
            </span>
          </div>

          {membersQuery.isLoading ? (
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Loading members…
            </div>
          ) : memberOptions.length === 0 ? (
            <p className="rounded-md border border-dashed border-border-subtle px-3 py-3 text-[0.75rem] text-muted-foreground">
              No organisation members with email addresses were found.
            </p>
          ) : (
            <div
              id="compose-recipients"
              className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border-subtle p-2"
            >
              {memberOptions.map((member) => {
                const selected = recipientIds.includes(member.id);
                return (
                  <label
                    key={member.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                      selected
                        ? "bg-primary/10 text-foreground"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="size-3.5 accent-primary"
                      checked={selected}
                      onChange={() => toggleRecipient(member.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {member.label}
                      </span>
                      <span className="block truncate text-[0.6875rem] text-muted-foreground">
                        {member.email}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </FormField>

        <FormField label="Subject" htmlFor="compose-subject" required>
          <Input
            id="compose-subject"
            value={subject}
            maxLength={200}
            placeholder="Email subject"
            onChange={(event) => setSubject(event.target.value)}
          />
        </FormField>

        <FormField label="Message" htmlFor="compose-body" required>
          <Textarea
            id="compose-body"
            rows={10}
            value={body}
            maxLength={20_000}
            placeholder="Write your message…"
            onChange={(event) => setBody(event.target.value)}
          />
        </FormField>

        <FormField label="Attachments">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            onChange={(event) => void handleFilesSelected(event.target.files)}
          />
          <div className="space-y-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={
                attaching ||
                mutation.isPending ||
                attachments.length >= MAX_ATTACHMENTS
              }
              onClick={() => fileInputRef.current?.click()}
            >
              {attaching ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Paperclip className="size-3.5" />
              )}
              Add attachment
            </Button>
            <p className="text-[0.75rem] text-muted-foreground">
              Up to {MAX_ATTACHMENTS} files, 5 MB each.
            </p>
            {attachments.length > 0 ? (
              <ul className="space-y-1.5">
                {attachments.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center gap-2 rounded-md border border-border-subtle px-2.5 py-2 text-[0.8125rem]"
                  >
                    <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{file.filename}</span>
                    <span className="shrink-0 text-[0.6875rem] text-muted-foreground">
                      {formatBytes(file.sizeBytes)}
                    </span>
                    <button
                      type="button"
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Remove ${file.filename}`}
                      onClick={() =>
                        setAttachments((current) =>
                          current.filter((item) => item.id !== file.id)
                        )
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </FormField>
      </div>
    </AppSheet>
  );
}
