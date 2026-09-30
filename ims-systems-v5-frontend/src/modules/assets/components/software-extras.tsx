import { useState } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import {
  useAddSoftwareDocumentMutation,
  useAddSoftwareKeyMutation,
  useRemoveSoftwareDocumentMutation,
  useRemoveSoftwareKeyMutation,
} from "../hooks/use-assets";
import type { SoftwareAsset } from "../types";

type SoftwareExtrasProps = {
  asset: SoftwareAsset;
  editable: boolean;
};

type PendingRemove =
  | { kind: "key"; id: string; label: string }
  | { kind: "document"; id: string; label: string };

export function SoftwareExtras({ asset, editable }: SoftwareExtrasProps) {
  const [keyValue, setKeyValue] = useState("");
  const [fileName, setFileName] = useState("");
  const [storageKey, setStorageKey] = useState("");
  const [pendingRemove, setPendingRemove] = useState<PendingRemove | null>(
    null
  );

  const addKey = useAddSoftwareKeyMutation(asset.id);
  const removeKey = useRemoveSoftwareKeyMutation(asset.id);
  const addDoc = useAddSoftwareDocumentMutation(asset.id);
  const removeDoc = useRemoveSoftwareDocumentMutation(asset.id);
  const pending =
    addKey.isPending ||
    removeKey.isPending ||
    addDoc.isPending ||
    removeDoc.isPending;

  async function handleAddKey() {
    const value = keyValue.trim();
    if (!value) {
      notify.error("Key value is required");
      return;
    }
    try {
      await addKey.mutateAsync(value);
      setKeyValue("");
      notify.success("Licence key added");
    } catch (err) {
      notify.fromError(err, "Unable to add key");
    }
  }

  async function handleAddDocument() {
    const name = fileName.trim();
    if (!name) {
      notify.error("File name is required");
      return;
    }
    try {
      await addDoc.mutateAsync({
        fileName: name,
        storageKey: storageKey.trim() || undefined,
      });
      setFileName("");
      setStorageKey("");
      notify.success("Document added");
    } catch (err) {
      notify.fromError(err, "Unable to add document");
    }
  }

  async function confirmRemove() {
    if (!pendingRemove) return;
    try {
      if (pendingRemove.kind === "key") {
        await removeKey.mutateAsync(pendingRemove.id);
        notify.success("Licence key removed");
      } else {
        await removeDoc.mutateAsync(pendingRemove.id);
        notify.success("Document removed");
      }
      setPendingRemove(null);
    } catch (err) {
      setPendingRemove(null);
      notify.fromError(
        err,
        pendingRemove.kind === "key"
          ? "Unable to remove key"
          : "Unable to remove document"
      );
    }
  }

  return (
    <div className="mt-6 space-y-6 border-t border-border pt-4">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Licence keys</h3>
        {asset.keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No keys added.</p>
        ) : (
          <ul className="space-y-2">
            {asset.keys.map((key) => (
              <li
                key={key.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <code className="truncate font-mono text-xs">{key.value}</code>
                {editable ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="size-8 p-0"
                    aria-label={`Remove key ${key.value}`}
                    disabled={pending}
                    onClick={() =>
                      setPendingRemove({
                        kind: "key",
                        id: key.id,
                        label: key.value,
                      })
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {editable ? (
          <div className="flex gap-2">
            <input
              className="flex h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              placeholder="Add licence key"
              value={keyValue}
              disabled={pending}
              onChange={(e) => setKeyValue(e.target.value)}
            />
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => void handleAddKey()}
            >
              Add key
            </Button>
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Documents</h3>
        {asset.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents attached.</p>
        ) : (
          <ul className="space-y-2">
            {asset.documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{doc.fileName}</p>
                  {doc.storageKey ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {doc.storageKey}
                    </p>
                  ) : null}
                </div>
                {editable ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="size-8 p-0"
                    aria-label={`Remove document ${doc.fileName}`}
                    disabled={pending}
                    onClick={() =>
                      setPendingRemove({
                        kind: "document",
                        id: doc.id,
                        label: doc.fileName,
                      })
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {editable ? (
          <div className="space-y-2">
            <input
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              placeholder="File name"
              value={fileName}
              disabled={pending}
              onChange={(e) => setFileName(e.target.value)}
            />
            <input
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              placeholder="Storage key (optional)"
              value={storageKey}
              disabled={pending}
              onChange={(e) => setStorageKey(e.target.value)}
            />
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => void handleAddDocument()}
            >
              Add document
            </Button>
          </div>
        ) : null}
      </section>

      <ConfirmDialog
        open={Boolean(pendingRemove)}
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null);
        }}
        title={
          pendingRemove?.kind === "key"
            ? "Remove licence key?"
            : "Remove document?"
        }
        description={
          pendingRemove
            ? pendingRemove.kind === "key"
              ? `“${pendingRemove.label}” will be removed from this software asset.`
              : `“${pendingRemove.label}” will be detached from this software asset.`
            : ""
        }
        confirmLabel="Remove"
        pending={removeKey.isPending || removeDoc.isPending}
        onConfirm={confirmRemove}
      />
    </div>
  );
}
