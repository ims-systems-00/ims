import { useEffect, useState } from "react";
import { FileText, Mail, Pencil, Trash2, XCircle } from "lucide-react";
import { FileDropZone } from "@/modules/files";
import { AppSheet } from "@/shared/components/app-sheet";
import { FormField, FormSection } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { SheetPanelTabs } from "@/modules/activities";
import { notify } from "@/shared/lib/toast";
import {
  useAddSessionAttachmentMutation,
  useCancelSessionMutation,
  useCompetenciesQuery,
  useCompleteSessionMutation,
  useCreateSessionMutation,
  useInviteSessionMutation,
  usePeopleQuery,
  useRemoveSessionAttachmentMutation,
  useSessionQuery,
  useTrainingSettingsQuery,
  useUpdateSessionMutation,
} from "../hooks/use-training";
import {
  encodeTrainingFileId,
  openTrainingEvidence,
} from "../lib/file-id";
import { formatDate, todayIso } from "../lib/training-display";
import { sessionFormSchema } from "../schemas";
import type {
  CreateSessionInput,
  TrainingAttachment,
  UpdateSessionInput,
} from "../types";
import { TrainingSessionStatusBadge } from "./training-badges";
import { PageLoader } from "@/shared/components/ims-loader";

export type TrainingSessionSheetMode = "create" | "view" | "edit";

type TrainingSessionSheetProps = {
  open: boolean;
  mode: TrainingSessionSheetMode;
  sessionId?: string | null;
  /** Prefill when booking from the plan. */
  draft?: { cid?: string; attendees?: string[] } | null;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: TrainingSessionSheetMode) => void;
  canCreate?: boolean;
};

const TABS = [
  { id: "details", label: "Details" },
  { id: "files", label: "Files" },
  { id: "rsvp", label: "RSVP" },
  { id: "actions", label: "Actions" },
];

