import { useEffect, useState } from "react";
import { CheckCircle2, Copy, FileText, Link2, Loader2, Pencil } from "lucide-react";
import { FileDropZone } from "@/modules/files";
import { AppSheet } from "@/shared/components/app-sheet";
import { FormField, FormSection } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { SheetPanelTabs } from "@/modules/activities";
import { notify } from "@/shared/lib/toast";
import {
  useCompetenciesQuery,
  useCreatePersonMutation,
  useCreateRecordMutation,
  useIssueSelfTokenMutation,
  useMarkLeaverMutation,
  usePersonQuery,
  useRecordsQuery,
  useRolesQuery,
  useTrainingSettingsQuery,
  useUpdatePersonMutation,
  useVerifyRecordMutation,
} from "../hooks/use-training";
import {
  encodeTrainingFileId,
  openTrainingEvidence,
} from "../lib/file-id";
import { formatWhen, todayIso } from "../lib/training-display";
import { qrDataUrl } from "../lib/qr";
import { personFormSchema } from "../schemas";
import {
  TRAINING_PERSON_STATUSES,
  type CreatePersonInput,
  type UpdatePersonInput,
} from "../types";
import { TrainingPersonStatusBadge } from "./training-badges";

export type TrainingPersonSheetMode = "create" | "view" | "edit";

type TrainingPersonSheetProps = {
  open: boolean;
  mode: TrainingPersonSheetMode;
  personId?: string | null;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: TrainingPersonSheetMode) => void;
  canCreate?: boolean;
};

const TABS = [
  { id: "details", label: "Details" },
  { id: "records", label: "Records" },
  { id: "self", label: "Self-service" },
  { id: "history", label: "History" },
];

