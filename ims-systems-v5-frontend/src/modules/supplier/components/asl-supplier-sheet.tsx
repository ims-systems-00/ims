import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarCheck,
  Download,
  Eye,
  FileText,
  Loader2,
  Mail,
  Pencil,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { AppSheet } from "@/shared/components/app-sheet";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { FormField, FormSection } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { SheetPanelTabs } from "@/modules/activities";
import {
  FileDropZone,
  FilePreviewModal,
  formatFileSize,
  useDownloadFileMutation,
  type FileMetaInfo,
} from "@/modules/files";
import { notify } from "@/shared/lib/toast";
import {
  docState,
  formatReqLabel,
  requiredDocsFor,
} from "../lib/asl-display";
import {
  useAddAslDocumentMutation,
  useAddAslEvaluationMutation,
  useAslSettingsQuery,
  useAslSupplierQuery,
  useCreateAslSupplierMutation,
  useDeleteAslDocumentMutation,
  useUpdateAslDocumentMutation,
  useUpdateAslSupplierMutation,
} from "../hooks/use-asl-supplier";
import type {
  AslFileMeta,
  AslSupplier,
  CreateAslSupplierInput,
  UpdateAslSupplierInput,
} from "../types";
import { ASL_DOC_TYPES } from "../types";
import { AslCritBadge, AslDocStateBadge, AslStatusBadge } from "./asl-badges";
import { AslNotifyDialog } from "./asl-notify-dialog";
import { AslSupplierForm } from "./asl-supplier-form";

export type AslSupplierSheetMode = "create" | "view" | "edit";

type AslSupplierSheetProps = {
  open: boolean;
  mode: AslSupplierSheetMode;
  supplierId?: string | null;
  initialTab?: string;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: AslSupplierSheetMode) => void;
  canCreate?: boolean;
  canDelete?: boolean;
};

const SHEET_TABS = [
  { id: "overview", label: "Overview" },
  { id: "documents", label: "Documents" },
  { id: "evaluations", label: "Evaluations" },
  { id: "comms", label: "Comms" },
  { id: "trail", label: "Trail" },
];

