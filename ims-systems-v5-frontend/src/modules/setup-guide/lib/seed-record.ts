import { uploadFileViaHandler } from "@/modules/files";
import {
  createDocumentRepository,
  createFileNodes,
  listDocumentRepositories,
  listRepoNodes,
} from "@/modules/document-management/api/document-management";
import {
  listComplianceControls,
  provisionComplianceToolkit,
} from "@/modules/compliance/api/compliance";
import {
  toolkitPath,
  type ComplianceToolkitName,
} from "@/modules/compliance/types";
import { createRisk, listRisks } from "@/modules/risks/api/risks";
import { createAudit, listAudits } from "@/modules/audits/api/audits";
import { listFunctionalUnits } from "@/modules/functional-units/api/functional-units";
import { isApiClientError } from "@/shared/lib/http/errors";

export type SeededDocument = {
  repositoryId: string;
  nodeId: string;
  path: string;
};

export type SeededControl = {
  toolkitName: ComplianceToolkitName;
  controlId: string;
  path: string;
};

function buildStarterPolicyFile(): File {
  const body = [
    "Information Security Policy",
    "",
    "Starter policy created by Setup Guide so Compliance Settings can be coached.",
    `Created: ${new Date().toISOString()}`,
  ].join("\n");
  return new File([body], "information-security-policy.txt", {
    type: "text/plain",
  });
}

function defaultReviewDateIso(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString();
}

/**
 * Reuse the last setup document, else the newest document in any repo,
 * else create a Policies & Procedures repo + starter policy.
 */
export async function ensureSetupDocument(input: {
  ownerId: string;
  preferred?: { repositoryId: string; nodeId: string } | null;
  tab?: "compliance-settings";
}): Promise<SeededDocument> {
  if (input.preferred?.repositoryId && input.preferred.nodeId) {
    const path = documentPath(
      input.preferred.repositoryId,
      input.preferred.nodeId,
      input.tab
    );
    return { ...input.preferred, path };
  }

  const repos = await listDocumentRepositories({
    page: 1,
    pageSize: 20,
    sort: "createdOn",
    sortDir: "desc",
  });

  for (const repo of repos.items) {
    const nodes = await listRepoNodes(repo.id, {
      page: 1,
      pageSize: 20,
      type: "document",
      sort: "createdOn",
      sortDir: "desc",
    });
    const node = nodes.items[0];
    if (node) {
      return {
        repositoryId: repo.id,
        nodeId: node.id,
        path: documentPath(repo.id, node.id, input.tab),
      };
    }
  }

  if (!input.ownerId) {
    throw new Error("Sign in again — Setup Guide needs your user id to seed a document.");
  }

  const repo =
    repos.items[0] ??
    (await createDocumentRepository({
      name: "Policies & Procedures",
      privacy: "Organisational",
      owners: [input.ownerId],
      reviewInterval: "Yearly",
      description: "Created by Setup Guide for coaching Compliance Settings.",
    }));

  const storageInfo = await uploadFileViaHandler(
    buildStarterPolicyFile(),
    "general"
  );
  const result = await createFileNodes(repo.id, {
    data: [
      {
        storageInfo: {
          ...storageInfo,
          Name: "Information Security Policy.txt",
        },
        purpose: "Policy",
        owners: [input.ownerId],
        reviewDate: defaultReviewDateIso(),
        authorisation: [],
        applicableModules: ["compliancecontrols"],
        complianceTools: ["ISO9001"],
      },
    ],
  });
  const node = result.created[0];
  if (!node) {
    throw new Error(
      result.skipped.length
        ? `Document already exists: ${result.skipped.join(", ")}`
        : "Could not create a starter document for the guide."
    );
  }

  return {
    repositoryId: repo.id,
    nodeId: node.id,
    path: documentPath(repo.id, node.id, input.tab),
  };
}

function documentPath(
  repositoryId: string,
  nodeId: string,
  tab?: "compliance-settings"
): string {
  const base = `/documents/repositories/${repositoryId}/nodes/${nodeId}`;
  return tab ? `${base}?tab=${tab}` : base;
}

export type SeededRepositoryCreate = {
  path: string;
};

export type SeededRepository = {
  repositoryId: string;
  path: string;
};

/** Open Documents › Repositories with the create-repository sheet ready. */
export function ensureSetupRepositoryCreate(): SeededRepositoryCreate {
  return { path: "/documents?tab=repositories&createRepo=1" };
}

/**
 * Reuse the last setup repository, else the newest library, else create
 * “Policies & Procedures” so Upload can be coached inside a workspace.
 */
export async function ensureSetupRepository(input: {
  ownerId: string;
  preferred?: { repositoryId: string } | null;
  tab?: "upload";
}): Promise<SeededRepository> {
  if (input.preferred?.repositoryId) {
    return {
      repositoryId: input.preferred.repositoryId,
      path: repositoryPath(input.preferred.repositoryId, input.tab),
    };
  }

  const repos = await listDocumentRepositories({
    page: 1,
    pageSize: 20,
    sort: "createdOn",
    sortDir: "desc",
  });
  const existing = repos.items[0];
  if (existing) {
    return {
      repositoryId: existing.id,
      path: repositoryPath(existing.id, input.tab),
    };
  }

  if (!input.ownerId) {
    throw new Error(
      "Sign in again — Setup Guide needs your user id to seed a repository."
    );
  }

  const repo = await createDocumentRepository({
    name: "Policies & Procedures",
    privacy: "Organisational",
    owners: [input.ownerId],
    reviewInterval: "Yearly",
    description: "Created by Setup Guide for coaching document upload.",
  });

  return {
    repositoryId: repo.id,
    path: repositoryPath(repo.id, input.tab),
  };
}

