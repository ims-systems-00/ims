import { apiBlobRequest, apiRequest } from "@/shared/lib/http";
import type {
  AddDocumentInput,
  ApproveInput,
  AssessRequirementInput,
  CreateQuestionnaireInput,
  DraftQuestionnaireInput,
  FileUploadUrlInput,
  FileUploadUrlResult,
  MarkSubmittedInput,
  ParseUploadInput,
  ParseUploadResult,
  SetAnswerInput,
  SetPricingInput,
  StandaloneDraftInput,
  SubmitInput,
  TenderCaseStudy,
  TenderCertificate,
  TenderDraftResult,
  TenderFacts,
  TenderGateResponse,
  TenderLibraryAnswer,
  TenderLibraryHealth,
  TenderLogEntry,
  TenderPolicy,
  TenderPricing,
  TenderQuestionnaire,
  TenderQuestion,
  TenderRate,
  TenderRequirement,
  TenderService,
  TenderSettings,
  TenderSettingsResponse,
  TenderStats,
  TenderSubmissionResult,
  UpdateBidInput,
  UpdateTenderSettingsInput,
  UpsertAnswerInput,
  UpsertCaseInput,
  UpsertCertificateInput,
  UpsertPolicyInput,
  UpsertRateInput,
  UpsertServiceInput,
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

/* ---------------- settings / facts / hub ---------------- */

export function getTenderSettings(): Promise<TenderSettingsResponse> {
  return apiRequest<TenderSettingsResponse>("/tender/settings");
}

export function updateTenderSettings(
  body: UpdateTenderSettingsInput
): Promise<TenderSettings> {
  return apiRequest<TenderSettings>("/tender/settings", {
    method: "PUT",
    body,
  });
}

export function updateTenderFacts(facts: TenderFacts): Promise<TenderFacts> {
  return apiRequest<TenderFacts>("/tender/facts", {
    method: "PUT",
    body: facts,
  });
}

export function getTenderHealth(): Promise<TenderLibraryHealth> {
  return apiRequest<TenderLibraryHealth>("/tender/health");
}

export function getTenderOverview(): Promise<TenderStats> {
  return apiRequest<TenderStats>("/tender/overview");
}

export function getTenderLog(): Promise<TenderLogEntry[]> {
  return apiRequest<TenderLogEntry[]>("/tender/log");
}

/* ---------------- library CRUD ---------------- */

export function listTenderAnswers(): Promise<TenderLibraryAnswer[]> {
  return apiRequest<TenderLibraryAnswer[]>("/tender/library/answers");
}

export function createTenderAnswer(
  body: UpsertAnswerInput
): Promise<TenderLibraryAnswer> {
  return apiRequest<TenderLibraryAnswer>("/tender/library/answers", {
    method: "POST",
    body,
  });
}

export function updateTenderAnswer(
  id: string,
  body: UpsertAnswerInput
): Promise<TenderLibraryAnswer> {
  return apiRequest<TenderLibraryAnswer>(`/tender/library/answers/${id}`, {
    method: "PUT",
    body,
  });
}

export function deleteTenderAnswer(id: string): Promise<{ ok?: boolean }> {
  return apiRequest<{ ok?: boolean }>(`/tender/library/answers/${id}`, {
    method: "DELETE",
  });
}

export function listTenderCertificates(): Promise<TenderCertificate[]> {
  return apiRequest<TenderCertificate[]>("/tender/library/certificates");
}

export function createTenderCertificate(
  body: UpsertCertificateInput
): Promise<TenderCertificate> {
  return apiRequest<TenderCertificate>("/tender/library/certificates", {
    method: "POST",
    body,
  });
}

export function updateTenderCertificate(
  id: string,
  body: UpsertCertificateInput
): Promise<TenderCertificate> {
  return apiRequest<TenderCertificate>(
    `/tender/library/certificates/${id}`,
    { method: "PUT", body }
  );
}

export function deleteTenderCertificate(
  id: string
): Promise<{ ok?: boolean }> {
  return apiRequest<{ ok?: boolean }>(`/tender/library/certificates/${id}`, {
    method: "DELETE",
  });
}

export function listTenderPolicies(): Promise<TenderPolicy[]> {
  return apiRequest<TenderPolicy[]>("/tender/library/policies");
}

export function createTenderPolicy(
  body: UpsertPolicyInput
): Promise<TenderPolicy> {
  return apiRequest<TenderPolicy>("/tender/library/policies", {
    method: "POST",
    body,
  });
}

export function updateTenderPolicy(
  id: string,
  body: UpsertPolicyInput
): Promise<TenderPolicy> {
  return apiRequest<TenderPolicy>(`/tender/library/policies/${id}`, {
    method: "PUT",
    body,
  });
}

export function deleteTenderPolicy(id: string): Promise<{ ok?: boolean }> {
  return apiRequest<{ ok?: boolean }>(`/tender/library/policies/${id}`, {
    method: "DELETE",
  });
}

export function listTenderServices(): Promise<TenderService[]> {
  return apiRequest<TenderService[]>("/tender/library/services");
}

export function createTenderService(
  body: UpsertServiceInput
): Promise<TenderService> {
  return apiRequest<TenderService>("/tender/library/services", {
    method: "POST",
    body,
  });
}

export function updateTenderService(
  id: string,
  body: UpsertServiceInput
): Promise<TenderService> {
  return apiRequest<TenderService>(`/tender/library/services/${id}`, {
    method: "PUT",
    body,
  });
}

export function deleteTenderService(id: string): Promise<{ ok?: boolean }> {
  return apiRequest<{ ok?: boolean }>(`/tender/library/services/${id}`, {
    method: "DELETE",
  });
}

export function listTenderCases(): Promise<TenderCaseStudy[]> {
  return apiRequest<TenderCaseStudy[]>("/tender/library/cases");
}

export function createTenderCase(
  body: UpsertCaseInput
): Promise<TenderCaseStudy> {
  return apiRequest<TenderCaseStudy>("/tender/library/cases", {
    method: "POST",
    body,
  });
}

export function updateTenderCase(
  id: string,
  body: UpsertCaseInput
): Promise<TenderCaseStudy> {
  return apiRequest<TenderCaseStudy>(`/tender/library/cases/${id}`, {
    method: "PUT",
    body,
  });
}

export function deleteTenderCase(id: string): Promise<{ ok?: boolean }> {
  return apiRequest<{ ok?: boolean }>(`/tender/library/cases/${id}`, {
    method: "DELETE",
  });
}

export function listTenderRates(): Promise<TenderRate[]> {
  return apiRequest<TenderRate[]>("/tender/library/rates");
}

export function createTenderRate(body: UpsertRateInput): Promise<TenderRate> {
  return apiRequest<TenderRate>("/tender/library/rates", {
    method: "POST",
    body,
  });
}

export function updateTenderRate(
  id: string,
  body: UpsertRateInput
): Promise<TenderRate> {
  return apiRequest<TenderRate>(`/tender/library/rates/${id}`, {
    method: "PUT",
    body,
  });
}

export function deleteTenderRate(id: string): Promise<{ ok?: boolean }> {
  return apiRequest<{ ok?: boolean }>(`/tender/library/rates/${id}`, {
    method: "DELETE",
  });
}

/* ---------------- parse / questionnaires ---------------- */

export function parseTenderUpload(
  body: ParseUploadInput
): Promise<ParseUploadResult> {
  return apiRequest<ParseUploadResult>("/tender/parse", {
    method: "POST",
    body,
  });
}

export function listTenderQuestionnaires(): Promise<TenderQuestionnaire[]> {
  return apiRequest<TenderQuestionnaire[]>("/tender/questionnaires");
}

export function createTenderQuestionnaire(
  body: CreateQuestionnaireInput
): Promise<TenderQuestionnaire> {
  return apiRequest<TenderQuestionnaire>("/tender/questionnaires", {
    method: "POST",
    body,
  });
}

export function getTenderQuestionnaire(
  id: string
): Promise<TenderQuestionnaire> {
  return apiRequest<TenderQuestionnaire>(`/tender/questionnaires/${id}`);
}

export function updateTenderQuestionnaire(
  id: string,
  body: UpdateBidInput
): Promise<TenderQuestionnaire> {
  return apiRequest<TenderQuestionnaire>(`/tender/questionnaires/${id}`, {
    method: "PUT",
    body,
  });
}

export function deleteTenderQuestionnaire(
  id: string
): Promise<{ ok?: boolean }> {
  return apiRequest<{ ok?: boolean }>(`/tender/questionnaires/${id}`, {
    method: "DELETE",
  });
}

export function addTenderDocument(
  id: string,
  body: AddDocumentInput
): Promise<TenderQuestionnaire> {
  return apiRequest<TenderQuestionnaire>(
    `/tender/questionnaires/${id}/documents`,
    { method: "POST", body }
  );
}

export function assessTenderRequirement(
  id: string,
  rid: string,
  body: AssessRequirementInput
): Promise<TenderRequirement> {
  return apiRequest<TenderRequirement>(
    `/tender/questionnaires/${id}/requirements/${rid}`,
    { method: "PUT", body }
  );
}

export function autoAssessTenderRequirements(
  id: string
): Promise<TenderQuestionnaire> {
  return apiRequest<TenderQuestionnaire>(
    `/tender/questionnaires/${id}/requirements/assess`,
    { method: "POST", body: {} }
  );
}

export function setTenderPricing(
  id: string,
  body: SetPricingInput
): Promise<TenderPricing> {
  return apiRequest<TenderPricing>(`/tender/questionnaires/${id}/pricing`, {
    method: "PUT",
    body,
  });
}

export function getTenderGate(id: string): Promise<TenderGateResponse> {
  return apiRequest<TenderGateResponse>(`/tender/questionnaires/${id}/gate`);
}

export function draftTenderQuestionnaire(
  id: string,
  body: DraftQuestionnaireInput = {}
): Promise<TenderQuestionnaire> {
  return apiRequest<TenderQuestionnaire>(
    `/tender/questionnaires/${id}/draft`,
    { method: "POST", body }
  );
}

export function setTenderAnswer(
  id: string,
  qid: string,
  body: SetAnswerInput
): Promise<TenderQuestion> {
  return apiRequest<TenderQuestion>(
    `/tender/questionnaires/${id}/questions/${qid}`,
    { method: "PUT", body }
  );
}

export function acceptTenderAnswer(
  id: string,
  qid: string
): Promise<TenderQuestion> {
  return apiRequest<TenderQuestion>(
    `/tender/questionnaires/${id}/questions/${qid}/accept`,
    { method: "POST", body: {} }
  );
}

export function approveTenderAnswers(
  id: string,
  body: ApproveInput = {}
): Promise<TenderQuestionnaire> {
  return apiRequest<TenderQuestionnaire>(
    `/tender/questionnaires/${id}/approve`,
    { method: "POST", body }
  );
}

export function submitTenderQuestionnaire(
  id: string,
  body: SubmitInput = {}
): Promise<TenderSubmissionResult> {
  return apiRequest<TenderSubmissionResult>(
    `/tender/questionnaires/${id}/submit`,
    { method: "POST", body }
  );
}

export function markTenderSubmitted(
  id: string,
  body: MarkSubmittedInput = {}
): Promise<TenderQuestionnaire> {
  return apiRequest<TenderQuestionnaire>(
    `/tender/questionnaires/${id}/submitted`,
    { method: "POST", body }
  );
}

export async function exportTenderQuestionnaire(
  id: string,
  format: "xlsx" | "docx" | "csv" = "xlsx"
): Promise<void> {
  const blob = await apiBlobRequest(
    `/tender/questionnaires/${id}/export${toQuery({ format })}`
  );
  const ext = format === "csv" ? "csv" : format;
  triggerDownload(blob, `tender-export.${ext}`);
}

export async function getTenderBidExport(
  id: string,
  what: "bid" | "pricing" | "questionnaire" = "bid"
): Promise<void> {
  const blob = await apiBlobRequest(
    `/tender/questionnaires/${id}/bid${toQuery({ what })}`
  );
  const name =
    what === "pricing"
      ? "tender-pricing.xlsx"
      : what === "questionnaire"
        ? "tender-questionnaire.xlsx"
        : "tender-bid.docx";
  triggerDownload(blob, name);
}

export function standaloneTenderDraft(
  body: StandaloneDraftInput
): Promise<TenderDraftResult> {
  return apiRequest<TenderDraftResult>("/tender/draft", {
    method: "POST",
    body,
  });
}

export function createTenderFileUploadUrl(
  body: FileUploadUrlInput
): Promise<FileUploadUrlResult> {
  return apiRequest<FileUploadUrlResult>("/tender/files/upload-url", {
    method: "POST",
    body,
  });
}

export async function openTenderAuditorPack(): Promise<void> {
  const blob = await apiBlobRequest("/tender/auditor-pack?format=html", {
    accept: "text/html",
  });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function downloadTenderAuditorPack(
  format: "html" | "pdf" = "html"
): Promise<void> {
  if (format === "pdf") {
    const { downloadHtmlDocumentAsPdf } = await import(
      "@/shared/lib/download-html-pdf"
    );
    const blob = await apiBlobRequest("/tender/auditor-pack?format=html", {
      accept: "text/html",
    });
    const html = await blob.text();
    await downloadHtmlDocumentAsPdf(html, "tender-auditor-pack.pdf");
    return;
  }
  const blob = await apiBlobRequest("/tender/auditor-pack?format=html", {
    accept: "text/html",
  });
  triggerDownload(blob, "tender-auditor-pack.html");
}

/** Read a File as base64 (no data: prefix). */
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}