export function AslSupplierSheet({
  open,
  mode,
  supplierId,
  initialTab = "overview",
  onOpenChange,
  onModeChange,
  canCreate = true,
  canDelete = true,
}: AslSupplierSheetProps) {
  const [panelTab, setPanelTab] = useState(initialTab);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState<
    "Suspended" | "Removed" | null
  >(null);

  useEffect(() => {
    if (open) setPanelTab(initialTab || "overview");
  }, [open, supplierId, initialTab]);

  const supplierQuery = useAslSupplierQuery(
    mode === "create" ? undefined : (supplierId ?? undefined)
  );
  const settingsQuery = useAslSettingsQuery();
  const createMutation = useCreateAslSupplierMutation();
  const updateMutation = useUpdateAslSupplierMutation(supplierId ?? "");
  const addDocMutation = useAddAslDocumentMutation(supplierId ?? "");
  const updateDocMutation = useUpdateAslDocumentMutation(supplierId ?? "");
  const deleteDocMutation = useDeleteAslDocumentMutation(supplierId ?? "");
  const addEvalMutation = useAddAslEvaluationMutation(supplierId ?? "");

  const supplier = supplierQuery.data;
  const pending =
    createMutation.isPending ||
    updateMutation.isPending ||
    addDocMutation.isPending ||
    updateDocMutation.isPending ||
    deleteDocMutation.isPending ||
    addEvalMutation.isPending;

  async function handleCreate(
    values: CreateAslSupplierInput | UpdateAslSupplierInput
  ) {
    try {
      await createMutation.mutateAsync(values as CreateAslSupplierInput);
      notify.success("Supplier created");
      onOpenChange(false);
    } catch (error) {
      notify.fromError(error, "Unable to create supplier");
    }
  }

  async function handleUpdate(
    values: CreateAslSupplierInput | UpdateAslSupplierInput
  ) {
    try {
      await updateMutation.mutateAsync(values as UpdateAslSupplierInput);
      notify.success("Supplier updated");
      onModeChange("view");
    } catch (error) {
      notify.fromError(error, "Unable to update supplier");
    }
  }

  async function applyStatus(status: "Suspended" | "Removed") {
    if (!supplierId) return;
    try {
      await updateMutation.mutateAsync({ status });
      notify.success(
        status === "Removed" ? "Supplier removed" : "Supplier suspended"
      );
      setStatusConfirm(null);
      if (status === "Removed") onOpenChange(false);
    } catch (error) {
      notify.fromError(error, "Unable to update status");
    }
  }

  const title =
    mode === "create"
      ? "Add supplier"
      : mode === "edit"
        ? "Edit supplier"
        : (supplier?.name ?? "Supplier");

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={
          mode === "view" && supplier
            ? `${supplier.reference} · ${supplier.cat}`
            : undefined
        }
        className="sm:max-w-xl"
        dataTour="asl.sheet"
        footer={
          mode === "view" && supplier ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setNotifyOpen(true)}
              >
                <Mail className="size-3.5" />
                Send upload link
              </Button>
              {canCreate ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onModeChange("edit")}
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
              ) : null}
              {canCreate && supplier.status !== "Suspended" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusConfirm("Suspended")}
                >
                  Suspend
                </Button>
              ) : null}
              {canDelete && supplier.status !== "Removed" ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setStatusConfirm("Removed")}
                >
                  <Trash2 className="size-3.5" />
                  Remove
                </Button>
              ) : null}
            </div>
          ) : undefined
        }
      >
        {mode === "create" ? (
          <AslSupplierForm
            mode="create"
            pending={pending}
            onSubmit={handleCreate}
            onCancel={() => onOpenChange(false)}
          />
        ) : mode === "edit" && supplier ? (
          <AslSupplierForm
            mode="edit"
            initial={supplier}
            pending={pending}
            onSubmit={handleUpdate}
            onCancel={() => onModeChange("view")}
          />
        ) : supplierQuery.isLoading || !supplier ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <SheetPanelTabs
              tabs={SHEET_TABS}
              value={panelTab}
              onChange={setPanelTab}
            />
            {panelTab === "overview" ? (
              <OverviewTab supplier={supplier} />
            ) : null}
            {panelTab === "documents" ? (
              <DocumentsTab
                supplier={supplier}
                lead={settingsQuery.data?.lead ?? 30}
                pending={pending}
                canEdit={canCreate}
                onAdd={async (input) => {
                  try {
                    await addDocMutation.mutateAsync(input);
                    notify.success("Document saved");
                  } catch (error) {
                    notify.fromError(error, "Unable to save document");
                  }
                }}
                onUpdate={async (docId, input) => {
                  try {
                    await updateDocMutation.mutateAsync({
                      docId,
                      body: input,
                    });
                    notify.success("Document updated");
                  } catch (error) {
                    notify.fromError(error, "Unable to update document");
                  }
                }}
                onDelete={async (docId) => {
                  try {
                    await deleteDocMutation.mutateAsync(docId);
                    notify.success("Document removed");
                  } catch (error) {
                    notify.fromError(error, "Unable to remove document");
                  }
                }}
              />
            ) : null}
            {panelTab === "evaluations" ? (
              <EvaluationsTab
                supplier={supplier}
                criteria={settingsQuery.data?.criteria ?? []}
                pending={pending}
                canEdit={canCreate}
                onSubmit={async (scores, note) => {
                  try {
                    await addEvalMutation.mutateAsync({ scores, note });
                    notify.success("Evaluation recorded");
                  } catch (error) {
                    notify.fromError(error, "Unable to save evaluation");
                  }
                }}
              />
            ) : null}
            {panelTab === "comms" ? <CommsTab supplier={supplier} /> : null}
            {panelTab === "trail" ? <TrailTab supplier={supplier} /> : null}
          </>
        )}
      </AppSheet>

      {supplierId ? (
        <AslNotifyDialog
          open={notifyOpen}
          onOpenChange={setNotifyOpen}
          ids={[supplierId]}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(statusConfirm)}
        onOpenChange={(next) => {
          if (!next) setStatusConfirm(null);
        }}
        title={
          statusConfirm === "Removed" ? "Remove supplier?" : "Suspend supplier?"
        }
        description={
          statusConfirm === "Removed"
            ? "The supplier will be marked Removed and hidden from the live ASL."
            : "The supplier will be Suspended until you reinstate them."
        }
        confirmLabel={statusConfirm === "Removed" ? "Remove" : "Suspend"}
        pending={updateMutation.isPending}
        onConfirm={() => {
          if (statusConfirm) void applyStatus(statusConfirm);
        }}
      />
    </>
  );
}