export function TrainingPersonSheet({
  open,
  mode,
  personId,
  onOpenChange,
  onModeChange,
  canCreate = true,
}: TrainingPersonSheetProps) {
  const [tab, setTab] = useState("details");
  const [name, setName] = useState("");
  const [site, setSite] = useState("");
  const [manager, setManager] = useState("");
  const [start, setStart] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<(typeof TRAINING_PERSON_STATUSES)[number]>(
    "Active"
  );
  const [roles, setRoles] = useState<string[]>([]);
  const [company, setCompany] = useState("");
  const [selfUrl, setSelfUrl] = useState("");
  const [qr, setQr] = useState("");
  const [recCid, setRecCid] = useState("");
  const [recDate, setRecDate] = useState(todayIso());
  const [recResult, setRecResult] = useState<
    "Pass" | "Pass with observations" | "Fail"
  >("Pass");
  const [recProvider, setRecProvider] = useState("");
  const [recRef, setRecRef] = useState("");
  const [recFileId, setRecFileId] = useState<string | null>(null);
  const [recDropKey, setRecDropKey] = useState(0);

  const personQuery = usePersonQuery(
    mode === "create" ? undefined : (personId ?? undefined)
  );
  const rolesQuery = useRolesQuery();
  const compsQuery = useCompetenciesQuery();
  const settingsQuery = useTrainingSettingsQuery();
  const recordsQuery = useRecordsQuery(
    mode === "create" ? undefined : (personId ?? undefined)
  );
  const createMutation = useCreatePersonMutation();
  const updateMutation = useUpdatePersonMutation(personId ?? "");
  const leaverMutation = useMarkLeaverMutation();
  const selfTokenMutation = useIssueSelfTokenMutation();
  const createRecordMutation = useCreateRecordMutation();
  const verifyRecordMutation = useVerifyRecordMutation();

  const person = personQuery.data;
  const allRoles = rolesQuery.data ?? [];
  const comps = (compsQuery.data ?? []).filter((c) => !c.archived);
  const sites = settingsQuery.data?.sites ?? [];
  const records = recordsQuery.data ?? [];

  useEffect(() => {
    if (open) setTab("details");
  }, [open, personId]);

  useEffect(() => {
    if (mode === "create") {
      setName("");
      setSite(sites[0] ?? "");
      setManager("");
      setStart(todayIso());
      setEmail("");
      setStatus("Active");
      setRoles([]);
      setCompany("");
      return;
    }
    if (!person) return;
    setName(person.name);
    setSite(person.site);
    setManager(person.manager ?? "");
    setStart(person.start ?? "");
    setEmail(person.email ?? "");
    setStatus(person.status);
    setRoles(person.roles ?? []);
    setCompany(person.company ?? "");
  }, [person, mode, sites]);

  const pending =
    createMutation.isPending ||
    updateMutation.isPending ||
    leaverMutation.isPending;

  function buildBody(): CreatePersonInput | UpdatePersonInput | null {
    const parsed = personFormSchema.safeParse({
      name,
      site,
      manager,
      start,
      email,
      status,
      roles,
      company,
    });
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message ?? "Invalid form");
      return null;
    }
    return {
      name: parsed.data.name,
      site: parsed.data.site,
      manager: parsed.data.manager || undefined,
      start: parsed.data.start || undefined,
      email: parsed.data.email || undefined,
      status: parsed.data.status,
      roles: parsed.data.roles,
      company: parsed.data.company || undefined,
    };
  }

  async function handleSave() {
    const body = buildBody();
    if (!body) return;
    try {
      if (mode === "create") {
        await createMutation.mutateAsync(body as CreatePersonInput);
        notify.success("Person added");
        onOpenChange(false);
      } else {
        await updateMutation.mutateAsync(body);
        notify.success("Person updated");
        onModeChange("view");
      }
    } catch (error) {
      notify.fromError(error, "Unable to save person");
    }
  }

  async function handleLeaver() {
    if (!personId) return;
    if (!window.confirm("Mark this person as a leaver?")) return;
    try {
      await leaverMutation.mutateAsync({ id: personId, date: todayIso() });
      notify.success("Marked as leaver");
      onOpenChange(false);
    } catch (error) {
      notify.fromError(error, "Unable to mark leaver");
    }
  }

  async function handleSelfToken() {
    if (!personId) return;
    try {
      const result = await selfTokenMutation.mutateAsync(personId);
      setSelfUrl(result.url);
      setQr(await qrDataUrl(result.url, 160));
      notify.success(`Self-service link issued (${result.expiresInDays} days)`);
    } catch (error) {
      notify.fromError(error, "Unable to issue link");
    }
  }

  async function copySelfUrl() {
    if (!selfUrl) return;
    try {
      await navigator.clipboard.writeText(selfUrl);
      notify.success("Link copied");
    } catch {
      notify.error("Unable to copy");
    }
  }

  async function handleRecord() {
    if (!personId || !recCid) {
      notify.error("Choose a competency");
      return;
    }
    const course = comps.find((c) => c.id === recCid);
    if (
      course?.evidence === "Certificate" &&
      recResult !== "Fail" &&
      !recRef.trim() &&
      !recFileId
    ) {
      notify.error("Certificate courses need a reference or uploaded file");
      return;
    }
    try {
      await createRecordMutation.mutateAsync({
        personId,
        cid: recCid,
        date: recDate,
        result: recResult,
        provider: recProvider.trim() || undefined,
        ref: recRef.trim() || undefined,
        fileId: recFileId,
      });
      notify.success("Record saved");
      setRecCid("");
      setRecProvider("");
      setRecRef("");
      setRecFileId(null);
      setRecDropKey((k) => k + 1);
    } catch (error) {
      notify.fromError(error, "Unable to save record");
    }
  }

  async function handleVerify(recordId: string) {
    try {
      await verifyRecordMutation.mutateAsync(recordId);
      notify.success("Certificate verified");
    } catch (error) {
      notify.fromError(error, "Unable to verify record");
    }
  }

  function toggleRole(id: string) {
    setRoles((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  }

  const title =
    mode === "create"
      ? "Add person"
      : person?.name ?? "Person";

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={
        mode === "create"
          ? "Add someone to the training matrix."
          : person?.email || undefined
      }
      className="sm:max-w-xl"
    >
      {mode !== "create" && personQuery.isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-4">
          {mode !== "create" && person ? (
            <div className="flex flex-wrap items-center gap-2">
              <TrainingPersonStatusBadge status={person.status} />
              {canCreate && mode === "view" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onModeChange("edit")}
                >
                  <Pencil className="size-3.5" /> Edit
                </Button>
              ) : null}
              {canCreate && person.status !== "Leaver" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => void handleLeaver()}
                >
                  Mark leaver
                </Button>
              ) : null}
            </div>
          ) : null}

          {mode !== "create" ? (
            <SheetPanelTabs tabs={TABS} value={tab} onChange={setTab} />
          ) : null}

          {mode === "create" || mode === "edit" ? (
            <FormSection title="Person">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Name">
                  <input
                    className="ims-field"
                    value={name}
                    disabled={pending}
                    onChange={(e) => setName(e.target.value)}
                  />
                </FormField>
                <FormField label="Site">
                  {sites.length ? (
                    <select
                      className="ims-select ims-field"
                      value={site}
                      disabled={pending}
                      onChange={(e) => setSite(e.target.value)}
                    >
                      {sites.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="ims-field"
                      value={site}
                      disabled={pending}
                      onChange={(e) => setSite(e.target.value)}
                    />
                  )}
                </FormField>
                <FormField label="Email">
                  <input
                    type="email"
                    className="ims-field"
                    value={email}
                    disabled={pending}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </FormField>
                <FormField label="Manager">
                  <input
                    className="ims-field"
                    value={manager}
                    disabled={pending}
                    onChange={(e) => setManager(e.target.value)}
                  />
                </FormField>
                <FormField label="Start date">
                  <input
                    type="date"
                    className="ims-field"
                    value={start}
                    disabled={pending}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </FormField>
                <FormField label="Status">
                  <select
                    className="ims-select ims-field"
                    value={status}
                    disabled={pending}
                    onChange={(e) =>
                      setStatus(
                        e.target.value as (typeof TRAINING_PERSON_STATUSES)[number]
                      )
                    }
                  >
                    {TRAINING_PERSON_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Company (if external)">
                  <input
                    className="ims-field"
                    value={company}
                    disabled={pending}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </FormField>
              </div>
              <FormField label="Roles">
                <div className="flex flex-wrap gap-2">
                  {allRoles
                    .filter((r) => r.key !== "all")
                    .map((r) => (
                      <label
                        key={r.id}
                        className="flex items-center gap-1.5 rounded-md border border-border-subtle px-2 py-1 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={roles.includes(r.id)}
                          disabled={pending}
                          onChange={() => toggleRole(r.id)}
                        />
                        {r.name}
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
                  {mode === "create" ? "Add person" : "Save"}
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

          {mode === "view" && tab === "details" && person ? (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Site:</span>{" "}
                {person.site || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Manager:</span>{" "}
                {person.manager || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Start:</span>{" "}
                {person.start || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Roles:</span>{" "}
                {(person.roles || [])
                  .map(
                    (id) =>
                      allRoles.find((r) => r.id === id || r.key === id)?.name ??
                      id
                  )
                  .join(", ") || "—"}
              </p>
            </div>
          ) : null}

          {mode !== "create" && tab === "records" ? (
            <div className="space-y-4">
              {canCreate ? (
                <FormSection title="Record result">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="Competency">
                      <select
                        className="ims-select ims-field"
                        value={recCid}
                        onChange={(e) => setRecCid(e.target.value)}
                      >
                        <option value="">Select…</option>
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
                        value={recDate}
                        onChange={(e) => setRecDate(e.target.value)}
                      />
                    </FormField>
                    <FormField label="Result">
                      <select
                        className="ims-select ims-field"
                        value={recResult}
                        onChange={(e) =>
                          setRecResult(
                            e.target.value as
                              | "Pass"
                              | "Pass with observations"
                              | "Fail"
                          )
                        }
                      >
                        <option value="Pass">Pass</option>
                        <option value="Pass with observations">
                          Pass with observations
                        </option>
                        <option value="Fail">Fail</option>
                      </select>
                    </FormField>
                    <FormField label="Provider">
                      <input
                        className="ims-field"
                        value={recProvider}
                        onChange={(e) => setRecProvider(e.target.value)}
                      />
                    </FormField>
                    <FormField label="Reference">
                      <input
                        className="ims-field"
                        value={recRef}
                        onChange={(e) => setRecRef(e.target.value)}
                      />
                    </FormField>
                  </div>
                  <FormField label="Certificate / evidence file">
                    <FileDropZone
                      key={recDropKey}
                      path="training"
                      multiple={false}
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      disabled={createRecordMutation.isPending}
                      onUploaded={(meta) =>
                        setRecFileId(encodeTrainingFileId(meta))
                      }
                      onRemoved={() => setRecFileId(null)}
                    />
                    {recFileId ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        File attached for this result.
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Required for Certificate evidence unless you enter a
                        reference.
                      </p>
                    )}
                  </FormField>
                  <Button
                    type="button"
                    size="sm"
                    disabled={createRecordMutation.isPending}
                    onClick={() => void handleRecord()}
                  >
                    Save record
                  </Button>
                </FormSection>
              ) : null}
              <div className="space-y-2">
                {records.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No records yet.</p>
                ) : (
                  records.map((r) => {
                    const c = comps.find((x) => x.id === r.cid);
                    return (
                      <div
                        key={r.id}
                        className="rounded-lg border border-border-subtle px-3 py-2 text-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="font-medium">
                              {c?.name ?? r.cid} · {r.result}
                              {r.toVerify ? (
                                <span className="ml-2 text-xs text-amber-600">
                                  to verify
                                </span>
                              ) : r.verifiedBy ? (
                                <span className="ml-2 text-xs text-emerald-700">
                                  verified
                                </span>
                              ) : null}
                            </div>
                            <div className="ims-text-meta">
                              {r.date}
                              {r.provider ? ` · ${r.provider}` : ""}
                              {r.ref ? ` · ${r.ref}` : ""}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {r.fileId ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  void openTrainingEvidence(r.fileId)
                                }
                              >
                                <FileText className="size-3.5" /> View file
                              </Button>
                            ) : null}
                            {canCreate && r.toVerify ? (
                              <Button
                                type="button"
                                size="sm"
                                disabled={verifyRecordMutation.isPending}
                                onClick={() => void handleVerify(r.id)}
                              >
                                <CheckCircle2 className="size-3.5" /> Verify
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}

          {mode !== "create" && tab === "self" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Issue a time-limited link so this person can view outstanding
                training, acknowledge policies, and upload certificates.
              </p>
              {canCreate ? (
                <Button
                  type="button"
                  disabled={selfTokenMutation.isPending}
                  onClick={() => void handleSelfToken()}
                >
                  <Link2 className="size-3.5" /> Issue self-service link
                </Button>
              ) : null}
              {selfUrl ? (
                <div className="space-y-3 rounded-lg border border-border-subtle p-3">
                  <div className="break-all font-mono text-xs">{selfUrl}</div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void copySelfUrl()}
                    >
                      <Copy className="size-3.5" /> Copy
                    </Button>
                    {qr ? (
                      <img
                        src={qr}
                        alt="Self-service QR"
                        className="size-32 rounded border border-border-subtle bg-white p-1"
                      />
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {mode !== "create" && tab === "history" ? (
            <div className="space-y-2">
              {(person?.hist ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No history.</p>
              ) : (
                (person?.hist ?? []).map((h, idx) => (
                  <div
                    key={`${h.t}-${idx}`}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm"
                  >
                    <span className="text-xs text-muted-foreground">
                      {formatWhen(h.t)}
                    </span>
                    <span className="font-medium">{h.by}</span>
                    <span className="text-muted-foreground">{h.what}</span>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>
      )}
    </AppSheet>
  );
}
