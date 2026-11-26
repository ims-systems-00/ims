import { useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { useParams } from "react-router-dom";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { uploadViaPublicSelfToken } from "../api/training";
import {
  usePublicSelfAcknowledgeMutation,
  usePublicSelfQuery,
  usePublicSelfUploadMutation,
} from "../hooks/use-training";
import { cellLabel, formatDate, todayIso } from "../lib/training-display";
import { selfUploadFormSchema } from "../schemas";
import { TrainingCellBadge } from "../components/training-badges";
import type { MatrixCell, TrainingCompetency } from "../types";
import { PageLoader } from "@/shared/components/ims-loader";

/**
 * Public self-service training page — `/training/t/:token` (no app chrome).
 */
export function PublicMyTrainingPage() {
  const { token = "" } = useParams<{ token: string }>();
  const selfQuery = usePublicSelfQuery(token || undefined);
  const ackMutation = usePublicSelfAcknowledgeMutation(token);
  const uploadMutation = usePublicSelfUploadMutation(token);

  const [quizCell, setQuizCell] = useState<MatrixCell | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [uploadCid, setUploadCid] = useState("");
  const [uploadDate, setUploadDate] = useState(todayIso());
  const [uploadProvider, setUploadProvider] = useState("");
  const [uploadRef, setUploadRef] = useState("");
  const [uploadNote, setUploadNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const data = selfQuery.data;

  const outstanding = useMemo(() => {
    if (!data) return [];
    return data.cells.filter(
      (c) =>
        c.req.level === "mandatory" &&
        c.st !== "ok" &&
        c.st !== "soon" &&
        c.st !== "na"
    );
  }, [data]);

  const uploadable = useMemo(() => {
    if (!data) return [];
    return data.competencies.filter(
      (c) =>
        !c.archived &&
        c.evidence !== "Acknowledgement" &&
        data.settings.allowSelfUpload
    );
  }, [data]);

  function openAck(cell: MatrixCell) {
    setQuizCell(cell);
    setAnswers((cell.req.comp.quiz || []).map(() => -1));
  }

  async function submitAck() {
    if (!quizCell || !token) return;
    const quiz = quizCell.req.comp.quiz || [];
    if (quiz.length && answers.some((a) => a < 0)) {
      notify.error("Answer all questions");
      return;
    }
    try {
      await ackMutation.mutateAsync({
        cid: quizCell.req.cid,
        answers: quiz.length ? answers : undefined,
      });
      notify.success("Acknowledged");
      setQuizCell(null);
    } catch (error) {
      notify.fromError(error, "Acknowledgement failed");
    }
  }

  async function submitUpload(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    const parsed = selfUploadFormSchema.safeParse({
      cid: uploadCid,
      date: uploadDate,
      provider: uploadProvider,
      ref: uploadRef,
      note: uploadNote,
    });
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }
    if (!file) {
      notify.error("Choose a certificate file");
      return;
    }
    setSubmitting(true);
    try {
      const fileId = await uploadViaPublicSelfToken(token, file);
      await uploadMutation.mutateAsync({
        cid: parsed.data.cid,
        date: parsed.data.date || undefined,
        provider: parsed.data.provider || undefined,
        ref: parsed.data.ref || undefined,
        note: parsed.data.note || undefined,
        fileId,
      });
      notify.success(
        data?.settings.requireVerification
          ? "Uploaded — awaiting verification"
          : "Uploaded"
      );
      setFile(null);
      setUploadRef("");
      setUploadNote("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (error) {
      notify.fromError(error, "Unable to upload");
    } finally {
      setSubmitting(false);
    }
  }

  if (!token || selfQuery.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
        <div className="w-full max-w-lg">
          <EmptyState
            title="Link invalid or expired"
            description="Ask your training lead to issue a new self-service link."
          />
        </div>
      </div>
    );
  }

  if (selfQuery.isLoading || !data) {
    return (
      <PageLoader label="Loading your training…" fullScreen />
    );
  }

  const { person, summary, booked, orgName, competencies } = data;
  const compById = (cid: string): TrainingCompetency | undefined =>
    competencies.find((c) => c.id === cid || c.key === cid);

  return (
    <div className="flex min-h-screen justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-lg space-y-5">
        <div className="rounded-xl border border-border-subtle bg-card p-6 shadow-sm">
          <h1 className="text-lg font-semibold tracking-tight">My training</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {person.name}
            {orgName ? ` · ${orgName}` : ""}
          </p>
          <p className="mt-2 text-sm">
            Mandatory in date:{" "}
            <strong>
              {summary.ok + summary.soon} / {summary.total}
            </strong>
            {summary.compliant ? (
              <span className="ml-2 inline-flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="size-3.5" /> Compliant
              </span>
            ) : null}
          </p>
        </div>

        <section className="rounded-xl border border-border-subtle bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Outstanding</h2>
          {outstanding.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Nothing outstanding right now.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {outstanding.map((cell) => (
                <div
                  key={cell.req.cid}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-subtle px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {cell.req.comp.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <TrainingCellBadge state={cell.st} />
                      <span className="text-xs text-muted-foreground">
                        {cellLabel(cell.st)}
                      </span>
                    </div>
                  </div>
                  {cell.req.comp.evidence === "Acknowledgement" ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => openAck(cell)}
                    >
                      Acknowledge
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        {booked.length > 0 ? (
          <section className="rounded-xl border border-border-subtle bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Booked sessions</h2>
            <div className="mt-3 space-y-2">
              {booked.map((s) => (
                <div
                  key={s.id}
                  className="rounded-lg border border-border-subtle px-3 py-2 text-sm"
                >
                  <div className="font-medium">
                    {compById(s.cid)?.name ?? s.cid}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(s.date)}
                    {s.time ? ` · ${s.time}` : ""}
                    {s.location ? ` · ${s.location}` : ""}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {data.settings.allowSelfUpload && uploadable.length > 0 ? (
          <section className="rounded-xl border border-border-subtle bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Upload certificate</h2>
            <form className="mt-3 space-y-3" onSubmit={(e) => void submitUpload(e)}>
              <FormField label="Competency">
                <select
                  className="ims-select ims-field"
                  value={uploadCid}
                  onChange={(e) => setUploadCid(e.target.value)}
                >
                  <option value="">Select…</option>
                  {uploadable.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Date">
                <input
                  type="date"
                  className="ims-field"
                  value={uploadDate}
                  onChange={(e) => setUploadDate(e.target.value)}
                />
              </FormField>
              <FormField label="Provider">
                <input
                  className="ims-field"
                  value={uploadProvider}
                  onChange={(e) => setUploadProvider(e.target.value)}
                />
              </FormField>
              <FormField label="Reference">
                <input
                  className="ims-field"
                  value={uploadRef}
                  onChange={(e) => setUploadRef(e.target.value)}
                />
              </FormField>
              <FormField label="File">
                <input
                  ref={fileRef}
                  type="file"
                  className="ims-field"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </FormField>
              <FormField label="Note">
                <input
                  className="ims-field"
                  value={uploadNote}
                  onChange={(e) => setUploadNote(e.target.value)}
                />
              </FormField>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                Upload
              </Button>
            </form>
          </section>
        ) : null}
      </div>

      {quizCell ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md space-y-4 rounded-xl border border-border-subtle bg-card p-5 shadow-lg">
            <h3 className="text-sm font-semibold">
              Acknowledge · {quizCell.req.comp.name}
            </h3>
            {(quizCell.req.comp.quiz || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Confirm you have read and understood this policy.
              </p>
            ) : (
              <div className="space-y-4">
                {(quizCell.req.comp.quiz || []).map((q, qi) => (
                  <div key={qi}>
                    <p className="mb-2 text-sm font-medium">{q.q}</p>
                    <div className="space-y-1">
                      {q.opts.map((opt, oi) => (
                        <label
                          key={oi}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            type="radio"
                            name={`q-${qi}`}
                            checked={answers[qi] === oi}
                            onChange={() =>
                              setAnswers((prev) => {
                                const next = [...prev];
                                next[qi] = oi;
                                return next;
                              })
                            }
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={ackMutation.isPending}
                onClick={() => void submitAck()}
              >
                Confirm
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setQuizCell(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
