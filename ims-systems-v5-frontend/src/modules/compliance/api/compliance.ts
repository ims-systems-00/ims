import { apiRequest } from "@/shared/lib/http";
import type {
  AddEmbeddedEvidenceInput,
  ComplianceOverview,
  ComplianceToolkitName,
  ComplianceToolkitSummary,
  ControlEvidence,
  ControlStatus,
  CreateControlEvidenceInput,
  ListCatalogueControlsParams,
  ListControlEvidenceParams,
  ListControlsParams,
  PaginatedCatalogueControls,
  PaginatedControlEvidence,
  PaginatedControlStatuses,
  ProvisionToolkitResult,
  UpdateControlStatusInput,
} from "../types";
import { encodeToolkitName } from "../types";

function controlsQuery(params: ListControlsParams = {}): string {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.search) search.set("search", params.search);
  if (params.section) search.set("section", params.section);
  if (params.sort) search.set("sort", params.sort);
  if (params.sortDir) search.set("sortDir", params.sortDir);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

function evidenceQuery(params: ListControlEvidenceParams = {}): string {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.evidenceType) search.set("evidenceType", params.evidenceType);
  if (params.sort) search.set("sort", params.sort);
  if (params.sortDir) search.set("sortDir", params.sortDir);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function listComplianceToolkits(): Promise<ComplianceToolkitSummary[]> {
  return apiRequest<ComplianceToolkitSummary[]>("/compliance/toolkits");
}

export function provisionComplianceToolkit(
  name: ComplianceToolkitName
): Promise<ProvisionToolkitResult> {
  return apiRequest<ProvisionToolkitResult>("/compliance/toolkits", {
    method: "POST",
    body: { name },
  });
}

export function getComplianceOverview(
  name: ComplianceToolkitName | string
): Promise<ComplianceOverview> {
  return apiRequest<ComplianceOverview>(
    `/compliance/toolkits/${encodeToolkitName(name)}/overview`
  );
}

export function listComplianceControls(
  name: ComplianceToolkitName | string,
  params?: ListControlsParams
): Promise<PaginatedControlStatuses> {
  return apiRequest<PaginatedControlStatuses>(
    `/compliance/toolkits/${encodeToolkitName(name)}/controls${controlsQuery(params)}`
  );
}

function catalogueQuery(params: ListCatalogueControlsParams = {}): string {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.search) search.set("search", params.search);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/** Global catalogue clauses — works without toolkit provisioning. */
export function listCatalogueControls(
  name: ComplianceToolkitName | string,
  params?: ListCatalogueControlsParams
): Promise<PaginatedCatalogueControls> {
  return apiRequest<PaginatedCatalogueControls>(
    `/compliance/catalogues/${encodeToolkitName(name)}/controls${catalogueQuery(params)}`
  );
}

export function getComplianceControl(id: string): Promise<ControlStatus> {
  return apiRequest<ControlStatus>(`/compliance/controls/${id}`);
}

export function updateComplianceControlStatus(
  id: string,
  body: UpdateControlStatusInput
): Promise<ControlStatus> {
  return apiRequest<ControlStatus>(`/compliance/controls/${id}/status`, {
    method: "PUT",
    body,
  });
}

export function listControlEvidence(
  controlStatusId: string,
  params?: ListControlEvidenceParams
): Promise<PaginatedControlEvidence> {
  return apiRequest<PaginatedControlEvidence>(
    `/compliance/controls/${controlStatusId}/control-evidence${evidenceQuery(params)}`
  );
}

export function createControlEvidence(
  controlStatusId: string,
  body: CreateControlEvidenceInput
): Promise<ControlEvidence> {
  return apiRequest<ControlEvidence>(
    `/compliance/controls/${controlStatusId}/control-evidence`,
    { method: "POST", body }
  );
}

export function removeControlEvidence(
  controlStatusId: string,
  evidenceId: string
): Promise<ControlEvidence> {
  return apiRequest<ControlEvidence>(
    `/compliance/controls/${controlStatusId}/control-evidence/${evidenceId}`,
    { method: "DELETE" }
  );
}

export function addEmbeddedEvidence(
  controlStatusId: string,
  body: AddEmbeddedEvidenceInput
): Promise<ControlStatus> {
  return apiRequest<ControlStatus>(
    `/compliance/controls/${controlStatusId}/evidence`,
    { method: "POST", body }
  );
}

export function removeEmbeddedEvidence(
  controlStatusId: string,
  attachmentId: string
): Promise<ControlStatus> {
  return apiRequest<ControlStatus>(
    `/compliance/controls/${controlStatusId}/evidence/${attachmentId}`,
    { method: "DELETE" }
  );
}
