import { useState } from "react";
import { FileText, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  AttachmentRow,
  FileDropZone,
  type FileMetaInfo,
} from "@/modules/files";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField } from "@/shared/components/form-field";
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
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import {
  useDeleteTenderCertificateMutation,
  useDeleteTenderPolicyMutation,
  useTenderCertificatesQuery,
  useTenderPoliciesQuery,
  useTenderSettingsQuery,
  useUpsertTenderCertificateMutation,
  useUpsertTenderPolicyMutation,
} from "../hooks/use-tender";
import { formatDate } from "../lib/tender-display";
import type {
  TenderCertificate,
  TenderFileMeta,
  TenderPolicy,
} from "../types";
import { TenderExpiryBadge } from "./tender-badges";

type TenderEvidencePanelProps = {
  canEdit?: boolean;
};

function toFileMetaInfo(
  meta: TenderFileMeta | null | undefined
): FileMetaInfo | null {
  if (!meta?.Bucket) return null;
  const key = meta.Key || meta.key;
  if (!key) return null;
  return {
    Name: meta.Name || "document",
    Bucket: meta.Bucket,
    Key: key,
    key,
  };
}

function toTenderFileMeta(
  meta: FileMetaInfo,
  size?: number
): TenderFileMeta {
  return {
    Name: meta.Name,
    Bucket: meta.Bucket,
    Key: meta.Key || meta.key,
    key: meta.key || meta.Key,
    Size: size,
  };
}

function encodeFileId(meta: TenderFileMeta): string {
  return JSON.stringify(meta);
}

