import { apiBlobRequest, apiRequest, type HttpMethod } from "@/shared/lib/http";
import { encodeTrainingFileId } from "../lib/file-id";
import type {
  CreateCompetencyInput,
  CreateExternalPersonInput,
  CreatePersonInput,
  CreateRecordInput,
  CreateRoleInput,
  CreateSessionInput,
  ListPeopleParams,
  SelfTokenResult,
  SessionOutcome,
  TrainingCompetency,
  TrainingGapItem,
  TrainingLogEntry,
  TrainingMatrix,
  TrainingOverview,
  TrainingPerson,
  TrainingPlanGroup,
  TrainingReadinessCheck,
  TrainingRecord,
  TrainingRole,
  TrainingRsvpStatus,
  TrainingRsvpView,
  TrainingSelfView,
  TrainingSession,
  TrainingSettings,
  UpdateCompetencyInput,
  UpdatePersonInput,
  UpdateRoleInput,
  UpdateSessionInput,
  UpdateTrainingSettingsInput,
} from "../types";

function toQuery(
  params: Record<string, string | number | boolean | undefined>
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function publicRequest<T>(
  path: string,
  init?: { method?: HttpMethod; body?: unknown }
): Promise<T> {
  return apiRequest<T>(path, {
    method: init?.method,
    body: init?.body,
  });
}

// --- Settings / log / bootstrap ---

export function getTrainingSettings(): Promise<TrainingSettings> {
  return apiRequest<TrainingSettings>("/training/settings");
}

export function updateTrainingSettings(
  body: UpdateTrainingSettingsInput
): Promise<TrainingSettings> {
  return apiRequest<TrainingSettings>("/training/settings", {
    method: "PUT",
    body,
  });
}

export function getTrainingLog(): Promise<TrainingLogEntry[]> {
  return apiRequest<TrainingLogEntry[]>("/training/log");
}

export function ensureTrainingCatalogue(): Promise<unknown> {
  return apiRequest("/training/bootstrap", { method: "POST" });
}

// --- Competencies ---

export function listCompetencies(): Promise<TrainingCompetency[]> {
  return apiRequest<TrainingCompetency[]>("/training/competencies");
}

export function createCompetency(
  body: CreateCompetencyInput
): Promise<TrainingCompetency> {
  return apiRequest<TrainingCompetency>("/training/competencies", {
    method: "POST",
    body,
  });
}

export function updateCompetency(
  id: string,
  body: UpdateCompetencyInput
): Promise<TrainingCompetency> {
  return apiRequest<TrainingCompetency>(`/training/competencies/${id}`, {
    method: "PUT",
    body,
  });
}

export function archiveCompetency(id: string): Promise<TrainingCompetency> {
  return apiRequest<TrainingCompetency>(`/training/competencies/${id}`, {
    method: "DELETE",
  });
}

// --- Roles ---

export function listRoles(): Promise<TrainingRole[]> {
  return apiRequest<TrainingRole[]>("/training/roles");
}

export function createRole(body: CreateRoleInput): Promise<TrainingRole> {
  return apiRequest<TrainingRole>("/training/roles", {
    method: "POST",
    body,
  });
}

export function updateRole(
  id: string,
  body: UpdateRoleInput
): Promise<TrainingRole> {
  return apiRequest<TrainingRole>(`/training/roles/${id}`, {
    method: "PUT",
    body,
  });
}

export function removeRole(id: string): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(`/training/roles/${id}`, {
    method: "DELETE",
  });
}

// --- People ---

export function listPeople(
  params: ListPeopleParams = {}
): Promise<TrainingPerson[]> {
  return apiRequest<TrainingPerson[]>(
    `/training/people${toQuery({
      status: params.status,
      site: params.site,
      role: params.role,
      search: params.search,
      gapsOnly: params.gapsOnly,
    })}`
  );
}

export function getPerson(id: string): Promise<TrainingPerson> {
  return apiRequest<TrainingPerson>(`/training/people/${id}`);
}

export function createPerson(
  body: CreatePersonInput
): Promise<TrainingPerson> {
  return apiRequest<TrainingPerson>("/training/people", {
    method: "POST",
    body,
  });
}