function OverviewTab({ supplier }: { supplier: AslSupplier }) {
  return (
    <div className="space-y-5 text-sm">
      <div className="overflow-hidden rounded-xl border border-border-subtle bg-gradient-to-br from-muted/50 via-card to-card">
        <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-4">
          <div className="min-w-0 space-y-1">
            <p className="ims-text-meta">Supplier profile</p>
            <p className="truncate text-base font-semibold tracking-tight">
              {supplier.name}
            </p>
            <p className="ims-text-meta">
              {supplier.reference} · {supplier.cat}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <AslStatusBadge status={supplier.status} />
            <AslCritBadge crit={supplier.crit} />
          </div>
        </div>
        <div className="grid gap-px border-t border-border-subtle bg-border-subtle sm:grid-cols-2">
          <OverviewFact
            icon={<UserRound className="size-3.5" />}
            label="Contact"
            value={supplier.contact || "—"}
          />
          <OverviewFact
            icon={<Mail className="size-3.5" />}
            label="Email"
            value={supplier.email || "—"}
          />
          <OverviewFact
            icon={<CalendarCheck className="size-3.5" />}
            label="Approved by / on"
            value={`${supplier.appby || "—"} · ${supplier.appon || "—"}`}
          />
          <OverviewFact
            icon={<CalendarCheck className="size-3.5" />}
            label="Next evaluation due"
            value={supplier.evalDue || "—"}
          />
          <OverviewFact
            icon={<ShieldCheck className="size-3.5" />}
            label="Standards"
            value={supplier.stds.join(", ") || "—"}
          />
        </div>
      </div>

      <OverviewBlock
        icon={<FileText className="size-3.5" />}
        title="Scope"
        body={supplier.scope || "—"}
      />
      <OverviewBlock
        icon={<ShieldCheck className="size-3.5" />}
        title="Requirements (8.4.3)"
        body={supplier.reqs || "—"}
      />
    </div>
  );
}

function OverviewFact({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 bg-card px-4 py-3">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="ims-text-meta">{label}</p>
        <p className="mt-0.5 break-words font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function OverviewBlock({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <section className="rounded-xl border border-border-subtle px-4 py-3.5">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        {icon}
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
          {title}
        </h3>
      </div>
      <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
        {body}
      </p>
    </section>
  );
}

const EVAL_SCORE_MEANINGS: Record<number, string> = {
  1: "Poor — unacceptable / major issues",
  2: "Below expectations — needs improvement",
  3: "Meets requirements — satisfactory",
  4: "Good — consistently exceeds",
  5: "Excellent — outstanding performance",
};

function toAttachmentFile(file: AslFileMeta): FileMetaInfo {
  const key = file.Key || file.key || "";
  return {
    Name: file.Name,
    Key: key,
    key,
    Bucket: file.Bucket,
  };
}

