import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  Check,
  Download,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";
import { SheetPanelTabs } from "@/modules/activities";
import { AppSheet } from "@/shared/components/app-sheet";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import {
  exportTenderQuestionnaire,
  getTenderBidExport,
  readFileAsBase64,
} from "../api/tender";
import {
  useAcceptTenderAnswerMutation,
  useAddTenderDocumentMutation,
  useApproveTenderAnswersMutation,
  useAssessTenderRequirementMutation,
  useAutoAssessTenderMutation,
  useDraftTenderQuestionnaireMutation,
  useMarkTenderSubmittedMutation,
  useSetTenderAnswerMutation,
  useSetTenderPricingMutation,
  useSubmitTenderMutation,
  useTenderGateQuery,
  useTenderQuestionnaireQuery,
  useUpdateTenderQuestionnaireMutation,
} from "../hooks/use-tender";
import {
  formatConfidence,
  formatDate,
  formatMoney,
  formatWhen,
  requirementLevelLabel,
} from "../lib/tender-display";
import {
  TENDER_BID_TAB_LABELS,
  TENDER_BID_TABS,
  TENDER_REQUIREMENT_STATUSES,
  type TenderBidTab,
  type TenderPricingLine,
  type TenderQuestion,
  type TenderRequirementStatus,
} from "../types";
import {
  TenderGateBadge,
  TenderQuestionStatusBadge,
  TenderQuestionnaireStatusBadge,
  TenderRequirementStatusBadge,
} from "./tender-badges";
import { PageLoader } from "@/shared/components/ims-loader";

type TenderQuestionnaireSheetProps = {
  open: boolean;
  questionnaireId?: string | null;
  initialTab?: string;
  onOpenChange: (open: boolean) => void;
  onTabChange?: (tab: TenderBidTab) => void;
  canEdit?: boolean;
};

function parseBidTab(value: string | undefined): TenderBidTab {
  if (value && (TENDER_BID_TABS as readonly string[]).includes(value)) {
    return value as TenderBidTab;
  }
  return "overview";
}

const SHEET_TABS = TENDER_BID_TABS.map((id) => ({
  id,
  label: TENDER_BID_TAB_LABELS[id],
}));