export function TrainingSessionSheet({
  open,
  mode,
  sessionId,
  draft,
  onOpenChange,
  onModeChange,
  canCreate = true,
}: TrainingSessionSheetProps) {
  const [tab, setTab] = useState("details");
  const [cid, setCid] = useState("");
  const [date, setDate] = useState(todayIso());
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState(120);
  const [location, setLocation] = useState("");
  const [trainer, setTrainer] = useState("");
  const [provider, setProvider] = useState("");
  const [cost, setCost] = useState("0");
  const [note, setNote] = useState("");
  const [attendees, setAttendees] = useState<string[]>([]);
  const [cancelReason, setCancelReason] = useState("");
  const [materialsDropKey, setMaterialsDropKey] = useState(0);
  const [outputsDropKey, setOutputsDropKey] = useState(0);

  const sessionQuery = useSessionQuery(
    mode === "create" ? undefined : (sessionId ?? undefined)
  );
  const compsQuery = useCompetenciesQuery();
  const peopleQuery = usePeopleQuery({ status: "Active" });
  const settingsQuery = useTrainingSettingsQuery();
  const createMutation = useCreateSessionMutation();
  const updateMutation = useUpdateSessionMutation(sessionId ?? "");
  const completeMutation = useCompleteSessionMutation();
  const cancelMutation = useCancelSessionMutation();
  const inviteMutation = useInviteSessionMutation();
  const addAttachmentMutation = useAddSessionAttachmentMutation(
    sessionId ?? ""
  );
  const removeAttachmentMutation = useRemoveSessionAttachmentMutation(
    sessionId ?? ""
  );

  const session = sessionQuery.data;
  const comps = (compsQuery.data ?? []).filter((c) => !c.archived);
  const people = peopleQuery.data ?? [];
  const providers = settingsQuery.data?.providers ?? [];

  useEffect(() => {
    if (open) setTab("details");
  }, [open, sessionId]);

  useEffect(() => {
    if (mode === "create") {
      setCid(draft?.cid ?? comps[0]?.id ?? "");
      setDate(todayIso());
      setTime("09:00");
      setDuration(120);
      setLocation("");
      setTrainer("");
      setProvider(providers[0] ?? "");
      setCost("0");
      setNote("");
      setAttendees(draft?.attendees ?? []);
      return;
    }
    if (!session) return;
    setCid(session.cid);
    setDate(session.date);
    setTime(session.time || "09:00");
    setDuration(session.duration || 120);
    setLocation(session.location || "");
    setTrainer(session.trainer || "");
    setProvider(session.provider || "");
    setCost(String(session.cost ?? 0));
    setNote(session.note || "");
    setAttendees(session.attendees || []);
  }, [session, mode, draft, comps, providers]);

  const pending =
    createMutation.isPending ||
    updateMutation.isPending ||
    completeMutation.isPending ||
    cancelMutation.isPending ||
    inviteMutation.isPending ||
    addAttachmentMutation.isPending ||
    removeAttachmentMutation.isPending;

  function buildBody(): CreateSessionInput | UpdateSessionInput | null {
    const parsed = sessionFormSchema.safeParse({
      cid,
      date,
      time,
      duration,
      location,
      trainer,
      provider,
      cost: Number(cost) || 0,
      note,
      attendees,
    });
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message ?? "Invalid form");
      return null;
    }
    return {
      cid: parsed.data.cid,
      date: parsed.data.date,
      time: parsed.data.time || undefined,
      duration: parsed.data.duration,
      location: parsed.data.location || undefined,
      trainer: parsed.data.trainer || undefined,
      provider: parsed.data.provider || undefined,
      cost: parsed.data.cost,
      note: parsed.data.note || undefined,
      attendees: parsed.data.attendees,
    };
  }

  async function handleSave() {
    const body = buildBody();
    if (!body) return;
    try {
      if (mode === "create") {
        await createMutation.mutateAsync(body as CreateSessionInput);
        notify.success("Session planned");
        onOpenChange(false);
      } else {
        await updateMutation.mutateAsync(body);
        notify.success("Session updated");
        onModeChange("view");
      }
    } catch (error) {
      notify.fromError(error, "Unable to save session");
    }
  }

  async function handleInvite() {
    if (!sessionId) return;
    try {
      await inviteMutation.mutateAsync({ id: sessionId });
      notify.success("Invitations sent");
    } catch (error) {
      notify.fromError(error, "Unable to send invites");
    }
  }

  async function handleComplete() {
    if (!sessionId) return;
    if (!window.confirm("Complete this session and write Pass records?")) return;
    try {
      await completeMutation.mutateAsync({ id: sessionId });
      notify.success("Session completed");
      onOpenChange(false);
    } catch (error) {
      notify.fromError(error, "Unable to complete session");
    }
  }

  async function handleCancel() {
    if (!sessionId) return;
    try {
      await cancelMutation.mutateAsync({
        id: sessionId,
        reason: cancelReason.trim() || undefined,
      });
      notify.success("Session cancelled");
      onOpenChange(false);
    } catch (error) {
      notify.fromError(error, "Unable to cancel session");
    }
  }

  async function handleUpload(
    kind: "materials" | "outputs",
    meta: { Name: string; Key: string; key: string; Bucket: string },
    file: File
  ) {
    if (!sessionId) return;
    try {
      await addAttachmentMutation.mutateAsync({
        kind,
        body: {
          name: file.name || meta.Name,
          size: file.size,
          type: file.type || "application/octet-stream",
          fileId: encodeTrainingFileId(meta),
          shared: kind === "materials",
        },
      });
      notify.success(kind === "materials" ? "Material added" : "Output added");
      if (kind === "materials") setMaterialsDropKey((k) => k + 1);
      else setOutputsDropKey((k) => k + 1);
    } catch (error) {
      notify.fromError(error, "Unable to attach file");
    }
  }

  async function handleRemoveAttachment(
    kind: "materials" | "outputs",
    attachmentId: string
  ) {
    if (!sessionId) return;
    if (!window.confirm("Remove this file from the session?")) return;
    try {
      await removeAttachmentMutation.mutateAsync({ kind, attachmentId });
      notify.success("File removed");
    } catch (error) {
      notify.fromError(error, "Unable to remove file");
    }
  }

  function toggleAttendee(id: string) {
    setAttendees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function renderAttachmentList(
    kind: "materials" | "outputs",
    items: TrainingAttachment[]
  ) {
    if (!items.length) {
      return (
        <p className="text-sm text-muted-foreground">
          No {kind === "materials" ? "materials" : "outputs"} yet.
        </p>
      );
    }
    return (
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-subtle px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <div className="truncate font-medium">{item.name}</div>
              <div className="ims-text-meta">
                {item.by ? `${item.by} · ` : ""}
                {item.shared ? "Shared with invitees" : "Internal"}
              </div>
            </div>
            <div className="flex gap-1">
              {item.fileId || item.url ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (item.fileId) void openTrainingEvidence(item.fileId);
                    else if (item.url)
                      window.open(item.url, "_blank", "noopener,noreferrer");
                  }}
                >
                  <FileText className="size-3.5" /> Open
                </Button>
              ) : null}
              {canCreate && session?.status === "Planned" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => void handleRemoveAttachment(kind, item.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const title =
    mode === "create"
      ? "Plan session"
      : comps.find((c) => c.id === session?.cid)?.name ?? "Session";

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={
        session ? `${formatDate(session.date)} · ${session.status}` : undefined
      }
      className="sm:max-w-xl"
    >
      {mode !== "create" && sessionQuery.isLoading ? (
        <PageLoader label="Loading…" compact className="py-8" />
      ) : (
        <div className="space-y-4">
          {mode !== "create" && session ? (
            <div className="flex flex-wrap items-center gap-2">
              <TrainingSessionStatusBadge status={session.status} />
              {canCreate &&
              mode === "view" &&
              session.status === "Planned" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onModeChange("edit")}
                >
                  <Pencil className="size-3.5" /> Edit
                </Button>
              ) : null}
            </div>
          ) : null}

          {mode !== "create" ? (
            <SheetPanelTabs tabs={TABS} value={tab} onChange={setTab} />
          ) : null}

          {mode === "create" || mode === "edit" ? (
            <FormSection title="Session">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Course">
                  <select
                    className="ims-select ims-field"
                    value={cid}
                    disabled={pending}
                    onChange={(e) => setCid(e.target.value)}
                  >
                    {comps.map((c) => (
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
                    value={date}
                    disabled={pending}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </FormField>
                <FormField label="Time">
                  <input
                    type="time"
                    className="ims-field"
                    value={time}
                    disabled={pending}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </FormField>
                <FormField label="Duration (minutes)">
                  <input
                    type="number"
                    className="ims-field"
                    value={duration}
                    disabled={pending}
                    onChange={(e) => setDuration(Number(e.target.value) || 0)}
                  />
                </FormField>
                <FormField label="Location">
                  <input
                    className="ims-field"
                    value={location}
                    disabled={pending}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </FormField>
                <FormField label="Trainer">
                  <input
                    className="ims-field"
                    value={trainer}
                    disabled={pending}
                    onChange={(e) => setTrainer(e.target.value)}
                  />
                </FormField>
                <FormField label="Provider">
                  {providers.length ? (
                    <select
                      className="ims-select ims-field"
                      value={provider}
                      disabled={pending}
                      onChange={(e) => setProvider(e.target.value)}
                    >
                      <option value="">—</option>
                      {providers.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="ims-field"
                      value={provider}
                      disabled={pending}
                      onChange={(e) => setProvider(e.target.value)}
                    />
                  )}
                </FormField>
                <FormField label="Cost">
                  <input
                    type="number"
                    className="ims-field"
                    value={cost}
                    disabled={pending}
                    onChange={(e) => setCost(e.target.value)}
                  />
                </FormField>
              </div>
              <FormField label="Note">
                <textarea
                  className="ims-field min-h-[60px]"
                  value={note}
                  disabled={pending}
                  onChange={(e) => setNote(e.target.value)}
                />
              </FormField>
              <FormField label="Attendees">
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border-subtle p-2">
                  {people.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={attendees.includes(p.id)}
                        disabled={pending}
                        onChange={() => toggleAttendee(p.id)}
                      />
                      {p.name}
                      {p.email ? (
                        <span className="ims-text-meta">{p.email}</span>
                      ) : null}
                    </label>
                  ))}
                </div>
              </FormField>
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() => void handleSave()}
                >
                  {mode === "create" ? "Plan session" : "Save"}
                </Button>
                {mode === "edit" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onModeChange("view")}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </FormSection>
          ) : null}

          {mode === "view" && tab === "details" && session ? (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Date:</span>{" "}
                {formatDate(session.date)}
                {session.time ? ` · ${session.time}` : ""}
              </p>
              <p>
                <span className="text-muted-foreground">Location:</span>{" "}
                {session.location || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Trainer:</span>{" "}
                {session.trainer || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Attendees:</span>{" "}
                {(session.attendees || [])
                  .map(
                    (id) => people.find((p) => p.id === id)?.name ?? id
                  )
                  .join(", ") || "—"}
              </p>
              {session.note ? (
                <p className="text-muted-foreground">{session.note}</p>
              ) : null}
            </div>
          ) : null}

          {mode === "view" && tab === "files" && session ? (
            <div className="space-y-5">
              <FormSection title="Course materials">
                <p className="mb-2 text-xs text-muted-foreground">
                  Shared with invitees (slides, agenda, pre-reads).
                </p>
                {renderAttachmentList("materials", session.materials || [])}
                {canCreate && session.status === "Planned" ? (
                  <div className="mt-3">
                    <FileDropZone
                      key={materialsDropKey}
                      path="training"
                      multiple={false}
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.ppt,.pptx"
                      disabled={pending}
                      onUploaded={(meta, file) =>
                        void handleUpload("materials", meta, file)
                      }
                    />
                  </div>
                ) : null}
              </FormSection>
              <FormSection title="Session outputs">
                <p className="mb-2 text-xs text-muted-foreground">
                  Attendance sheets, certificates or signed registers. The first
                  output with a file is linked when you complete the session.
                </p>
                {renderAttachmentList("outputs", session.outputs || [])}
                {canCreate && session.status === "Planned" ? (
                  <div className="mt-3">
                    <FileDropZone
                      key={outputsDropKey}
                      path="training"
                      multiple={false}
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      disabled={pending}
                      onUploaded={(meta, file) =>
                        void handleUpload("outputs", meta, file)
                      }
                    />
                  </div>
                ) : null}
              </FormSection>
            </div>
          ) : null}

          {mode === "view" && tab === "rsvp" && session ? (
            <div className="space-y-2">
              {(session.attendees || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No attendees.</p>
              ) : (
                (session.attendees || []).map((pid) => {
                  const p = people.find((x) => x.id === pid);
                  const r = session.rsvp?.[pid];
                  return (
                    <div
                      key={pid}
                      className="flex items-center justify-between rounded-lg border border-border-subtle px-3 py-2 text-sm"
                    >
                      <span>{p?.name ?? pid}</span>
                      <span className="text-xs capitalize text-muted-foreground">
                        {r?.status ?? "pending"}
                        {r?.note ? ` · ${r.note}` : ""}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          ) : null}

          {mode === "view" &&
          tab === "actions" &&
          session &&
          canCreate &&
          session.status === "Planned" ? (
            <div className="space-y-4">
              <Button
                type="button"
                disabled={pending}
                onClick={() => void handleInvite()}
              >
                <Mail className="size-3.5" /> Send invitations
              </Button>
              <Button
                type="button"
                disabled={pending}
                onClick={() => void handleComplete()}
              >
                Complete session
              </Button>
              <p className="text-xs text-muted-foreground">
                Completing writes Pass records for attendees. Upload session
                outputs under Files first if you want certificates linked.
              </p>
              <FormField label="Cancel reason">
                <input
                  className="ims-field"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </FormField>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => void handleCancel()}
              >
                <XCircle className="size-3.5" /> Cancel session
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </AppSheet>
  );
}
