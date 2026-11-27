/**
 * Live Compliance notifications.
 *
 * Routing (agreed defaults, see plan Phase 2):
 *   - Clause → Lapsed:          in-app + immediate email
 *   - Clause → At risk:         in-app
 *   - Clause → back to Sustained (from At risk / Lapsed): in-app
 *   - New advice, high:         in-app + immediate email
 *   - New advice, medium:       in-app
 *   - New advice, low / medium: daily digest email (open items, once a day)
 *
 * Every notification is driven by a change, so it fires once: transitions are
 * diffs of stored health, and advice is "new" only the first time its id is
 * seen. The first evaluation of an organisation is a baseline and notifies
 * nobody. Recipients are the clause's responsible / accountable users,
 * falling back to Super Admins and Heads of Service.
 */

import type { ComplianceDigestItem } from "../../../infrastructure/email/templates/catalog/compliance";
import { formatDay } from "../lib/dates";
import type {
  LiveComplianceContact,
  LiveComplianceEmailPort,
  LiveComplianceInAppNotification,
  LiveComplianceNotificationsPort,
  LiveComplianceRecipientsPort,
} from "../ports";
import {
  CLAUSE_HEALTH_LABELS,
  type AdviceItem,
  type AdviceSeverity,
} from "../types";
import type { ClauseTransition, RecalcResult } from "./live-compliance.service";

const MAX_TITLE = 120;
const MAX_MESSAGE = 150;
const DIGEST_MAX_ITEMS = 10;

const SEVERITY_LABELS: Record<AdviceSeverity, ComplianceDigestItem["severity"]> = {
  high: "High",
  med: "Medium",
  low: "Low",
};