export function TenderQuestionnaireSheet({
  open,
  questionnaireId,
  initialTab = "overview",
  onOpenChange,
  onTabChange,
  canEdit = true,
}: TenderQuestionnaireSheetProps) {
  const [panelTab, setPanelTab] = useState<TenderBidTab>(
    parseBidTab(initialTab)
  );
  const [questionFilter, setQuestionFilter] = useState("");
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null
  );
  const [editAnswer, setEditAnswer] = useState("");
  const [pricingLines, setPricingLines] = useState<TenderPricingLine[]>([]);
  const [suggestRates, setSuggestRates] = useState(true);
  const [forceSubmit, setForceSubmit] = useState(false);
  const [busyExport, setBusyExport] = useState<string | null>(null);

  useEffect(() => {
    if (open) setPanelTab(parseBidTab(initialTab));
  }, [open, questionnaireId, initialTab]);

  const qid = questionnaireId ?? undefined;
  const query = useTenderQuestionnaireQuery(open ? qid : undefined);
  const gateQuery = useTenderGateQuery(open ? qid : undefined);

  const updateMutation = useUpdateTenderQuestionnaireMutation(qid ?? "");
  const addDocMutation = useAddTenderDocumentMutation(qid ?? "");
  const assessMutation = useAssessTenderRequirementMutation(qid ?? "");
  const autoAssessMutation = useAutoAssessTenderMutation(qid ?? "");
  const draftMutation = useDraftTenderQuestionnaireMutation(qid ?? "");
  const setAnswerMutation = useSetTenderAnswerMutation(qid ?? "");
  const acceptMutation = useAcceptTenderAnswerMutation(qid ?? "");
  const approveMutation = useApproveTenderAnswersMutation(qid ?? "");
  const pricingMutation = useSetTenderPricingMutation(qid ?? "");
  const submitMutation = useSubmitTenderMutation(qid ?? "");
  const markSubmittedMutation = useMarkTenderSubmittedMutation(qid ?? "");

  const Q = query.data;

  useEffect(() => {
    if (Q?.pricing?.lines) {
      setPricingLines(Q.pricing.lines.map((l) => ({ ...l })));
    } else {
      setPricingLines([]);
    }
  }, [Q?.id, Q?.pricing]);

  const [meta, setMeta] = useState({
    buyer: "",
    title: "",
    due: "",
    submissionEmail: "",
    notes: "",
  });

  useEffect(() => {
    if (!Q) return;
    setMeta({
      buyer: Q.buyer ?? "",
      title: Q.title ?? "",
      due: Q.due?.slice(0, 10) ?? "",
      submissionEmail: Q.submissionEmail ?? "",
      notes: Q.notes ?? "",
    });
  }, [Q]);

  const filteredQuestions = useMemo(() => {
    const list = Q?.questions ?? [];
    const q = questionFilter.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (item) =>
        item.text.toLowerCase().includes(q) ||
        item.ref.toLowerCase().includes(q) ||
        item.section.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q)
    );
  }, [Q?.questions, questionFilter]);

  function changeTab(next: string) {
    const tab = parseBidTab(next);
    setPanelTab(tab);
    onTabChange?.(tab);
  }

  async function saveMeta() {
    if (!qid) return;
    try {
      await updateMutation.mutateAsync({
        buyer: meta.buyer,
        title: meta.title,
        due: meta.due || null,
        submissionEmail: meta.submissionEmail,
        notes: meta.notes,
      });
      notify.success("Bid details saved");
    } catch (error) {
      notify.fromError(error, "Unable to save");
    }
  }

  async function handleUploadDoc(file: File | null) {
    if (!file || !qid) return;
    try {
      const data = await readFileAsBase64(file);
      await addDocMutation.mutateAsync({ name: file.name, data, draft: false });
      notify.success("Document added");
    } catch (error) {
      notify.fromError(error, "Unable to upload document");
    }
  }

  async function handleExport(
    key: string,
    fn: () => Promise<void>,
    label: string
  ) {
    setBusyExport(key);
    try {
      await fn();
      notify.success(`${label} downloaded`);
    } catch (error) {
      notify.fromError(error, `Unable to export ${label}`);
    } finally {
      setBusyExport(null);
    }
  }

  const title = Q
    ? `${Q.buyer || "Bid"} · ${Q.title || Q.reference || Q.id}`
    : "Bid workspace";

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={Q ? `Status: ${Q.status}` : "Loading questionnaire…"}
      className="sm:max-w-3xl"
    >
      {!qid ? (
        <EmptyState title="No questionnaire selected" />
      ) : query.isLoading ? (
        <PageLoader label="Loading bid…" compact className="py-8" />
      ) : !Q ? (
        <EmptyState
          title="Questionnaire not found"
          description="It may have been deleted."
        />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <TenderQuestionnaireStatusBadge status={Q.status} />
            {gateQuery.data ? (
              <TenderGateBadge verdict={gateQuery.data.verdict} />
            ) : null}
            <span className="text-xs text-muted-foreground">
              {Q.questions?.length ?? 0} questions ·{" "}
              {Q.requirements?.length ?? 0} requirements
            </span>
          </div>

          <SheetPanelTabs
            tabs={SHEET_TABS}
            value={panelTab}
            onChange={changeTab}
            aria-label="Bid workspace tabs"
          />

          {panelTab === "overview" ? (
            <OverviewTab
              Q={Q}
              gate={gateQuery.data}
              meta={meta}
              setMeta={setMeta}
              canEdit={canEdit}
              saving={updateMutation.isPending}
              onSave={() => void saveMeta()}
            />
          ) : null}

          {panelTab === "pack" ? (
            <PackTab
              Q={Q}
              canEdit={canEdit}
              uploading={addDocMutation.isPending}
              onUpload={(f) => void handleUploadDoc(f)}
            />
          ) : null}

          {panelTab === "requirements" ? (
            <RequirementsTab
              Q={Q}
              canEdit={canEdit}
              assessing={
                assessMutation.isPending || autoAssessMutation.isPending
              }
              onAutoAssess={async () => {
                try {
                  await autoAssessMutation.mutateAsync();
                  notify.success("Requirements assessed");
                } catch (error) {
                  notify.fromError(error, "Auto-assess failed");
                }
              }}
              onStatus={async (rid, status) => {
                try {
                  await assessMutation.mutateAsync({
                    rid,
                    body: { status },
                  });
                  notify.success("Requirement updated");
                } catch (error) {
                  notify.fromError(error, "Unable to update requirement");
                }
              }}
            />
          ) : null}

          {panelTab === "questions" ? (
            <QuestionsTab
              questions={filteredQuestions}
              filter={questionFilter}
              onFilter={setQuestionFilter}
              canEdit={canEdit}
              pending={
                draftMutation.isPending ||
                setAnswerMutation.isPending ||
                acceptMutation.isPending ||
                approveMutation.isPending
              }
              editingId={editingQuestionId}
              editAnswer={editAnswer}
              onEditStart={(q) => {
                setEditingQuestionId(q.id);
                setEditAnswer(q.answer ?? "");
              }}
              onEditCancel={() => setEditingQuestionId(null)}
              onEditAnswer={setEditAnswer}
              onDraftAll={async () => {
                try {
                  await draftMutation.mutateAsync({});
                  notify.success("Draft complete");
                } catch (error) {
                  notify.fromError(error, "Draft failed");
                }
              }}
              onAccept={async (id) => {
                try {
                  await acceptMutation.mutateAsync(id);
                  notify.success("Accepted");
                } catch (error) {
                  notify.fromError(error, "Unable to accept");
                }
              }}
              onApprove={async () => {
                try {
                  await approveMutation.mutateAsync({});
                  notify.success("Approved");
                } catch (error) {
                  notify.fromError(error, "Unable to approve");
                }
              }}
              onSaveAnswer={async (id) => {
                try {
                  await setAnswerMutation.mutateAsync({
                    qid: id,
                    body: { answer: editAnswer, status: "edited" },
                  });
                  notify.success("Answer saved");
                  setEditingQuestionId(null);
                } catch (error) {
                  notify.fromError(error, "Unable to save answer");
                }
              }}
            />
          ) : null}

          {panelTab === "pricing" ? (
            <PricingTab
              currency={Q.pricing?.currency ?? "GBP"}
              totals={Q.priceTotals}
              lines={pricingLines}
              setLines={setPricingLines}
              suggestRates={suggestRates}
              setSuggestRates={setSuggestRates}
              canEdit={canEdit}
              pending={pricingMutation.isPending}
              onSave={async () => {
                try {
                  await pricingMutation.mutateAsync({
                    ...Q.pricing,
                    lines: pricingLines,
                    suggest: suggestRates,
                  });
                  notify.success("Pricing saved");
                } catch (error) {
                  notify.fromError(error, "Unable to save pricing");
                }
              }}
            />
          ) : null}

          {panelTab === "submit" ? (
            <SubmitTab
              Q={Q}
              gate={gateQuery.data}
              canEdit={canEdit}
              forceSubmit={forceSubmit}
              setForceSubmit={setForceSubmit}
              busyExport={busyExport}
              submitting={
                submitMutation.isPending || markSubmittedMutation.isPending
              }
              onExport={(key, fn, label) =>
                void handleExport(key, fn, label)
              }
              onEmailSubmit={async () => {
                try {
                  await submitMutation.mutateAsync({ force: forceSubmit });
                  notify.success("Submission email sent");
                } catch (error) {
                  notify.fromError(error, "Unable to submit");
                }
              }}
              onMarkPortal={async () => {
                try {
                  await markSubmittedMutation.mutateAsync({ how: "portal" });
                  notify.success("Marked as submitted via portal");
                } catch (error) {
                  notify.fromError(error, "Unable to mark submitted");
                }
              }}
            />
          ) : null}
        </>
      )}
    </AppSheet>
  );
}