export function addExternalPerson(
  body: CreateExternalPersonInput
): Promise<TrainingPerson> {
  return apiRequest<TrainingPerson>("/training/people/external", {
    method: "POST",
    body,
  });
}

export function updatePerson(
  id: string,
  body: UpdatePersonInput
): Promise<TrainingPerson> {
  return apiRequest<TrainingPerson>(`/training/people/${id}`, {
    method: "PUT",
    body,
  });
}

export function markLeaver(
  id: string,
  body?: { date?: string }
): Promise<TrainingPerson> {
  return apiRequest<TrainingPerson>(`/training/people/${id}/leaver`, {
    method: "POST",
    body: body ?? {},
  });
}

export function setExemption(
  id: string,
  body: { cid: string; reason: string }
): Promise<TrainingPerson> {
  return apiRequest<TrainingPerson>(`/training/people/${id}/exempt`, {
    method: "POST",
    body,
  });
}

export function clearExemption(
  id: string,
  cid: string
): Promise<TrainingPerson> {
  return apiRequest<TrainingPerson>(
    `/training/people/${id}/exempt/${encodeURIComponent(cid)}`,
    { method: "DELETE" }
  );
}

export function acknowledgePolicy(
  id: string,
  body: { cid: string; answers?: number[] }
): Promise<TrainingRecord> {
  return apiRequest<TrainingRecord>(`/training/people/${id}/acknowledge`, {
    method: "POST",
    body,
  });
}

export function issueSelfToken(id: string): Promise<SelfTokenResult> {
  return apiRequest<SelfTokenResult>(`/training/people/${id}/self-token`, {
    method: "POST",
  });
}

// --- Records ---

export function listRecords(personId?: string): Promise<TrainingRecord[]> {
  return apiRequest<TrainingRecord[]>(
    `/training/records${toQuery({ personId })}`
  );
}

export function createRecord(
  body: CreateRecordInput
): Promise<TrainingRecord> {
  return apiRequest<TrainingRecord>("/training/records", {
    method: "POST",
    body,
  });
}

export function verifyRecord(id: string): Promise<TrainingRecord> {
  return apiRequest<TrainingRecord>(`/training/records/${id}/verify`, {
    method: "POST",
  });
}

// --- Sessions ---

export function listSessions(): Promise<TrainingSession[]> {
  return apiRequest<TrainingSession[]>("/training/sessions");
}

export function getSession(id: string): Promise<TrainingSession> {
  return apiRequest<TrainingSession>(`/training/sessions/${id}`);
}

export function createSession(
  body: CreateSessionInput
): Promise<TrainingSession> {
  return apiRequest<TrainingSession>("/training/sessions", {
    method: "POST",
    body,
  });
}

export function updateSession(
  id: string,
  body: UpdateSessionInput
): Promise<TrainingSession> {
  return apiRequest<TrainingSession>(`/training/sessions/${id}`, {
    method: "PUT",
    body,
  });
}

export function completeSession(
  id: string,
  outcomes?: Record<string, SessionOutcome>
): Promise<unknown> {
  return apiRequest(`/training/sessions/${id}/complete`, {
    method: "POST",
    body: { outcomes },
  });
}

export function cancelSession(
  id: string,
  reason?: string
): Promise<TrainingSession> {
  return apiRequest<TrainingSession>(`/training/sessions/${id}/cancel`, {
    method: "POST",
    body: { reason },
  });
}

export function inviteSession(
  id: string,
  personIds?: string[]
): Promise<unknown> {
  return apiRequest(`/training/sessions/${id}/invite`, {
    method: "POST",
    body: { personIds },
  });
}

export function rsvpSession(
  id: string,
  body: { personId?: string; status: TrainingRsvpStatus; note?: string }
): Promise<unknown> {
  return apiRequest(`/training/sessions/${id}/rsvp`, {
    method: "POST",
    body,
  });
}

export type SessionAttachmentInput = {
  name: string;
  size?: number;
  type?: string;
  fileId?: string | null;
  url?: string | null;
  shared?: boolean;
  note?: string;
};

export function addSessionAttachment(
  id: string,
  kind: "materials" | "outputs",
  body: SessionAttachmentInput
): Promise<TrainingSession> {
  return apiRequest<TrainingSession>(`/training/sessions/${id}/${kind}`, {
    method: "POST",
    body,
  });
}

