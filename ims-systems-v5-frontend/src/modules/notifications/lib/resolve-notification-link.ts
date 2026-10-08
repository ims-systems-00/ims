import type { Notification } from "../types";

/**
 * Resolve a persisted notification to a V5 in-app path.
 * Unknown identifiers return null (item can still be marked read).
 */
export function resolveNotificationLink(
  notification: Pick<
    Notification,
    "screenIdentifier" | "referenceType" | "referenceModuleId" | "params"
  >
): string | null {
  const id =
    notification.params?.id?.trim() ||
    notification.referenceModuleId?.trim() ||
    "";
  const businessUnitId = notification.params?.businessUnitId?.trim() || "";
  const screen = (notification.screenIdentifier ?? "").trim();
  const type = notification.referenceType;

  if (screen === "kpi-objectives" || type === "kpi-objectives") {
    const qs = new URLSearchParams();
    if (id) qs.set("kpi", id);
    if (businessUnitId) qs.set("unit", businessUnitId);
    const query = qs.toString();
    return query ? `/kpi-objectives?${query}` : "/kpi-objectives";
  }

  if (screen === "compliance" || type === "compliance") {
    return id ? `/compliance?control=${encodeURIComponent(id)}` : "/compliance";
  }

  if (
    screen === "document-repositories" ||
    screen === "document-management" ||
    type === "documents"
  ) {
    return id ? `/documents?node=${encodeURIComponent(id)}` : "/documents";
  }

  if (screen.includes("task") || type === "tasks") {
    return id ? `/tasks?task=${encodeURIComponent(id)}` : "/tasks";
  }

  if (screen.includes("risk") || type === "risks") {
    return id ? `/risks?risk=${encodeURIComponent(id)}` : "/risks";
  }

  if (screen.includes("incident") || type === "incidents") {
    return id
      ? `/incidents?incident=${encodeURIComponent(id)}`
      : "/incidents";
  }

  if (screen.includes("audit") || type === "audits") {
    return id ? `/audits?audit=${encodeURIComponent(id)}` : "/audits";
  }

  if (
    screen.includes("management-review") ||
    screen.includes("managementReview") ||
    type === "management-reviews"
  ) {
    return id
      ? `/management-reviews?review=${encodeURIComponent(id)}`
      : "/management-reviews";
  }

  if (screen.includes("ofi") || screen.includes("cip") || type === "ofi") {
    return id ? `/ofi?ofi=${encodeURIComponent(id)}` : "/ofi";
  }

  if (screen.includes("supplier") || type === "suppliers") {
    return id
      ? `/suppliers?supplier=${encodeURIComponent(id)}`
      : "/suppliers";
  }

  if (
    screen.includes("customer") ||
    screen.includes("crm") ||
    type === "customers"
  ) {
    return id
      ? `/customers?customer=${encodeURIComponent(id)}`
      : "/customers";
  }

  if (screen.includes("user") || type === "users") {
    return id ? `/users?user=${encodeURIComponent(id)}` : "/users";
  }

  if (type === "calendar") {
    return "/calendar";
  }

  if (type === "notifications") {
    return null;
  }

  return null;
}

export function formatNotificationTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
