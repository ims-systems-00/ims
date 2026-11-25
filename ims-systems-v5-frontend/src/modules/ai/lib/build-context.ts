import type { Audit } from "@/modules/audits/types";
import type { Incident } from "@/modules/incidents/types";
import type { InventoryAsset } from "@/modules/inventory/types";
import type { Risk } from "@/modules/risks/types";
import {
  auditAnalyserTemplate,
  incidentAnalyserTemplate,
  inventoryAnalyserTemplate,
  riskAnalyserTemplate,
} from "../templates";
import type { AnalyticalAssistantContext } from "../types";

export function buildRiskAssistantContext(
  risk: Risk,
  organisationName: string
): AnalyticalAssistantContext {
  return {
    source: { moduleType: "risks", moduleId: risk.id },
    businessUnitId: risk.businessUnitId,
    canCreateTasks: !risk.mitigated.status,
    template: riskAnalyserTemplate,
    local: {
      organisation: { name: organisationName || "Organisation" },
      risk: {
        reference: risk.reference,
        title: risk.title,
        description: risk.description,
        score: {
          likelihood: { current: risk.currentScore.likelihood },
          consequence: { current: risk.currentScore.consequence },
        },
      },
    },
  };
}

export function buildIncidentAssistantContext(
  incident: Incident,
  organisationName: string
): AnalyticalAssistantContext {
  return {
    source: { moduleType: "incidents", moduleId: incident.id },
    businessUnitId: incident.businessUnitId,
    canCreateTasks: !incident.resolved.status,
    template: incidentAnalyserTemplate,
    local: {
      organisation: { name: organisationName || "Organisation" },
      reference: incident.reference,
      title: incident.title,
      description: incident.description,
    },
  };
}

export function buildAuditAssistantContext(
  audit: Audit,
  organisationName: string
): AnalyticalAssistantContext {
  return {
    source: { moduleType: "audits", moduleId: audit.id },
    businessUnitId: audit.businessUnitId,
    canCreateTasks: !audit.completed.status,
    template: auditAnalyserTemplate,
    local: {
      organisation: { name: organisationName || "Organisation" },
      reference: audit.reference,
      title: audit.title,
      focusArea: audit.focusArea,
    },
  };
}

export function buildInventoryAssistantContext(
  asset: InventoryAsset,
  organisationName: string
): AnalyticalAssistantContext {
  const checksSummary =
    Object.entries(asset.checks)
      .map(
        ([name, row]) =>
          `${name}: ${row.date} ${row.result} by ${row.by}${
            row.ref ? ` (${row.ref})` : ""
          }`
      )
      .join("\n") || "No checks recorded";

  return {
    source: { moduleType: "inventory", moduleId: asset.id },
    canCreateTasks: asset.stage !== "Disposed",
    template: inventoryAnalyserTemplate,
    local: {
      organisation: { name: organisationName || "Organisation" },
      tag: asset.tag,
      name: asset.name,
      category: asset.category,
      stage: asset.stage,
      location: asset.location || "—",
      custodian: asset.custodian || "—",
      checksSummary,
    },
  };
}