function OverviewTab({
  Q,
  gate,
  meta,
  setMeta,
  canEdit,
  saving,
  onSave,
}: {
  Q: NonNullable<ReturnType<typeof useTenderQuestionnaireQuery>["data"]>;
  gate: ReturnType<typeof useTenderGateQuery>["data"];
  meta: {
    buyer: string;
    title: string;
    due: string;
    submissionEmail: string;
    notes: string;
  };
  setMeta: Dispatch<
    SetStateAction<{
      buyer: string;
      title: string;
      due: string;
      submissionEmail: string;
      notes: string;
    }>
  >;
  canEdit: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <div className="space-y-4">
      {gate ? (
        <section
          className={cn(
            "rounded-xl border p-4",
            gate.verdict === "bid" && "border-emerald-500/30 bg-emerald-500/5",
            gate.verdict === "review" && "border-amber-500/30 bg-amber-500/5",
            gate.verdict === "no-bid-risk" &&
              "border-destructive/30 bg-destructive/5"
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-medium text-muted-foreground">
                Bid / no-bid gate
              </div>
              <div className="mt-1 flex items-center gap-2">
                <TenderGateBadge verdict={gate.verdict} />
                <span className="text-sm font-semibold">
                  Score {Math.round(gate.score)}
                </span>
              </div>
            </div>
          </div>
          {gate.issues.length ? (
            <ul className="mt-3 space-y-1 text-sm">
              {gate.issues.map((issue, i) => (
                <li
                  key={i}
                  className={
                    issue.sev === "bad"
                      ? "text-destructive"
                      : "text-amber-700 dark:text-amber-400"
                  }
                >
                  {issue.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No blocking gate issues.
            </p>
          )}
        </section>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Buyer">
          <Input
            value={meta.buyer}
            disabled={!canEdit || saving}
            onChange={(e) =>
              setMeta((m) => ({ ...m, buyer: e.target.value }))
            }
          />
        </FormField>
        <FormField label="Title">
          <Input
            value={meta.title}
            disabled={!canEdit || saving}
            onChange={(e) =>
              setMeta((m) => ({ ...m, title: e.target.value }))
            }
          />
        </FormField>
        <FormField label="Due">
          <Input
            type="date"
            value={meta.due}
            disabled={!canEdit || saving}
            onChange={(e) => setMeta((m) => ({ ...m, due: e.target.value }))}
          />
        </FormField>
        <FormField label="Submission email">
          <Input
            value={meta.submissionEmail}
            disabled={!canEdit || saving}
            onChange={(e) =>
              setMeta((m) => ({ ...m, submissionEmail: e.target.value }))
            }
          />
        </FormField>
      </div>
      <FormField label="Notes">
        <textarea
          className="ims-field min-h-[80px]"
          value={meta.notes}
          disabled={!canEdit || saving}
          onChange={(e) => setMeta((m) => ({ ...m, notes: e.target.value }))}
        />
      </FormField>
      {canEdit ? (
        <Button type="button" size="sm" disabled={saving} onClick={onSave}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          Save details
        </Button>
      ) : null}

      {(Q.criteria?.length ?? 0) > 0 ? (
        <section className="rounded-xl border border-border-subtle p-4">
          <h3 className="mb-2 text-sm font-semibold">Evaluation criteria</h3>
          <ul className="space-y-1 text-sm">
            {Q.criteria.map((c, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span>{c.name}</span>
                <span className="text-muted-foreground">{c.weight}%</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {Q.dates && Object.keys(Q.dates).length ? (
        <section className="rounded-xl border border-border-subtle p-4">
          <h3 className="mb-2 text-sm font-semibold">Key dates</h3>
          <dl className="grid gap-2 sm:grid-cols-2 text-sm">
            {Object.entries(Q.dates).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd>{formatDate(v)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </div>
  );
}

function PackTab({
  Q,
  canEdit,
  uploading,
  onUpload,
}: {
  Q: NonNullable<ReturnType<typeof useTenderQuestionnaireQuery>["data"]>;
  canEdit: boolean;
  uploading: boolean;
  onUpload: (file: File | null) => void;
}) {
  const docs = Q.documents ?? [];
  return (
    <div className="space-y-4">
      {canEdit ? (
        <FormField label="Upload pack document">
          <input
            type="file"
            className="ims-field text-sm"
            disabled={uploading}
            onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
          />
        </FormField>
      ) : null}
      {docs.length === 0 ? (
        <EmptyState
          title="No pack documents"
          description="Upload tender pack files to extract requirements and questions."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border-subtle">
          <table className="ims-table w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Kind</th>
                <th>Added</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td className="font-medium">
                    {d.name || d.fileName || d.id}
                  </td>
                  <td>{d.kind || "—"}</td>
                  <td className="text-muted-foreground">
                    {formatWhen(d.t)} · {d.by}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {uploading ? (
        <PageLoader label="Uploading…" compact />
      ) : null}
    </div>
  );
}

function RequirementsTab({
  Q,
  canEdit,
  assessing,
  onAutoAssess,
  onStatus,
}: {
  Q: NonNullable<ReturnType<typeof useTenderQuestionnaireQuery>["data"]>;
  canEdit: boolean;
  assessing: boolean;
  onAutoAssess: () => Promise<void>;
  onStatus: (rid: string, status: TenderRequirementStatus) => Promise<void>;
}) {
  const rows = Q.requirements ?? [];
  return (
    <div className="space-y-4">
      {canEdit ? (
        <Button
          type="button"
          size="sm"
          disabled={assessing}
          onClick={() => void onAutoAssess()}
        >
          {assessing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          Auto-assess
        </Button>
      ) : null}
      {rows.length === 0 ? (
        <EmptyState
          title="No requirements"
          description="Add pack documents with specifications to build the compliance matrix."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border-subtle">
          <table className="ims-table w-full">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Requirement</th>
                <th>Level</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap font-mono text-xs">
                    {r.ref || "—"}
                  </td>
                  <td>
                    <div className="text-sm">{r.text}</div>
                    {r.note ? (
                      <div className="ims-text-meta">{r.note}</div>
                    ) : null}
                  </td>
                  <td>{requirementLevelLabel(r.level)}</td>
                  <td>
                    {canEdit ? (
                      <select
                        className="ims-select ims-field-sm w-auto"
                        value={r.status}
                        disabled={assessing}
                        onChange={(e) =>
                          void onStatus(
                            r.id,
                            e.target.value as TenderRequirementStatus
                          )
                        }
                      >
                        {TENDER_REQUIREMENT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <TenderRequirementStatusBadge status={r.status} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function QuestionsTab({
  questions,
  filter,
  onFilter,
  canEdit,
  pending,
  editingId,
  editAnswer,
  onEditStart,
  onEditCancel,
  onEditAnswer,
  onDraftAll,
  onAccept,
  onApprove,
  onSaveAnswer,
}: {
  questions: TenderQuestion[];
  filter: string;
  onFilter: (v: string) => void;
  canEdit: boolean;
  pending: boolean;
  editingId: string | null;
  editAnswer: string;
  onEditStart: (q: TenderQuestion) => void;
  onEditCancel: () => void;
  onEditAnswer: (v: string) => void;
  onDraftAll: () => Promise<void>;
  onAccept: (id: string) => Promise<void>;
  onApprove: () => Promise<void>;
  onSaveAnswer: (id: string) => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input
          className="min-w-[12rem] flex-1"
          placeholder="Filter questions…"
          value={filter}
          onChange={(e) => onFilter(e.target.value)}
        />
        {canEdit ? (
          <>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => void onDraftAll()}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Draft all
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => void onApprove()}
            >
              <Check className="size-4" />
              Approve accepted
            </Button>
          </>
        ) : null}
      </div>

      {questions.length === 0 ? (
        <EmptyState
          title="No questions"
          description="Import a questionnaire or add pack documents."
        />
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <article
              key={q.id}
              className="rounded-xl border border-border-subtle p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">
                    {q.ref || "—"} · {q.section || "General"}
                  </div>
                  <div className="mt-0.5 text-sm font-medium">{q.text}</div>
                </div>
                <TenderQuestionStatusBadge status={q.status} />
              </div>

              <div className="mt-2">
                <div className="mb-1 text-xs text-muted-foreground">
                  Confidence {formatConfidence(q.confidence)}
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${Math.min(100, Math.round((q.confidence || 0) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              {editingId === q.id ? (
                <div className="mt-3 space-y-2">
                  <textarea
                    className="ims-field min-h-[100px]"
                    value={editAnswer}
                    onChange={(e) => onEditAnswer(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={pending}
                      onClick={() => void onSaveAnswer(q.id)}
                    >
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={onEditCancel}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {q.answer || "—"}
                </p>
              )}

              {(q.sources?.length ?? 0) > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {q.sources.slice(0, 6).map((s) => (
                    <span
                      key={`${s.kind}-${s.id}`}
                      className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {s.label || `${s.kind}:${s.id}`}
                    </span>
                  ))}
                </div>
              ) : null}

              {canEdit && editingId !== q.id ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => onEditStart(q)}
                  >
                    Edit answer
                  </Button>
                  {q.status !== "accepted" && q.status !== "approved" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending || !q.answer}
                      onClick={() => void onAccept(q.id)}
                    >
                      Accept
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function PricingTab({
  currency,
  totals,
  lines,
  setLines,
  suggestRates,
  setSuggestRates,
  canEdit,
  pending,
  onSave,
}: {
  currency: string;
  totals?: {
    sub: number;
    net: number;
    vat: number;
    gross: number;
    unpriced: number;
  };
  lines: TenderPricingLine[];
  setLines: Dispatch<SetStateAction<TenderPricingLine[]>>;
  suggestRates: boolean;
  setSuggestRates: (v: boolean) => void;
  canEdit: boolean;
  pending: boolean;
  onSave: () => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      {totals ? (
        <div className="grid gap-2 sm:grid-cols-4">
          {(
            [
              ["Subtotal", totals.sub],
              ["Net", totals.net],
              ["VAT", totals.vat],
              ["Gross", totals.gross],
            ] as const
          ).map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-border-subtle px-3 py-2"
            >
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-sm font-semibold">
                {formatMoney(value, currency)}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {canEdit ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={suggestRates}
            onChange={(e) => setSuggestRates(e.target.checked)}
          />
          Suggest rates from library when saving
        </label>
      ) : null}

      {lines.length === 0 ? (
        <EmptyState
          title="No pricing lines"
          description="Upload a pricing schedule in the pack, or add lines later."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border-subtle">
          <table className="ims-table w-full">
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Rate</th>
                <th>Category</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={line.id || idx}>
                  <td>
                    {canEdit ? (
                      <Input
                        value={line.description}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l, i) =>
                              i === idx
                                ? { ...l, description: e.target.value }
                                : l
                            )
                          )
                        }
                      />
                    ) : (
                      line.description
                    )}
                  </td>
                  <td className="w-20">
                    {canEdit ? (
                      <Input
                        type="number"
                        value={line.qty}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l, i) =>
                              i === idx
                                ? { ...l, qty: Number(e.target.value) || 0 }
                                : l
                            )
                          )
                        }
                      />
                    ) : (
                      line.qty
                    )}
                  </td>
                  <td className="w-24">
                    {canEdit ? (
                      <Input
                        value={line.unit}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l, i) =>
                              i === idx ? { ...l, unit: e.target.value } : l
                            )
                          )
                        }
                      />
                    ) : (
                      line.unit
                    )}
                  </td>
                  <td className="w-28">
                    {canEdit ? (
                      <Input
                        type="number"
                        value={line.rate ?? ""}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l, i) =>
                              i === idx
                                ? {
                                    ...l,
                                    rate:
                                      e.target.value === ""
                                        ? null
                                        : Number(e.target.value),
                                  }
                                : l
                            )
                          )
                        }
                      />
                    ) : (
                      formatMoney(line.rate, currency)
                    )}
                  </td>
                  <td>
                    {canEdit ? (
                      <Input
                        value={line.category}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l, i) =>
                              i === idx
                                ? { ...l, category: e.target.value }
                                : l
                            )
                          )
                        }
                      />
                    ) : (
                      line.category || "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canEdit && lines.length > 0 ? (
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => void onSave()}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Save pricing
        </Button>
      ) : null}
      {totals && totals.unpriced > 0 ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          {totals.unpriced} unpriced line(s)
        </p>
      ) : null}
    </div>
  );
}

function SubmitTab({
  Q,
  gate,
  canEdit,
  forceSubmit,
  setForceSubmit,
  busyExport,
  submitting,
  onExport,
  onEmailSubmit,
  onMarkPortal,
}: {
  Q: NonNullable<ReturnType<typeof useTenderQuestionnaireQuery>["data"]>;
  gate: ReturnType<typeof useTenderGateQuery>["data"];
  canEdit: boolean;
  forceSubmit: boolean;
  setForceSubmit: (v: boolean) => void;
  busyExport: string | null;
  submitting: boolean;
  onExport: (
    key: string,
    fn: () => Promise<void>,
    label: string
  ) => void;
  onEmailSubmit: () => Promise<void>;
  onMarkPortal: () => Promise<void>;
}) {
  const canSubmit = gate?.submit;
  const qid = Q.id;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border-subtle p-4">
        <h3 className="text-sm font-semibold">Readiness</h3>
        {canSubmit?.ok ? (
          <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">
            Ready to submit.
          </p>
        ) : (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-700 dark:text-amber-400">
            {(canSubmit?.errs ?? ["Gate not loaded"]).map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        )}
        {gate?.issues?.length ? (
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {gate.issues.map((issue, i) => (
              <li key={i}>{issue.text}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded-xl border border-border-subtle p-4 space-y-3">
        <h3 className="text-sm font-semibold">Exports</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={Boolean(busyExport)}
            onClick={() =>
              onExport(
                "xlsx",
                () => exportTenderQuestionnaire(qid, "xlsx"),
                "XLSX"
              )
            }
          >
            {busyExport === "xlsx" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            Responses XLSX
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={Boolean(busyExport)}
            onClick={() =>
              onExport(
                "docx",
                () => exportTenderQuestionnaire(qid, "docx"),
                "DOCX"
              )
            }
          >
            {busyExport === "docx" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            DOCX
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={Boolean(busyExport)}
            onClick={() =>
              onExport("bid", () => getTenderBidExport(qid, "bid"), "Bid pack")
            }
          >
            {busyExport === "bid" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            Bid DOCX
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={Boolean(busyExport)}
            onClick={() =>
              onExport(
                "pricing",
                () => getTenderBidExport(qid, "pricing"),
                "Pricing"
              )
            }
          >
            {busyExport === "pricing" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            Pricing XLSX
          </Button>
        </div>
      </section>

      {canEdit ? (
        <section className="rounded-xl border border-border-subtle p-4 space-y-3">
          <h3 className="text-sm font-semibold">Submit</h3>
          <p className="text-sm text-muted-foreground">
            Email the package to{" "}
            <span className="font-medium text-foreground">
              {Q.submissionEmail || "—"}
            </span>
            , or mark as submitted via the buyer portal.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={forceSubmit}
              onChange={(e) => setForceSubmit(e.target.checked)}
            />
            Force email submit (ignore blocking checks)
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={submitting || (!canSubmit?.ok && !forceSubmit)}
              onClick={() => void onEmailSubmit()}
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Email submit
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => void onMarkPortal()}
            >
              Mark portal submitted
            </Button>
          </div>
          {Q.submitted ? (
            <p className="text-xs text-muted-foreground">
              Submitted {formatWhen(Q.submitted)}
              {Q.submittedVia ? ` via ${Q.submittedVia}` : ""}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