function clip(text: string, max: number): string {
  const value = text.trim();
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

function standardsLabel(group: ClauseTransition[]): string {
  return `ISO ${group.map((t) => t.standard.replace("ISO ", "")).join(", ")}`;
}

export type LiveComplianceNotifierDeps = {
  notifications: LiveComplianceNotificationsPort;
  recipients: LiveComplianceRecipientsPort;
  email?: LiveComplianceEmailPort;
  /** Public frontend origin for email links (no trailing slash). */
  appUrl: string;
  logger?: { warn(obj: unknown, msg?: string): void };
};

export type NotifyOutcome = {
  inApp: number;
  emails: number;
  recipientUserIds: string[];
};

export type LiveComplianceNotifier = ReturnType<typeof createLiveComplianceNotifier>;

export function createLiveComplianceNotifier(deps: LiveComplianceNotifierDeps) {
  const overviewUrl = `${deps.appUrl}/compliance/live`;

  async function resolve(
    organizationId: string,
    ownerIds: string[],
    adminCache: { value?: LiveComplianceContact[] }
  ): Promise<LiveComplianceContact[]> {
    const unique = [...new Set(ownerIds)];
    if (unique.length) {
      const owners = await deps.recipients.contacts(organizationId, unique);
      if (owners.length) return owners;
    }
    adminCache.value ??= await deps.recipients.admins(organizationId);
    return adminCache.value;
  }

  async function sendAlert(
    organizationId: string,
    contact: LiveComplianceContact,
    dedupeKey: string,
    data: Parameters<LiveComplianceEmailPort["sendAlert"]>[0]["data"]
  ): Promise<boolean> {
    if (!deps.email || !contact.email) return false;
    try {
      await deps.email.sendAlert({ organizationId, to: contact.email, dedupeKey, data });
      return true;
    } catch (err) {
      deps.logger?.warn({ err, organizationId }, "live-compliance email failed");
      return false;
    }
  }

  return {
    /** Notify about one recalculation's transitions and new advice. */
    async handleRecalc(result: RecalcResult): Promise<NotifyOutcome> {
      const outcome: NotifyOutcome = { inApp: 0, emails: 0, recipientUserIds: [] };
      if (result.firstRun) return outcome;
      const org = result.organizationId;
      const adminCache: { value?: LiveComplianceContact[] } = {};
      const orgName = (await deps.recipients.organisationName(org)) ?? "iMS";
      const items: LiveComplianceInAppNotification[] = [];
      const alertedClauses = new Set<string>();

      // ── Clause transitions, grouped per clause + new status ──────────────
      const groups = new Map<string, ClauseTransition[]>();
      for (const t of result.transitions) {
        const key = `${t.clause}|${t.to}`;
        groups.set(key, [...(groups.get(key) ?? []), t]);
      }
      for (const group of groups.values()) {
        const t = group[0]!;
        const worsened = t.to === "risk" || t.to === "lapsed";
        const recovered =
          t.to === "sus" && (t.from === "risk" || t.from === "lapsed");
        if (!worsened && !recovered) continue;
        if (worsened) alertedClauses.add(t.clause);

        const emailIt = t.to === "lapsed";
        const headline = recovered
          ? `ISO ${t.clause} ${t.title} is back to Sustained`
          : `ISO ${t.clause} ${t.title} is now ${CLAUSE_HEALTH_LABELS[t.to]}`;
        const contacts = await resolve(
          org,
          group.flatMap((g) => g.ownerUserIds),
          adminCache
        );
        for (const contact of contacts) {
          let emailed = false;
          if (emailIt) {
            emailed = await sendAlert(org, contact, `lc:${org}:${t.clause}:lapsed:${result.evaluatedAt.toISOString().slice(0, 10)}:${contact.userId}`, {
              orgName,
              recipientName: contact.name,
              headline,
              detail: t.detail,
              clause: `${t.clause} ${t.title}`,
              standards: standardsLabel(group),
              status: CLAUSE_HEALTH_LABELS[t.to],
              ...(t.due ? { due: formatDay(t.due) } : {}),
              url: overviewUrl,
            });
          }
          if (emailed) outcome.emails += 1;
          items.push({
            recipientUserId: contact.userId,
            title: clip(headline, MAX_TITLE),
            message: clip(t.detail, MAX_MESSAGE),
            module: t.module,
            clause: t.clause,
            channels: emailed ? ["in_app", "email"] : ["in_app"],
          });
        }
      }

      // ── New advice (first time seen) ─────────────────────────────────────
      const byId = new Map(result.advice.map((a) => [a.id, a]));
      for (const id of result.newAdviceIds) {
        const advice = byId.get(id);
        if (!advice || advice.severity === "low") continue;
        // The clause alert above already covers this clause.
        if (alertedClauses.has(advice.clause)) continue;
        const contacts = await resolve(org, result.clauseOwners[advice.clause] ?? [], adminCache);
        for (const contact of contacts) {
          let emailed = false;
          if (advice.severity === "high") {
            emailed = await sendAlert(org, contact, `lc:${org}:advice:${advice.id}:${contact.userId}`, {
              orgName,
              recipientName: contact.name,
              headline: advice.title,
              detail: advice.why,
              clause: advice.clause || "Certification",
              standards: advice.standards.join(", "),
              status: "Action needed",
              ...(advice.due ? { due: formatDay(advice.due) } : {}),
              actionLabel: advice.action.label,
              url: adviceUrl(deps.appUrl, advice),
            });
          }
          if (emailed) outcome.emails += 1;
          items.push({
            recipientUserId: contact.userId,
            title: clip(advice.title, MAX_TITLE),
            message: clip(
              `${advice.clause ? `ISO ${advice.clause} · ` : ""}${advice.action.label}. ${advice.why}`,
              MAX_MESSAGE
            ),
            module: advice.module,
            clause: advice.clause,
            channels: emailed ? ["in_app", "email"] : ["in_app"],
          });
        }
      }

      if (items.length) {
        await deps.notifications.createForRecipients({ organizationId: org, items });
      }
      outcome.inApp = items.length;
      outcome.recipientUserIds = [...new Set(items.map((i) => i.recipientUserId))];
      return outcome;
    },

    /**
     * Daily digest of open medium / low advice, one email per recipient,
     * listing only the items for clauses they own (admins get unowned ones).
     */
    async sendDigest(input: {
      organizationId: string;
      day: string;
      advice: AdviceItem[];
      clauseOwners: Record<string, string[]>;
    }): Promise<{ emails: number }> {
      if (!deps.email) return { emails: 0 };
      const open = input.advice.filter((a) => a.severity !== "high");
      if (!open.length) return { emails: 0 };
      const org = input.organizationId;
      const orgName = (await deps.recipients.organisationName(org)) ?? "iMS";
      const adminCache: { value?: LiveComplianceContact[] } = {};

      const perRecipient = new Map<string, { contact: LiveComplianceContact; items: AdviceItem[] }>();
      for (const advice of open) {
        const contacts = await resolve(org, input.clauseOwners[advice.clause] ?? [], adminCache);
        for (const contact of contacts) {
          const entry = perRecipient.get(contact.userId) ?? { contact, items: [] };
          entry.items.push(advice);
          perRecipient.set(contact.userId, entry);
        }
      }

      let emails = 0;
      for (const { contact, items } of perRecipient.values()) {
        if (!contact.email) continue;
        try {
          await deps.email.sendDigest({
            organizationId: org,
            to: contact.email,
            dedupeKey: `lc:${org}:digest:${input.day}:${contact.userId}`,
            data: {
              orgName,
              recipientName: contact.name,
              total: items.length,
              items: items.slice(0, DIGEST_MAX_ITEMS).map((a) => ({
                title: a.title,
                clause: a.clause,
                severity: SEVERITY_LABELS[a.severity],
                ...(a.due ? { due: formatDay(a.due) } : {}),
              })),
              url: overviewUrl,
            },
          });
          emails += 1;
        } catch (err) {
          deps.logger?.warn({ err, organizationId: org }, "live-compliance digest email failed");
        }
      }
      return { emails };
    },
  };
}

/** Email link for an advice item: its deep link, else the overview. */
function adviceUrl(appUrl: string, advice: AdviceItem): string {
  if (advice.action.type === "navigate" && advice.action.href.startsWith("/")) {
    return `${appUrl}${advice.action.href}`;
  }
  return `${appUrl}/compliance/live`;
}