function DocumentsTab({
  supplier,
  lead,
  pending,
  canEdit,
  onAdd,
  onUpdate,
  onDelete,
}: {
  supplier: AslSupplier;
  lead: number;
  pending: boolean;
  canEdit: boolean;
  onAdd: (input: {
    type: string;
    exp?: string | null;
    ref?: string;
    storageInfo?: {
      Name: string;
      Key: string;
      key?: string;
      Bucket: string;
      Size?: number;
    } | null;
  }) => Promise<void>;
  onUpdate: (
    docId: string,
    input: {
      type: string;
      exp?: string | null;
      ref?: string;
      storageInfo?: {
        Name: string;
        Key: string;
        Bucket: string;
        Size?: number;
      } | null;
    }
  ) => Promise<void>;
  onDelete: (docId: string) => Promise<void>;
}) {
  const [type, setType] = useState("Insurance (PL/EL)");
  const [exp, setExp] = useState("");
  const [ref, setRef] = useState("");
  const [staged, setStaged] = useState<FileMetaInfo | null>(null);
  const [dropKey, setDropKey] = useState(0);
  const [previewFile, setPreviewFile] = useState<FileMetaInfo | null>(null);
  const downloadMutation = useDownloadFileMutation();

  const required = useMemo(() => requiredDocsFor(supplier), [supplier]);
  const gaps = required.filter((req) => {
    const alts = req.split("|");
    return !supplier.docs.some((d) => alts.includes(d.type));
  });

  return (
    <div className="space-y-5">
      {gaps.length ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="font-medium">Missing required</p>
          <ul className="mt-1 list-disc pl-4 text-muted-foreground">
            {gaps.map((g) => (
              <li key={g}>{formatReqLabel(g)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-3">
        {supplier.docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents on file.</p>
        ) : (
          supplier.docs.map((doc) => {
            const state = docState(doc, lead);
            const fileMeta =
              doc.file?.Bucket && (doc.file.Key || doc.file.key)
                ? toAttachmentFile(doc.file)
                : null;
            return (
              <div
                key={doc.id}
                className="space-y-2.5 rounded-xl border border-border-subtle px-3 py-3 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{doc.type}</p>
                    <p className="ims-text-meta">
                      Exp {doc.exp || "n/a"}
                      {doc.ref ? ` · ${doc.ref}` : ""}
                      {doc.chased ? ` · chased ${doc.chased}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <AslDocStateBadge state={state} />
                    {canEdit ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        aria-label={`Remove ${doc.type}`}
                        onClick={() => void onDelete(doc.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </div>

                {fileMeta ? (
                  <div className="flex items-center gap-2 rounded-md border border-border-subtle bg-muted/15 px-2.5 py-2">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {fileMeta.Name}
                      </p>
                      {doc.file?.Size ? (
                        <p className="ims-text-meta">
                          {formatFileSize(doc.file.Size)}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewFile(fileMeta)}
                    >
                      <Eye className="size-3.5" />
                      View
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={downloadMutation.isPending}
                      aria-label={`Download ${fileMeta.Name}`}
                      onClick={() =>
                        downloadMutation.mutate(fileMeta, {
                          onError: (error) =>
                            notify.fromError(error, "Document download failed"),
                        })
                      }
                    >
                      <Download className="size-3.5" />
                    </Button>
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed border-border-subtle bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                    No file attached — upload one below using the same document
                    type to attach a file.
                  </p>
                )}

                {canEdit ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="ims-text-meta" htmlFor={`exp-${doc.id}`}>
                      Expiry
                    </label>
                    <input
                      id={`exp-${doc.id}`}
                      className="ims-field ims-field-sm w-36"
                      type="date"
                      defaultValue={doc.exp ?? ""}
                      onBlur={(e) => {
                        const next = e.target.value || null;
                        if (next !== doc.exp) {
                          void onUpdate(doc.id, {
                            type: doc.type,
                            exp: next,
                            ref: doc.ref,
                          });
                        }
                      }}
                    />
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      <FilePreviewModal
        file={previewFile}
        open={Boolean(previewFile)}
        onOpenChange={(next) => {
          if (!next) setPreviewFile(null);
        }}
      />

      {canEdit ? (
        <FormSection title="Add / replace document">
          <FormField label="Type">
            <select
              className="ims-select ims-field"
              value={type}
              disabled={pending}
              onChange={(e) => setType(e.target.value)}
            >
              {ASL_DOC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Expiry">
              <input
                className="ims-field"
                type="date"
                value={exp}
                disabled={pending}
                onChange={(e) => setExp(e.target.value)}
              />
            </FormField>
            <FormField label="Reference">
              <input
                className="ims-field"
                value={ref}
                disabled={pending}
                onChange={(e) => setRef(e.target.value)}
              />
            </FormField>
          </div>
          <FileDropZone
            key={dropKey}
            path="supplier"
            multiple={false}
            emphasized
            disabled={pending}
            onUploaded={(meta) => setStaged(meta)}
            onRemoved={() => setStaged(null)}
          />
          <Button
            type="button"
            size="sm"
            disabled={pending || !type || !staged}
            onClick={() => {
              if (!staged) return;
              void onAdd({
                type,
                exp: exp || null,
                ref,
                storageInfo: {
                  Name: staged.Name,
                  Key: staged.Key,
                  key: staged.key,
                  Bucket: staged.Bucket,
                  Size: undefined,
                },
              }).then(() => {
                setExp("");
                setRef("");
                setStaged(null);
                setDropKey((k) => k + 1);
              });
            }}
          >
            Save document
          </Button>
          {!staged ? (
            <p className="ims-text-meta">
              Upload a file first, then save — you can preview and download it
              from the list above.
            </p>
          ) : null}
        </FormSection>
      ) : null}
    </div>
  );
}

function EvaluationsTab({
  supplier,
  criteria,
  pending,
  canEdit,
  onSubmit,
}: {
  supplier: AslSupplier;
  criteria: Array<{ k: string; n: string; w: number }>;
  pending: boolean;
  canEdit: boolean;
  onSubmit: (scores: Record<string, number>, note: string) => Promise<void>;
}) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");

  useEffect(() => {
    const next: Record<string, number> = {};
    for (const c of criteria) next[c.k] = 3;
    setScores(next);
  }, [criteria, supplier.id]);

  const previewScore = useMemo(() => {
    if (!criteria.length) return 0;
    let weighted = 0;
    let weightSum = 0;
    for (const c of criteria) {
      weighted += (scores[c.k] ?? 3) * c.w;
      weightSum += c.w;
    }
    return weightSum ? weighted / weightSum : 0;
  }, [criteria, scores]);

  return (
    <div className="space-y-5">
      {canEdit && criteria.length ? (
        <FormSection title="New evaluation">
          <div className="rounded-xl border border-border-subtle bg-muted/20 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Score guide (1–5)
            </p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {[1, 2, 3, 4, 5].map((n) => (
                <li key={n} className="flex gap-2">
                  <span className="w-4 shrink-0 font-semibold text-foreground">
                    {n}
                  </span>
                  <span>{EVAL_SCORE_MEANINGS[n]}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            {criteria.map((c) => {
              const value = scores[c.k] ?? 3;
              return (
                <div
                  key={c.k}
                  className="rounded-xl border border-border-subtle px-3 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {c.n}{" "}
                        <span className="font-normal text-muted-foreground">
                          ({c.w}%)
                        </span>
                      </p>
                      <p className="ims-text-meta mt-0.5">
                        {EVAL_SCORE_MEANINGS[value]}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-semibold text-primary">
                      {value}
                    </span>
                  </div>
                  <div className="mt-3">
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={value}
                      disabled={pending}
                      aria-label={`${c.n} score`}
                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary disabled:cursor-not-allowed disabled:opacity-60"
                      onChange={(e) =>
                        setScores((prev) => ({
                          ...prev,
                          [c.k]: Number(e.target.value),
                        }))
                      }
                    />
                    <div className="mt-1 flex justify-between px-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      <span>1 Poor</span>
                      <span>3 Meets</span>
                      <span>5 Excellent</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-card px-3 py-2 text-sm">
            <span className="text-muted-foreground">Weighted preview</span>
            <span className="font-semibold tabular-nums">
              {previewScore.toFixed(1)} / 5
            </span>
          </div>

          <FormField label="Notes">
            <textarea
              className="ims-field min-h-[3.5rem] py-2"
              value={note}
              disabled={pending}
              onChange={(e) => setNote(e.target.value)}
            />
          </FormField>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => void onSubmit(scores, note).then(() => setNote(""))}
          >
            Save evaluation
          </Button>
        </FormSection>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-medium">History</p>
        {supplier.evals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No evaluations yet.</p>
        ) : (
          [...supplier.evals]
            .sort((a, b) => (a.date < b.date ? 1 : -1))
            .map((e) => (
              <div
                key={e.id}
                className="space-y-2 rounded-xl border border-border-subtle px-3 py-3 text-sm"
              >
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{e.date}</span>
                  <span className="font-semibold tabular-nums">
                    Score {e.score.toFixed(1)}
                  </span>
                </div>
                <p className="ims-text-meta">By {e.by}</p>
                {criteria.length ? (
                  <ul className="space-y-1.5">
                    {criteria.map((c) => {
                      const s = e.scores[c.k];
                      if (s == null) return null;
                      return (
                        <li key={c.k} className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                            {c.n}
                          </span>
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${(s / 5) * 100}%` }}
                            />
                          </div>
                          <span className="w-4 text-right text-xs font-medium tabular-nums">
                            {s}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
                {e.note ? <p className="mt-1">{e.note}</p> : null}
              </div>
            ))
        )}
      </div>
    </div>
  );
}

function CommsTab({ supplier }: { supplier: AslSupplier }) {
  if (!supplier.comms.length) {
    return (
      <p className="text-sm text-muted-foreground">No communications logged.</p>
    );
  }
  return (
    <ul className="space-y-2 text-sm">
      {supplier.comms.map((c) => (
        <li
          key={c.id}
          className="rounded-md border border-border-subtle px-3 py-2"
        >
          <div className="flex justify-between gap-2">
            <span className="font-medium">
              {c.date} · {c.type}
            </span>
            <span className="ims-text-meta">{c.outcome}</span>
          </div>
          <p>{c.subject}</p>
          <p className="ims-text-meta">By {c.by}</p>
        </li>
      ))}
    </ul>
  );
}

function TrailTab({ supplier }: { supplier: AslSupplier }) {
  if (!supplier.trail.length) {
    return <p className="text-sm text-muted-foreground">No audit trail yet.</p>;
  }
  return (
    <ul className="space-y-2 text-sm">
      {supplier.trail.map((t, i) => (
        <li
          key={`${t.t}-${i}`}
          className="rounded-md border border-border-subtle px-3 py-2"
        >
          <p className="ims-text-meta">
            {t.t} · {t.by}
          </p>
          <p>{t.what}</p>
        </li>
      ))}
    </ul>
  );
}
