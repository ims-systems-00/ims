import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/shared/layout";
import { loadPublicEnv } from "@/shared/lib/env";
import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { notify } from "@/shared/lib/toast";
import {
  permissionAllowed,
  useSecurityCapabilitiesQuery,
} from "@/modules/security/hooks/use-security-capabilities";
import { cn } from "@/shared/lib/utils";
import { downloadMatrixCsv } from "../api/training";
import { TrainingAuditorPanel } from "../components/training-auditor-panel";
import { TrainingCompetenciesPanel } from "../components/training-competencies-panel";
import { TrainingMatrixPanel } from "../components/training-matrix-panel";
import { TrainingOverviewPanel } from "../components/training-overview-panel";
import { TrainingPeoplePanel } from "../components/training-people-panel";
import {
  TrainingPersonSheet,
  type TrainingPersonSheetMode,
} from "../components/training-person-sheet";
import { TrainingPlanPanel } from "../components/training-plan-panel";
import { TrainingRolesPanel } from "../components/training-roles-panel";
import {
  TrainingSessionSheet,
  type TrainingSessionSheetMode,
} from "../components/training-session-sheet";
import { TrainingSessionsPanel } from "../components/training-sessions-panel";
import { TrainingSettingsPanel } from "../components/training-settings-panel";
import { useTrainingLogQuery } from "../hooks/use-training";
import { formatWhen, TRAINING_VIEW_LABELS } from "../lib/training-display";
import { TRAINING_HUB_VIEWS, type TrainingHubView } from "../types";
import { PageLoader } from "@/shared/components/ims-loader";
import { ModuleComplianceStrip } from "@/modules/live-compliance";

function parseView(value: string | null): TrainingHubView {
  if (value && (TRAINING_HUB_VIEWS as readonly string[]).includes(value)) {
    return value as TrainingHubView;
  }
  return "overview";
}

