import { useEffect, useMemo, useState } from "react";
import { Loader2, Mail, Pencil, Trash2 } from "lucide-react";
import { AppSheet } from "@/shared/components/app-sheet";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { FormField, FormSection } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { SheetPanelTabs } from "@/modules/activities";
import {
  FileDropZone,
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
                Notify
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
        <div className="flex-1 overflow-y-auto px-4 py-4">
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
                      await updateDocMutation.mutateAsync({ docId, body: input });
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
        </div>
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
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap gap-2">
        <AslStatusBadge status={supplier.status} />
        <AslCritBadge crit={supplier.crit} />
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="ims-text-meta">Contact</dt>
          <dd>{supplier.contact || "—"}</dd>
        </div>
        <div>
          <dt className="ims-text-meta">Email</dt>
          <dd>{supplier.email || "—"}</dd>
        </div>
        <div>
          <dt className="ims-text-meta">Approved by / on</dt>
          <dd>
            {supplier.appby || "—"} · {supplier.appon || "—"}
          </dd>
        </div>
        <div>
          <dt className="ims-text-meta">Standards</dt>
          <dd>{supplier.stds.join(", ") || "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="ims-text-meta">Scope</dt>
          <dd className="whitespace-pre-wrap">{supplier.scope || "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="ims-text-meta">Requirements (8.4.3)</dt>
          <dd className="whitespace-pre-wrap">{supplier.reqs || "—"}</dd>
        </div>
      </dl>
    </div>
  );
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

  const required = useMemo(() => requiredDocsFor(supplier), [supplier]);
  const gaps = required.filter((req) => {
    const alts = req.split("|");
    return !supplier.docs.some((d) => alts.includes(d.type));
  });

  return (
    <div className="space-y-5">
      {gaps.length ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
          <p className="font-medium">Missing required</p>
          <ul className="mt-1 list-disc pl-4 text-muted-foreground">
            {gaps.map((g) => (
              <li key={g}>{formatReqLabel(g)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-2">
        {supplier.docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents on file.</p>
        ) : (
          supplier.docs.map((doc) => {
            const state = docState(doc, lead);
            return (
              <div
                key={doc.id}
                className="rounded-md border border-border-subtle px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
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
                        onClick={() => void onDelete(doc.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </div>
                {canEdit ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <input
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
            path="supplier"
            multiple={false}
            disabled={pending}
            onUploaded={(meta) => setStaged(meta)}
            onRemoved={() => setStaged(null)}
          />
          <Button
            type="button"
            size="sm"
            disabled={pending || !type}
            onClick={() => {
              void onAdd({
                type,
                exp: exp || null,
                ref,
                storageInfo: staged
                  ? {
                      Name: staged.Name,
                      Key: staged.Key,
                      key: staged.key,
                      Bucket: staged.Bucket,
                      Size: undefined,
                    }
                  : null,
              }).then(() => {
                setExp("");
                setRef("");
                setStaged(null);
              });
            }}
          >
            Save document
          </Button>
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

  return (
    <div className="space-y-5">
      {canEdit && criteria.length ? (
        <FormSection title="New evaluation">
          {criteria.map((c) => (
            <FormField key={c.k} label={`${c.n} (${c.w}%)`}>
              <select
                className="ims-select ims-field w-24"
                value={scores[c.k] ?? 3}
                disabled={pending}
                onChange={(e) =>
                  setScores((prev) => ({
                    ...prev,
                    [c.k]: Number(e.target.value),
                  }))
                }
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </FormField>
          ))}
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
                className="rounded-md border border-border-subtle px-3 py-2 text-sm"
              >
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{e.date}</span>
                  <span>Score {e.score.toFixed(1)}</span>
                </div>
                <p className="ims-text-meta">By {e.by}</p>
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