export function removeSessionAttachment(
  id: string,
  kind: "materials" | "outputs",
  attachmentId: string
): Promise<TrainingSession> {
  return apiRequest<TrainingSession>(
    `/training/sessions/${id}/${kind}/${attachmentId}`,
    { method: "DELETE" }
  );
}

// --- Read models ---

export function getTrainingOverview(): Promise<TrainingOverview> {
  return apiRequest<TrainingOverview>("/training/overview");
}

export function getTrainingMatrix(): Promise<TrainingMatrix> {
  return apiRequest<TrainingMatrix>("/training/matrix");
}

export function getTrainingGaps(): Promise<TrainingGapItem[]> {
  return apiRequest<TrainingGapItem[]>("/training/gaps");
}

export function getTrainingPlan(months = 3): Promise<TrainingPlanGroup[]> {
  return apiRequest<TrainingPlanGroup[]>(
    `/training/plan${toQuery({ months })}`
  );
}

export function getTrainingReadiness(): Promise<TrainingReadinessCheck[]> {
  return apiRequest<TrainingReadinessCheck[]>("/training/readiness");
}

export async function openAuditorPack(): Promise<void> {
  const data = await apiRequest<{ html: string }>(
    "/training/auditor-pack?format=html"
  );
  const blob = new Blob([data.html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function downloadAuditorPackPdf(): Promise<void> {
  const { downloadHtmlDocumentAsPdf } = await import(
    "@/shared/lib/download-html-pdf"
  );
  const data = await apiRequest<{ html: string }>(
    "/training/auditor-pack?format=html"
  );
  await downloadHtmlDocumentAsPdf(data.html, "training-auditor-pack.pdf");
}

export async function downloadMatrixCsv(): Promise<void> {
  const blob = await apiBlobRequest("/training/export/matrix.csv", {
    accept: "text/csv",
  });
  triggerDownload(blob, "training-matrix.csv");
}

// --- Public self ---

export function getPublicSelfView(token: string): Promise<TrainingSelfView> {
  return publicRequest(
    `/training/public/self/${encodeURIComponent(token)}`
  );
}

export function publicSelfAcknowledge(
  token: string,
  body: { cid: string; answers?: number[] }
): Promise<TrainingRecord> {
  return publicRequest(
    `/training/public/self/${encodeURIComponent(token)}/acknowledge`,
    { method: "POST", body }
  );
}

export function publicSelfUpload(
  token: string,
  body: {
    cid: string;
    date?: string;
    provider?: string;
    ref?: string;
    fileId?: string | null;
    note?: string;
  }
): Promise<TrainingRecord> {
  return publicRequest(
    `/training/public/self/${encodeURIComponent(token)}/upload`,
    { method: "POST", body }
  );
}

export function preparePublicSelfUpload(
  token: string,
  body: { fileName: string; contentType?: string; fileSize?: number }
): Promise<{ url: string; storageInfo: import("../types").TrainingFileMeta }> {
  return publicRequest(
    `/training/public/self/${encodeURIComponent(token)}/prepare-upload`,
    { method: "POST", body }
  );
}

export async function uploadViaPublicSelfToken(
  token: string,
  file: File
): Promise<string> {
  const prepared = await preparePublicSelfUpload(token, {
    fileName: file.name,
    contentType: file.type || undefined,
    fileSize: file.size,
  });
  if (!prepared.url.startsWith("memory://")) {
    const response = await fetch(prepared.url, {
      method: "PUT",
      body: file,
      headers: {
        ...(file.type ? { "Content-Type": file.type } : {}),
      },
    });
    if (!response.ok) {
      throw new Error(`Upload failed (${response.status})`);
    }
  }
  return encodeTrainingFileId(prepared.storageInfo);
}

// --- Public RSVP ---

export function getPublicRsvpView(token: string): Promise<TrainingRsvpView> {
  return publicRequest(
    `/training/public/rsvp/${encodeURIComponent(token)}`
  );
}

export function publicRsvp(
  token: string,
  body: { status: TrainingRsvpStatus; note?: string }
): Promise<{ status: TrainingRsvpStatus; note: string; t: string }> {
  return publicRequest(`/training/public/rsvp/${encodeURIComponent(token)}`, {
    method: "POST",
    body,
  });
}