function TrainingLogPanel() {
  const logQuery = useTrainingLogQuery();
  const entries = logQuery.data ?? [];

  if (logQuery.isLoading) {
    return (
      <PageLoader label="Loading log…" />
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        title="No changes yet"
        description="Configuration and catalogue changes will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Change log</h2>
        <p className="text-sm text-muted-foreground">
          Settings, roles and competency catalogue changes.
        </p>
      </div>
      <div className="space-y-2 rounded-xl border border-border-subtle bg-card p-4">
        {entries.map((h, idx) => (
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
        ))}
      </div>
    </div>
  );
}

/**
 * Training & Competency hub at `/training`.
 */
export function TrainingHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = parseView(searchParams.get("view"));
  const createOpen = searchParams.get("create") === "1";
  const personId = searchParams.get("person");
  const sessionId = searchParams.get("session");
  const createSession = searchParams.get("createSession") === "1";
  const draftCid = searchParams.get("cid") || undefined;
  const draftAttendees = (searchParams.get("attendees") || "")
    .split(",")
    .filter(Boolean);

  const [editMode, setEditMode] = useState(false);
  const [sessionEditMode, setSessionEditMode] = useState(false);
  const [exporting, setExporting] = useState(false);

  const capsQuery = useSecurityCapabilitiesQuery();
  const provider = loadPublicEnv().VITE_SECURITY_PROVIDER;
  const canCreate = permissionAllowed(
    "training:create",
    capsQuery.data?.permissions,
    provider
  );

  const personSheetOpen = createOpen || Boolean(personId);
  const personSheetMode: TrainingPersonSheetMode = createOpen
    ? "create"
    : editMode
      ? "edit"
      : "view";

  const sessionSheetOpen = createSession || Boolean(sessionId);
  const sessionSheetMode: TrainingSessionSheetMode = createSession
    ? "create"
    : sessionEditMode
      ? "edit"
      : "view";

  const paramsBase = useMemo(() => {
    return new URLSearchParams(searchParams);
  }, [searchParams]);

  function setView(next: TrainingHubView) {
    const params = new URLSearchParams(paramsBase);
    params.set("view", next);
    params.delete("create");
    params.delete("person");
    params.delete("session");
    params.delete("createSession");
    params.delete("cid");
    params.delete("attendees");
    setEditMode(false);
    setSessionEditMode(false);
    setSearchParams(params);
  }

  function openCreatePerson() {
    setEditMode(false);
    const params = new URLSearchParams(paramsBase);
    params.set("view", "people");
    params.set("create", "1");
    params.delete("person");
    setSearchParams(params);
  }

  function openPerson(id: string) {
    setEditMode(false);
    const params = new URLSearchParams(paramsBase);
    params.delete("create");
    params.set("person", id);
    if (view === "overview") params.set("view", "people");
    setSearchParams(params);
  }

  function closePersonSheet() {
    setEditMode(false);
    const params = new URLSearchParams(paramsBase);
    params.delete("create");
    params.delete("person");
    setSearchParams(params);
  }

  function openCreateSession(cid?: string, attendees?: string[]) {
    setSessionEditMode(false);
    const params = new URLSearchParams(paramsBase);
    params.set("view", "sessions");
    params.set("createSession", "1");
    params.delete("session");
    if (cid) params.set("cid", cid);
    else params.delete("cid");
    if (attendees?.length) params.set("attendees", attendees.join(","));
    else params.delete("attendees");
    setSearchParams(params);
  }

  function openSession(id: string) {
    setSessionEditMode(false);
    const params = new URLSearchParams(paramsBase);
    params.delete("createSession");
    params.delete("cid");
    params.delete("attendees");
    params.set("session", id);
    params.set("view", "sessions");
    setSearchParams(params);
  }

  function closeSessionSheet() {
    setSessionEditMode(false);
    const params = new URLSearchParams(paramsBase);
    params.delete("createSession");
    params.delete("session");
    params.delete("cid");
    params.delete("attendees");
    setSearchParams(params);
  }

  async function handleExportCsv() {
    setExporting(true);
    try {
      await downloadMatrixCsv();
      notify.success("Matrix CSV downloaded");
    } catch (error) {
      notify.fromError(error, "Unable to export matrix CSV");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Training & competency"
        description="People matrix, roles, sessions, self-service acknowledgements and auditor evidence."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={exporting}
              onClick={() => void handleExportCsv()}
            >
              <Download className="size-3.5" /> Matrix CSV
            </Button>
          </div>
        }
      />
      <ModuleComplianceStrip module="training" />

      <div
        className="flex flex-wrap gap-1 border-b border-border-subtle"
        role="tablist"
        aria-label="Training views"
      >
        {TRAINING_HUB_VIEWS.map((id) => {
          const selected = view === id;
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
              onClick={() => setView(id)}
            >
              {TRAINING_VIEW_LABELS[id]}
              {selected ? (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              ) : null}
            </button>
          );
        })}
      </div>

      {view === "overview" ? (
        <TrainingOverviewPanel onJumpView={setView} />
      ) : null}
      {view === "matrix" ? (
        <TrainingMatrixPanel
          onOpenPerson={openPerson}
          canEdit={canCreate}
        />
      ) : null}
      {view === "people" ? (
        <TrainingPeoplePanel
          onOpenPerson={openPerson}
          onCreate={openCreatePerson}
          canCreate={canCreate}
        />
      ) : null}
      {view === "plan" ? (
        <TrainingPlanPanel
          canCreate={canCreate}
          onBookSession={(cid, attendeeIds) =>
            openCreateSession(cid, attendeeIds)
          }
        />
      ) : null}
      {view === "sessions" ? (
        <TrainingSessionsPanel
          onOpenSession={openSession}
          onCreate={() => openCreateSession()}
          canCreate={canCreate}
        />
      ) : null}
      {view === "courses" ? (
        <TrainingCompetenciesPanel canEdit={canCreate} />
      ) : null}
      {view === "roles" ? (
        <TrainingRolesPanel canEdit={canCreate} />
      ) : null}
      {view === "auditor" ? <TrainingAuditorPanel /> : null}
      {view === "settings" ? (
        <TrainingSettingsPanel canEdit={canCreate} />
      ) : null}
      {view === "log" ? <TrainingLogPanel /> : null}

      <TrainingPersonSheet
        open={personSheetOpen}
        mode={personSheetMode}
        personId={personId}
        onOpenChange={(next) => {
          if (!next) closePersonSheet();
        }}
        onModeChange={(m) => setEditMode(m === "edit")}
        canCreate={canCreate}
      />

      <TrainingSessionSheet
        open={sessionSheetOpen}
        mode={sessionSheetMode}
        sessionId={sessionId}
        draft={
          createSession
            ? { cid: draftCid, attendees: draftAttendees }
            : null
        }
        onOpenChange={(next) => {
          if (!next) closeSessionSheet();
        }}
        onModeChange={(m) => setSessionEditMode(m === "edit")}
        canCreate={canCreate}
      />
    </div>
  );
}
