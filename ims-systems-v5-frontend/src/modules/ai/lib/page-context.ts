import type { AiChatModuleHint, AiChatPageContext } from "../types-chat";

function moduleFromPath(pathname: string): AiChatModuleHint {
  if (pathname.startsWith("/risks")) return "risks";
  if (pathname.startsWith("/incidents")) return "incidents";
  if (pathname.startsWith("/audits")) return "audits";
  if (pathname.startsWith("/documents")) return "documents";
  if (pathname.startsWith("/compliance")) return "compliance";
  if (pathname.startsWith("/ofi")) return "ofi";
  if (pathname.startsWith("/tasks")) return "tasks";
  if (pathname.startsWith("/suppliers")) return "suppliers";
  if (pathname.startsWith("/customers")) return "customers";
  return "other";
}

/**
 * Derive chat page context from the current route + query string.
 */
export function buildPageContext(
  pathname: string,
  search: string
): AiChatPageContext {
  const params = new URLSearchParams(search);
  const moduleHint = moduleFromPath(pathname);
  const selectedIds: Array<{ module: string; id: string }> = [];

  const risk = params.get("risk");
  if (risk) selectedIds.push({ module: "risks", id: risk });
  const incident = params.get("incident");
  if (incident) selectedIds.push({ module: "incidents", id: incident });
  const audit = params.get("audit");
  if (audit) selectedIds.push({ module: "audits", id: audit });
  const ofi = params.get("ofi");
  if (ofi) selectedIds.push({ module: "ofi", id: ofi });
  const control = params.get("control");
  if (control) selectedIds.push({ module: "compliance", id: control });
  const task = params.get("task");
  if (task) selectedIds.push({ module: "tasks", id: task });

  const nodeMatch = pathname.match(
    /\/documents\/repositories\/([^/]+)\/nodes\/([^/]+)/
  );
  if (nodeMatch?.[2]) {
    selectedIds.push({ module: "documents", id: nodeMatch[2] });
  }

  return {
    pathname,
    moduleHint,
    selectedIds,
  };
}

/** Human label for the sidebar context chip. */
export function pageContextLabel(pageContext: AiChatPageContext): string {
  const selected = pageContext.selectedIds?.[0];
  const moduleHint = pageContext.moduleHint ?? "other";
  const moduleLabel = moduleLabelForHint(moduleHint);
  if (selected) {
    return `Viewing ${moduleLabel} record`;
  }
  return `On ${moduleLabel}`;
}

export function moduleLabelForHint(moduleHint: string): string {
  switch (moduleHint) {
    case "risks":
      return "Risks";
    case "incidents":
      return "Incidents";
    case "audits":
      return "Audits";
    case "documents":
      return "Documents";
    case "compliance":
      return "Compliance";
    case "ofi":
      return "Continual improvement";
    case "tasks":
      return "Tasks";
    case "suppliers":
      return "Suppliers";
    case "customers":
      return "Customers";
    default:
      return "IMS";
  }
}

/** Org-wide suggestions for the floating general chat. */
export function suggestedPromptsGeneral(): string[] {
  return [
    "What open risks and incidents need attention across the organisation?",
    "Show high priority tasks that need attention ASAP",
    "Where are we weakest in compliance right now?",
    "Summarise outstanding work across risks, incidents, and OFIs",
  ];
}

/** Page-tailored suggestions for the navbar sidebar sheet. */
export function suggestedPromptsForModule(
  moduleHint: string | undefined
): string[] {
  switch (moduleHint) {
    case "risks":
      return [
        "Summarise open high risks relevant to this page",
        "What should I prioritise next for risk treatment?",
        "Create a treatment task for the open risk on this page",
        "Which risks are linked to compliance gaps?",
      ];
    case "incidents":
      return [
        "What open P1/P2 incidents do we have?",
        "Suggest next steps for the incident on this page",
        "Draft follow-up actions for this incident",
        "Summarise recent unresolved incidents",
      ];
    case "audits":
      return [
        "Which audits are upcoming or overdue?",
        "Help me prepare for the audit on this page",
        "What findings themes should I watch for?",
        "Create a follow-up task from this audit",
      ];
    case "documents":
      return [
        "What is this document used for in compliance?",
        "Which published policies relate to information security?",
        "Summarise linked compliance controls for this document",
      ];
    case "compliance":
      return [
        "Which selected controls are not yet implemented?",
        "Explain the control on this page and what evidence is missing",
        "Where are we weakest in this toolkit?",
        "Suggest an OFI for the weakest control area",
      ];
    case "ofi":
      return [
        "List open OFIs that need attention",
        "Suggest improvements based on recent OFIs",
        "Create a task to track this OFI",
      ];
    case "tasks":
      return [
        "Show high priority tasks that need attention ASAP",
        "Which incomplete tasks are overdue?",
        "Summarise my open tasks by priority",
      ];
    case "suppliers":
      return [
        "Which suppliers need attention or review?",
        "Summarise supplier-related risks or incidents",
      ];
    case "customers":
      return [
        "Summarise customer-related work that needs attention",
        "What open tasks relate to customers?",
      ];
    default:
      return [
        "Ask about this page — what should I focus on?",
        "Show high priority tasks that need attention ASAP",
        "What open risks and incidents need attention?",
      ];
  }
}