export function TenderEvidencePanel({
  canEdit = true,
}: TenderEvidencePanelProps) {
  const [tab, setTab] = useState<"certificates" | "policies">("certificates");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [attached, setAttached] = useState<TenderFileMeta | null>(null);
  const [dropKey, setDropKey] = useState(0);

  const certsQuery = useTenderCertificatesQuery();
  const policiesQuery = useTenderPoliciesQuery();
  const settingsQuery = useTenderSettingsQuery();
  const warnDays = settingsQuery.data?.certWarnDays ?? 60;

  const upsertCert = useUpsertTenderCertificateMutation();
  const deleteCert = useDeleteTenderCertificateMutation();
  const upsertPolicy = useUpsertTenderPolicyMutation();
  const deletePolicy = useDeleteTenderPolicyMutation();

  const [certForm, setCertForm] = useState({
    name: "",
    number: "",
    standard: "",
    issued: "",
    expires: "",
    scope: "",
  });
  const [policyForm, setPolicyForm] = useState({
    name: "",
    ref: "",
    version: "",
    reviewed: "",
    nextReview: "",
    owner: "",
    summary: "",
  });

  function resetForms() {
    setCertForm({
      name: "",
      number: "",
      standard: "",
      issued: "",
      expires: "",
      scope: "",
    });
    setPolicyForm({
      name: "",
      ref: "",
      version: "",
      reviewed: "",
      nextReview: "",
      owner: "",
      summary: "",
    });
    setAttached(null);
    setDropKey((k) => k + 1);
  }

  function openCreate() {
    setEditingId(null);
    resetForms();
    setDialogOpen(true);
  }

  function openEditCert(row: TenderCertificate) {
    setEditingId(row.id);
    setCertForm({
      name: row.name,
      number: row.number ?? "",
      standard: row.standard ?? "",
      issued: row.issued?.slice(0, 10) ?? "",
      expires: row.expires?.slice(0, 10) ?? "",
      scope: row.scope ?? "",
    });
    setAttached(row.fileMeta ?? null);
    setDropKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openEditPolicy(row: TenderPolicy) {
    setEditingId(row.id);
    setPolicyForm({
      name: row.name,
      ref: row.ref ?? "",
      version: row.version ?? "",
      reviewed: row.reviewed?.slice(0, 10) ?? "",
      nextReview: row.nextReview?.slice(0, 10) ?? "",
      owner: row.owner ?? "",
      summary: row.summary ?? "",
    });
    setAttached(row.fileMeta ?? null);
    setDropKey((k) => k + 1);
    setDialogOpen(true);
  }

  async function handleSave() {
    try {
      const filePayload = attached
        ? {
            fileId: encodeFileId(attached),
            fileName: attached.Name,
            fileMeta: attached,
          }
        : {
            fileId: null,
            fileName: null,
            fileMeta: null,
          };

      if (tab === "certificates") {
        if (!certForm.name.trim()) {
          notify.error("Name is required");
          return;
        }
        await upsertCert.mutateAsync({
          id: editingId ?? undefined,
          name: certForm.name.trim(),
          number: certForm.number || undefined,
          standard: certForm.standard || undefined,
          issued: certForm.issued || undefined,
          expires: certForm.expires || undefined,
          scope: certForm.scope || undefined,
          ...filePayload,
        });
      } else {
        if (!policyForm.name.trim()) {
          notify.error("Name is required");
          return;
        }
        await upsertPolicy.mutateAsync({
          id: editingId ?? undefined,
          name: policyForm.name.trim(),
          ref: policyForm.ref || undefined,
          version: policyForm.version || undefined,
          reviewed: policyForm.reviewed || undefined,
          nextReview: policyForm.nextReview || undefined,
          owner: policyForm.owner || undefined,
          summary: policyForm.summary || undefined,
          ...filePayload,
        });
      }
      notify.success(editingId ? "Updated" : "Created");
      setDialogOpen(false);
    } catch (error) {
      notify.fromError(error, "Unable to save");
    }
  }

  async function handleDelete(id: string) {
    try {
      if (tab === "certificates") await deleteCert.mutateAsync(id);
      else await deletePolicy.mutateAsync(id);
      notify.success("Deleted");
    } catch (error) {
      notify.fromError(error, "Unable to delete");
    }
  }

  const pending = upsertCert.isPending || upsertPolicy.isPending;
  const loading =
    tab === "certificates" ? certsQuery.isLoading : policiesQuery.isLoading;
  const certs = certsQuery.data ?? [];
  const policies = policiesQuery.data ?? [];
  const attachedInfo = toFileMetaInfo(attached);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Evidence</h2>
          <p className="text-sm text-muted-foreground">
            Certificates and policies attached as tender evidence.
          </p>
        </div>
        {canEdit ? (
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="size-3.5" />
            Add {tab === "certificates" ? "certificate" : "policy"}
          </Button>
        ) : null}
      </div>

      <div
        className="flex flex-wrap gap-1 border-b border-border-subtle"
        role="tablist"
      >
        {(
          [
            ["certificates", "Certificates"],
            ["policies", "Policies"],
          ] as const
        ).map(([id, label]) => {
          const selected = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={cn(
                "relative px-3.5 py-2.5 text-sm font-medium transition-colors",
                selected
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setTab(id)}
            >
              {label}
              {selected ? (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              ) : null}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : tab === "certificates" ? (
        certs.length === 0 ? (
          <EmptyState
            title="No certificates"
            description="Add ISO and other certificates with expiry dates and upload the PDF."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border-subtle bg-card">
            <table className="ims-table w-full">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Standard</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th>File</th>
                  {canEdit ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {certs.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="font-medium">{row.name}</div>
                      <div className="ims-text-meta">{row.number || "—"}</div>
                    </td>
                    <td>{row.standard || "—"}</td>
                    <td>{formatDate(row.expires)}</td>
                    <td>
                      <TenderExpiryBadge
                        expires={row.expires}
                        warnDays={warnDays}
                      />
                    </td>
                    <td>
                      {row.fileMeta || row.fileName ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <FileText className="size-3.5" />
                          {row.fileName || row.fileMeta?.Name || "Attached"}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    {canEdit ? (
                      <td>
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditCert(row)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => void handleDelete(row.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : policies.length === 0 ? (
        <EmptyState
          title="No policies"
          description="Add policies with next review dates and attach the document."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-subtle bg-card">
          <table className="ims-table w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Version</th>
                <th>Next review</th>
                <th>Status</th>
                <th>File</th>
                {canEdit ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {policies.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="font-medium">{row.name}</div>
                    <div className="ims-text-meta">{row.ref || "—"}</div>
                  </td>
                  <td>{row.version || "—"}</td>
                  <td>{formatDate(row.nextReview)}</td>
                  <td>
                    <TenderExpiryBadge
                      expires={row.nextReview}
                      warnDays={warnDays}
                    />
                  </td>
                  <td>
                    {row.fileMeta || row.fileName ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <FileText className="size-3.5" />
                        {row.fileName || row.fileMeta?.Name || "Attached"}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  {canEdit ? (
                    <td>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditPolicy(row)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => void handleDelete(row.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit" : "Add"}{" "}
              {tab === "certificates" ? "certificate" : "policy"}
            </DialogTitle>
            <DialogDescription>
              Evidence records appear in auditor packs and bid attachments.
              Upload the source PDF or Word document.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {tab === "certificates" ? (
              <>
                <FormField label="Name">
                  <Input
                    value={certForm.name}
                    onChange={(e) =>
                      setCertForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </FormField>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Number">
                    <Input
                      value={certForm.number}
                      onChange={(e) =>
                        setCertForm((f) => ({ ...f, number: e.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="Standard">
                    <Input
                      value={certForm.standard}
                      onChange={(e) =>
                        setCertForm((f) => ({
                          ...f,
                          standard: e.target.value,
                        }))
                      }
                    />
                  </FormField>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Issued">
                    <Input
                      type="date"
                      value={certForm.issued}
                      onChange={(e) =>
                        setCertForm((f) => ({ ...f, issued: e.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="Expires">
                    <Input
                      type="date"
                      value={certForm.expires}
                      onChange={(e) =>
                        setCertForm((f) => ({ ...f, expires: e.target.value }))
                      }
                    />
                  </FormField>
                </div>
                <FormField label="Scope">
                  <textarea
                    className="ims-field min-h-[80px]"
                    value={certForm.scope}
                    onChange={(e) =>
                      setCertForm((f) => ({ ...f, scope: e.target.value }))
                    }
                  />
                </FormField>
              </>
            ) : (
              <>
                <FormField label="Name">
                  <Input
                    value={policyForm.name}
                    onChange={(e) =>
                      setPolicyForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </FormField>
                <div className="grid gap-3 sm:grid-cols-3">
                  <FormField label="Ref">
                    <Input
                      value={policyForm.ref}
                      onChange={(e) =>
                        setPolicyForm((f) => ({ ...f, ref: e.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="Version">
                    <Input
                      value={policyForm.version}
                      onChange={(e) =>
                        setPolicyForm((f) => ({
                          ...f,
                          version: e.target.value,
                        }))
                      }
                    />
                  </FormField>
                  <FormField label="Owner">
                    <Input
                      value={policyForm.owner}
                      onChange={(e) =>
                        setPolicyForm((f) => ({ ...f, owner: e.target.value }))
                      }
                    />
                  </FormField>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Reviewed">
                    <Input
                      type="date"
                      value={policyForm.reviewed}
                      onChange={(e) =>
                        setPolicyForm((f) => ({
                          ...f,
                          reviewed: e.target.value,
                        }))
                      }
                    />
                  </FormField>
                  <FormField label="Next review">
                    <Input
                      type="date"
                      value={policyForm.nextReview}
                      onChange={(e) =>
                        setPolicyForm((f) => ({
                          ...f,
                          nextReview: e.target.value,
                        }))
                      }
                    />
                  </FormField>
                </div>
                <FormField label="Summary">
                  <textarea
                    className="ims-field min-h-[80px]"
                    value={policyForm.summary}
                    onChange={(e) =>
                      setPolicyForm((f) => ({
                        ...f,
                        summary: e.target.value,
                      }))
                    }
                  />
                </FormField>
              </>
            )}

            <FormField
              label={
                tab === "certificates"
                  ? "Certificate file"
                  : "Policy document"
              }
            >
              {attachedInfo ? (
                <AttachmentRow
                  file={attachedInfo}
                  sizeBytes={attached?.Size}
                  onDelete={
                    canEdit
                      ? () => {
                          setAttached(null);
                          setDropKey((k) => k + 1);
                        }
                      : undefined
                  }
                />
              ) : canEdit ? (
                <FileDropZone
                  key={dropKey}
                  path="tender"
                  multiple={false}
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                  disabled={pending}
                  onUploaded={(meta, file) => {
                    setAttached(toTenderFileMeta(meta, file.size));
                  }}
                  onRemoved={() => setAttached(null)}
                />
              ) : (
                <p className="text-xs text-muted-foreground">No file attached.</p>
              )}
            </FormField>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => void handleSave()}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