function repositoryPath(
  repositoryId: string,
  tab?: "upload"
): string {
  const base = `/documents/repositories/${repositoryId}`;
  return tab === "upload" ? `${base}?upload=1` : base;
}

/**
 * Provision ISO 9001 if needed, reuse last control, else open the first
 * unlocked leaf control in the toolkit sheet.
 */
export async function ensureSetupControl(input: {
  preferred?: {
    toolkitName: ComplianceToolkitName;
    controlId: string;
  } | null;
  toolkitName?: ComplianceToolkitName;
  tab?: "evidence";
}): Promise<SeededControl> {
  const toolkitName = input.preferred?.toolkitName ?? input.toolkitName ?? "ISO 9001";

  if (input.preferred?.controlId) {
    return {
      toolkitName: input.preferred.toolkitName,
      controlId: input.preferred.controlId,
      path: controlPath(
        input.preferred.toolkitName,
        input.preferred.controlId,
        input.tab
      ),
    };
  }

  try {
    await provisionComplianceToolkit(toolkitName);
  } catch (err) {
    // Already provisioned is fine.
    if (!(isApiClientError(err) && (err.status === 409 || err.status === 400))) {
      const message = isApiClientError(err) ? err.message : "";
      if (!/already|exist|provisioned/i.test(message)) {
        // Continue — list will surface a clear error if toolkit is missing.
      }
    }
  }

  const page = await listComplianceControls(toolkitName, {
    page: 1,
    pageSize: 50,
    sort: "clause",
    sortDir: "asc",
  });
  const control =
    page.items.find((row) => !row.isLocked) ?? page.items[0];
  if (!control) {
    throw new Error(
      "No controls found for this toolkit. Activate it from Compliance first."
    );
  }

  return {
    toolkitName,
    controlId: control.id,
    path: controlPath(toolkitName, control.id, input.tab),
  };
}

function controlPath(
  toolkitName: ComplianceToolkitName | string,
  controlId: string,
  tab?: "evidence"
): string {
  const base = `${toolkitPath(toolkitName)}?tab=toolkit&control=${encodeURIComponent(controlId)}`;
  return tab === "evidence" ? `${base}&panel=evidence` : base;
}

export type SeededRisk = {
  riskId: string;
  path: string;
};

export type SeededAudit = {
  auditId: string;
  path: string;
};

/**
 * Reuse the last setup risk, else the newest open risk, else create a
 * starter organisational risk so Analyse is available on the view sheet.
 */
export async function ensureSetupRisk(input: {
  ownerId: string;
  preferred?: { riskId: string } | null;
}): Promise<SeededRisk> {
  if (input.preferred?.riskId) {
    return {
      riskId: input.preferred.riskId,
      path: riskPath(input.preferred.riskId),
    };
  }

  const page = await listRisks({
    page: 1,
    pageSize: 20,
    sort: "raisedOn",
    sortDir: "desc",
  });
  const existing =
    page.items.find((row) => !row.mitigated.status) ?? page.items[0];
  if (existing) {
    return { riskId: existing.id, path: riskPath(existing.id) };
  }

  if (!input.ownerId) {
    throw new Error("Sign in again — Setup Guide needs your user id to seed a risk.");
  }

  const risk = await createRisk({
    title: "Unauthorised access to customer data",
    description:
      "Starter risk from Setup Guide so Analyse can be coached on a saved record.",
    type: "Organisational",
    ownerId: input.ownerId,
    likelihood: 3,
    consequence: 4,
  });

  return { riskId: risk.id, path: riskPath(risk.id) };
}

function riskPath(riskId: string): string {
  return `/risks?risk=${encodeURIComponent(riskId)}`;
}

/**
 * Reuse the last setup internal audit, else the newest incomplete one,
 * else schedule a starter yearly audit so Assist is available on view.
 */
export async function ensureSetupAudit(input: {
  auditorId: string;
  preferred?: { auditId: string } | null;
}): Promise<SeededAudit> {
  if (input.preferred?.auditId) {
    return {
      auditId: input.preferred.auditId,
      path: auditPath(input.preferred.auditId),
    };
  }

  const page = await listAudits({
    page: 1,
    pageSize: 20,
    type: "Internal",
    sort: "updatedAt",
    sortDir: "desc",
  });
  const existing =
    page.items.find((row) => !row.completed.status) ?? page.items[0];
  if (existing) {
    return { auditId: existing.id, path: auditPath(existing.id) };
  }

  if (!input.auditorId) {
    throw new Error(
      "Sign in again — Setup Guide needs your user id to seed an audit."
    );
  }

  const units = await listFunctionalUnits({ page: 1, pageSize: 20 });
  const businessUnit = units.items[0];
  const complianceBody = units.items[1] ?? units.items[0];
  if (!businessUnit || !complianceBody) {
    throw new Error(
      "Create a functional unit in Setup Guide first — audits need a business unit."
    );
  }

  const start = new Date();
  start.setDate(start.getDate() + 14);
  const result = await createAudit({
    title: "Internal QMS audit",
    focusArea: "Quality management system — clauses 4–10",
    auditorId: input.auditorId,
    businessUnitId: businessUnit.id,
    complianceBodyId: complianceBody.id,
    startDate: start.toISOString(),
    interval: "Yearly",
    type: "Internal",
    time: "09:00",
  });
  const audit = result.items[0];
  if (!audit) {
    throw new Error("Could not create a starter audit for the guide.");
  }

  return { auditId: audit.id, path: auditPath(audit.id) };
}

function auditPath(auditId: string): string {
  return `/audits/internal?audit=${encodeURIComponent(auditId)}`;
}
