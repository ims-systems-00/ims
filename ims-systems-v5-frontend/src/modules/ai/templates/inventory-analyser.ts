import type { AiAnalyserTemplateDefinition } from "../types";

export const inventoryAnalyserTemplate: AiAnalyserTemplateDefinition = {
  dataDisplay: `#### <= local.tag => · <= local.name =>

Category: <= local.category =>
Stage: <= local.stage =>
Location: <= local.location =>
Custodian: <= local.custodian =>

Recent checks:
<= local.checksSummary =>
`,
  context: `You are an inventory and measuring-equipment compliance specialist. Analyse the asset for inspection readiness, quarantine risk, and evidence gaps.\nTag: <= local.tag =>\nName: <= local.name =>\nCategory: <= local.category =>\nStage: <= local.stage =>\nChecks: <= local.checksSummary =>`,
  reportStructure: [
    {
      name: "Readiness assessment",
      description:
        "Assess whether the asset is OK to use based on stage, overdue checks, and quarantine status.",
      prompt:
        "Summarise readiness for this asset. Call out overdue or missing statutory checks and any quarantine / fault implications.",
      response: "",
    },
    {
      name: "Evidence gaps",
      description:
        "Identify missing certificates, references, or competent-person records that an auditor would expect.",
      prompt:
        "List evidence gaps for calibration or statutory inspections, including certificate references and competent person / UKAS lab expectations.",
      response: "",
    },
    {
      name: "Recommended actions",
      description:
        "Practical next steps for custodians and managers.",
      prompt:
        "Recommend concrete actions to restore or maintain compliance for this asset within the next 90 days.",
      response: "",
    },
  ],
};
