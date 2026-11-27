/**
 * Live Compliance application service.
 *
 * recalc(org): collect a snapshot of module data → evaluate clause rules →
 * diff against stored health → persist changes (+ activity entries for
 * transitions) → rebuild advice. Phase 1 recalculates lazily on read when
 * the last evaluation is older than STALE_MS, and synchronously after
 * one-click actions.
 */

import type { Authorizer, SecurityIdentity } from "../../../security";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import type {
  ComplianceToolkitName,
  ControlHealth,
  ControlHealthRow,
} from "../../compliance";
import { buildAdvice } from "../lib/advice-rules";
import {
  JOURNEY_CLAUSES,
  JOURNEY_STEPS,
  buildJourney,
  type JourneyResponse,
} from "../lib/journey";
import { CLAUSE_RULES, evaluateClauses } from "../lib/clause-rules";
import { isoDay } from "../lib/dates";
import { manualStateToHealth, percentageOf, summariseStandard, worstStatus } from "../lib/health";
import type {
  AdviceCommandRegistry,
  LiveClauseStorePort,
  SnapshotCollectorPort,
} from "../ports";
import type { LiveComplianceRepository } from "../repositories/live-compliance.repository";
import {
  CLAUSE_HEALTH_LABELS,
  LIVE_COMPLIANCE_RESOURCE,
  LIVE_MODULE_NAMES,
  LIVE_STANDARDS,
  isLiveStandard,
  type ActionBucket,
  type ActionCentreItem,
  type ActionCentreResponse,
  type AdviceItem,
  type ClauseHealthStatus,
  type ComplianceSnapshot,
  type LiveActivity,
  type LiveClause,
  type LiveHealthResponse,
  type LiveModule,
  type LiveStandard,
  type ModuleHealthResponse,
} from "../types";

/**
 * Re-evaluate on read when the cached evaluation is older than this.
 * Phase 1 has no change events, so keep it short; Phase 2 invalidates on
 * record changes and can raise it.
 */
export const DEFAULT_STALE_MS = 30_000;
export const DEFAULT_SNOOZE_DAYS = 7;

/**
 * Clauses shown in live health that have no rule: they report the manual
 * toolkit state (prototype: scope 4.3 and documented information 7.5).
 */
export const MANUAL_CLAUSES: Array<{ clause: string; module: LiveModule }> = [
  { clause: "4.3", module: "compliance" },
  { clause: "7.5", module: "compliance" },
];

export function emptySnapshot(today: string, standards: LiveStandard[]): ComplianceSnapshot {
  return {
    today,
    standards,
    training: { tracked: false, peopleCount: 0, gaps: [], rolesWithoutRequirements: [], acknowledgements: [] },
    inventory: { tracked: false, assetCount: 0, checks: [] },
    audits: {
      tracked: false,
      auditCount: 0,
      lastCompletedOn: null,
      programme: null,
      audited: {},
      planned: {},
      findings: [],
      findingsTracked: false,
    },
    risks: { tracked: false, reviewTracked: false, items: [], reviewedPatternAreas: [] },
    incidents: { tracked: false, detailTracked: false, items: [] },
    reviews: {
      tracked: false,
      lastHeld: null,
      intervalMonths: null,
      scheduled: null,
      inputsTracked: false,
      inputs: [],
      actions: [],
    },
    objectives: { tracked: false, count: 0 },
    legal: { tracked: false, lastReviewedOn: null, reviewIntervalMonths: 12, duties: [] },
    documents: { tracked: false, items: [] },
    suppliers: { tracked: false, items: [] },
    certificates: { tracked: false, items: [] },
    evidence: { tracked: false, missing: [] },
  };
}

export type ClauseTransition = {
  standard: LiveStandard;
  clause: string;
  title: string;
  module: LiveModule | null;
  from: ClauseHealthStatus | null;
  to: ClauseHealthStatus;
  detail: string;
  due: string | null;
  /** Responsible / accountable users on the clause row. */
  ownerUserIds: string[];
};

export type RecalcResult = {
  organizationId: string;
  source: string;
  evaluatedAt: Date;
  standards: LiveStandard[];
  transitions: ClauseTransition[];
  newAdviceIds: string[];
  /**
   * True when no clause had stored health before this run (first evaluation
   * for the organisation). Notifiers treat it as a baseline, not as news.
   */
  firstRun: boolean;
  /** Stored health or the advice list changed in this run. */
  changed: boolean;
  /** Every current advice item (snoozed included). */
  advice: AdviceItem[];
  /** clause → responsible / accountable user ids across standards. */
  clauseOwners: Record<string, string[]>;
};

export type RecalcListener = (result: RecalcResult) => void | Promise<void>;

type OrgCache = {
  evaluatedAt: Date;
  standards: LiveStandard[];
  advice: AdviceItem[];
  clauses: LiveClause[];
  clauseOwners: Record<string, string[]>;
  /** Module data the last evaluation used (ALICE context). */
  snapshot: ComplianceSnapshot | null;
};

export type LiveComplianceServiceDeps = {
  authorizer: Authorizer;
  repository: LiveComplianceRepository;
  clauses: LiveClauseStorePort;
  collectors: SnapshotCollectorPort[];
  commands?: AdviceCommandRegistry;
  /** Injectable clock for tests. */
  now?: () => Date;
  /** Cache lifetime for lazy recalculation (default DEFAULT_STALE_MS). */
  staleMs?: number;
  logger?: { warn(obj: unknown, msg?: string): void };
  /** Called after every recalculation (notifications, live stream). */
  onRecalculated?: RecalcListener[];
  /** Admin check for the action centre (unowned items go to admins). */
  people?: { isAdmin(organizationId: string, userId: string): Promise<boolean> };
};

/** Days ahead that count as "due this week" in the action centre. */
export const ACTION_WEEK_DAYS = 7;

export function actionBucket(item: AdviceItem, today: string): ActionBucket {
  if (!item.due) return item.severity === "high" ? "now" : "later";
  if (item.due < today) return "now";
  const days = Math.round(
    (Date.parse(`${item.due}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000
  );
  return days <= ACTION_WEEK_DAYS ? "week" : "later";
}

function requireOrgIdentity(identity: SecurityIdentity | null | undefined): {
  identity: SecurityIdentity;
  organizationId: string;
  subjectId: string;
} {
  if (!identity?.subjectId) throw new UnauthorizedError();
  if (!identity.organizationId) {
    throw new ForbiddenError("Organisation context is required");
  }
  return {
    identity,
    organizationId: identity.organizationId,
    subjectId: identity.subjectId,
  };
}

const RULE_BY_CLAUSE = new Map(CLAUSE_RULES.map((r) => [r.clause, r]));

function moduleForClause(clause: string): LiveModule | null {
  return (
    RULE_BY_CLAUSE.get(clause)?.module ??
    MANUAL_CLAUSES.find((m) => m.clause === clause)?.module ??
    null
  );
}

function sameHealth(a: ControlHealth | null, b: ControlHealth): boolean {
  return Boolean(
    a && a.status === b.status && a.detail === b.detail && (a.due ?? null) === (b.due ?? null)
  );
}

function ownersOf(row: ControlHealthRow): string[] {
  return [row.responsibleUserId, row.accountableUserId].filter(
    (id): id is string => Boolean(id)
  );
}

function compareClause(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true });
}

export type LiveComplianceService = ReturnType<typeof createLiveComplianceService>;

export function createLiveComplianceService(deps: LiveComplianceServiceDeps) {
  const { authorizer, repository, clauses: clauseStore, collectors } = deps;
  const commands = deps.commands ?? {};
  const now = deps.now ?? (() => new Date());
  const staleMs = deps.staleMs ?? DEFAULT_STALE_MS;
  const cache = new Map<string, OrgCache>();
  const inFlight = new Map<string, Promise<RecalcResult>>();
  const listeners: RecalcListener[] = [...(deps.onRecalculated ?? [])];

  function notifyListeners(result: RecalcResult): void {
    for (const listener of listeners) {
      Promise.resolve()
        .then(() => listener(result))
        .catch((err) =>
          deps.logger?.warn(
            { err, organizationId: result.organizationId },
            "live-compliance recalc listener failed"
          )
        );
    }
  }

  async function assertAllowed(
    identity: SecurityIdentity,
    action: "read" | "update"
  ): Promise<void> {
    const allowed = await authorizer.allow({
      identity,
      action,
      resourceType: LIVE_COMPLIANCE_RESOURCE,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError("User does not have permission to access Compliance");
    }
  }

  async function standardsInScope(organizationId: string): Promise<LiveStandard[]> {
    const provisioned = await clauseStore.provisionedToolkits(organizationId);
    return LIVE_STANDARDS.filter((s) => provisioned.includes(s));
  }

  async function collectSnapshot(
    organizationId: string,
    today: string,
    standards: LiveStandard[]
  ): Promise<ComplianceSnapshot> {
    const snapshot = emptySnapshot(today, standards);
    const results = await Promise.allSettled(
      collectors.map((c) => c.collect(organizationId, today))
    );
    for (const result of results) {
      if (result.status === "fulfilled") {
        Object.assign(snapshot, result.value);
      } else {
        deps.logger?.warn(
          { err: result.reason, organizationId },
          "live-compliance collector failed; module reported as not tracked"
        );
      }
    }
    return snapshot;
  }

  function toLiveClause(row: ControlHealthRow, health: ControlHealth): LiveClause {
    return {
      id: row.id,
      standard: row.name as LiveStandard,
      clause: row.clause,
      title: row.title,
      module: moduleForClause(row.clause),
      live: Boolean(health.ruleId),
      status: health.status,
      detail: health.detail,
      due: health.due,
      evaluatedAt: health.evaluatedAt.toISOString(),
    };
  }

  async function recalcNow(organizationId: string, source: string): Promise<RecalcResult> {
    const at = now();
    const today = isoDay(at);
    const standards = await standardsInScope(organizationId);
    if (!standards.length) {
      cache.set(organizationId, {
        evaluatedAt: at,
        standards,
        advice: [],
        clauses: [],
        clauseOwners: {},
        snapshot: null,
      });
      return {
        organizationId,
        source,
        evaluatedAt: at,
        standards,
        transitions: [],
        newAdviceIds: [],
        firstRun: false,
        changed: false,
        advice: [],
        clauseOwners: {},
      };
    }

    const snapshot = await collectSnapshot(organizationId, today, standards);
    const evaluations = evaluateClauses(snapshot);
    const clauseIds = [
      ...new Set([...CLAUSE_RULES.map((r) => r.clause), ...MANUAL_CLAUSES.map((m) => m.clause)]),
    ];
    const rows = await clauseStore.listRows(
      organizationId,
      standards as ComplianceToolkitName[],
      clauseIds
    );

    const updates: Array<{ id: string; health: ControlHealth }> = [];
    const transitions: ClauseTransition[] = [];
    const liveClauses: LiveClause[] = [];
    const owners = new Map<string, Set<string>>();
    let hadHealth = false;

    for (const row of rows) {
      if (!isLiveStandard(row.name)) continue;
      if (row.health) hadHealth = true;
      const evaluation = evaluations.get(`${row.name}|${row.clause}`);
      const isManual = MANUAL_CLAUSES.some((m) => m.clause === row.clause);
      if (!evaluation && !isManual) continue; // rule not applicable to this standard
      const rowOwners = ownersOf(row);
      const clauseOwnerSet = owners.get(row.clause) ?? new Set<string>();
      rowOwners.forEach((id) => clauseOwnerSet.add(id));
      owners.set(row.clause, clauseOwnerSet);

      const next: ControlHealth = evaluation
        ? {
            status: evaluation.status,
            detail: evaluation.detail,
            due: evaluation.due ?? null,
            ruleId: evaluation.rule.id,
            evaluatedAt: at,
          }
        : {
            status: manualStateToHealth(row.state),
            detail: row.state === "Implemented" ? "Marked implemented in the toolkit" : "Not marked implemented in the toolkit",
            due: null,
            ruleId: null,
            evaluatedAt: at,
          };

      if (!sameHealth(row.health, next)) {
        updates.push({ id: row.id, health: next });
        if (row.health && row.health.status !== next.status) {
          transitions.push({
            standard: row.name,
            clause: row.clause,
            title: row.title,
            module: moduleForClause(row.clause),
            from: row.health.status,
            to: next.status,
            detail: next.detail,
            due: next.due ?? null,
            ownerUserIds: rowOwners,
          });
        }
      }
      liveClauses.push(toLiveClause(row, sameHealth(row.health, next) ? row.health! : next));
    }

    await clauseStore.applyHealth(organizationId, updates);
    await repository.addActivity(organizationId, transitionActivity(transitions, at));

    const advice = buildAdvice(snapshot);
    const newAdviceIds = await repository.syncAdvice(organizationId, advice, at);

    liveClauses.sort(
      (a, b) => compareClause(a.clause, b.clause) || a.standard.localeCompare(b.standard)
    );
    const previous = cache.get(organizationId);
    const adviceSignature = (items: AdviceItem[]) =>
      items.map((a) => `${a.id}:${a.due ?? ""}:${a.severity}`).join("|");
    const changed =
      updates.length > 0 ||
      !previous ||
      adviceSignature(previous.advice) !== adviceSignature(advice);
    const clauseOwners = Object.fromEntries(
      [...owners.entries()].map(([clause, set]) => [clause, [...set]])
    );
    cache.set(organizationId, {
      evaluatedAt: at,
      standards,
      advice,
      clauses: liveClauses,
      clauseOwners,
      snapshot,
    });
    const result: RecalcResult = {
      organizationId,
      source,
      evaluatedAt: at,
      standards,
      transitions,
      newAdviceIds,
      firstRun: rows.length > 0 && !hadHealth,
      changed,
      advice,
      clauseOwners,
    };
    notifyListeners(result);
    return result;
  }

  /** One activity line per clause transition (grouped across standards). */
  function transitionActivity(transitions: ClauseTransition[], at: Date) {
    const grouped = new Map<string, ClauseTransition[]>();
    for (const t of transitions) {
      const key = `${t.clause}|${t.to}`;
      grouped.set(key, [...(grouped.get(key) ?? []), t]);
    }
    return [...grouped.values()].map((group) => {
      const t = group[0]!;
      const standards = group.map((g) => g.standard.replace("ISO ", "")).join(", ");
      const change =
        t.to === "sus" ? "back to Sustained" : `now ${CLAUSE_HEALTH_LABELS[t.to]}`;
      return {
        source: "Compliance",
        text: `Clause ${t.clause} ${t.title} is ${change} (ISO ${standards}). ${t.detail}`,
        at,
        clause: t.clause,
      };
    });
  }

  /** Recalculate (deduplicating concurrent calls per organisation). */
  function recalc(organizationId: string, source = "manual"): Promise<RecalcResult> {
    const running = inFlight.get(organizationId);
    if (running) return running;
    const promise = recalcNow(organizationId, source).finally(() => {
      inFlight.delete(organizationId);
    });
    inFlight.set(organizationId, promise);
    return promise;
  }

  async function fresh(organizationId: string): Promise<OrgCache> {
    const cached = cache.get(organizationId);
    if (cached && now().getTime() - cached.evaluatedAt.getTime() < staleMs) {
      return cached;
    }
    await recalc(organizationId, "read");
    return cache.get(organizationId)!;
  }

  async function visibleAdvice(organizationId: string, advice: AdviceItem[]) {
    const states = new Map(
      (await repository.listAdviceStates(organizationId)).map((s) => [s.adviceId, s])
    );
    const at = now();
    return advice.filter((a) => {
      const until = states.get(a.id)?.snoozedUntil;
      return !until || until <= at;
    });
  }

  return {
    recalc,

    /** Register a listener for every recalculation (stream, notifier). */
    onRecalculated(listener: RecalcListener): () => void {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
      };
    },

    /**
     * Trusted (no HTTP identity): current open advice for an organisation,
     * snoozed items removed. Used by the daily digest.
     */
    async openAdviceForOrganization(organizationId: string): Promise<{
      advice: AdviceItem[];
      clauseOwners: Record<string, string[]>;
    }> {
      const state = await fresh(organizationId);
      return {
        advice: await visibleAdvice(organizationId, state.advice),
        clauseOwners: state.clauseOwners,
      };
    },

    /**
     * Action centre: every open item the user should act on, grouped by
     * urgency. "mine" = items whose record or clause the user owns, plus
     * unowned items when the user is an admin. Admins may ask for "all".
     */
    async actionCentre(
      identity: SecurityIdentity | null | undefined,
      requested: "mine" | "all" = "mine"
    ): Promise<ActionCentreResponse> {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "read");
      const state = await fresh(ctx.organizationId);
      const isAdmin = deps.people
        ? await deps.people.isAdmin(ctx.organizationId, ctx.subjectId)
        : true;
      const scope = requested === "all" && isAdmin ? "all" : "mine";
      const today = isoDay(now());

      const visible = await visibleAdvice(ctx.organizationId, state.advice);
      const items: ActionCentreItem[] = visible
        .filter((item) => {
          if (scope === "all") return true;
          const owners = new Set([
            ...(item.ownerUserIds ?? []),
            ...(state.clauseOwners[item.clause] ?? []),
          ]);
          return owners.has(ctx.subjectId) || (!owners.size && isAdmin);
        })
        .map((item) => ({ ...item, bucket: actionBucket(item, today) }));

      const counts = { now: 0, week: 0, later: 0, total: items.length };
      for (const item of items) counts[item.bucket] += 1;

      return {
        evaluatedAt: state.evaluatedAt.toISOString(),
        scope,
        counts,
        readiness: state.standards.map((standard) => {
          const summary = summariseStandard(
            standard,
            state.clauses.filter((c) => c.standard === standard)
          );
          return {
            standard,
            percentage: summary.percentage,
            atRisk: summary.atRisk,
            lapsed: summary.lapsed,
            worst: summary.worst,
          };
        }),
        items,
      };
    },

    /**
     * Trusted (caller authorises): the latest evaluation for ALICE task
     * context — snapshot, clause health and open advice.
     */
    async contextForOrganization(organizationId: string): Promise<{
      today: string;
      standards: LiveStandard[];
      snapshot: ComplianceSnapshot;
      clauses: LiveClause[];
      advice: AdviceItem[];
    }> {
      const state = await fresh(organizationId);
      return {
        today: isoDay(now()),
        standards: state.standards,
        snapshot: state.snapshot ?? emptySnapshot(isoDay(now()), state.standards),
        clauses: state.clauses,
        advice: await visibleAdvice(organizationId, state.advice),
      };
    },

    /** "Get ready for ISO": 12 steps, auto-completed from clause status. */
    async journey(identity: SecurityIdentity | null | undefined): Promise<JourneyResponse> {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "read");
      const state = await fresh(ctx.organizationId);
      const rows = await clauseStore.listRows(
        ctx.organizationId,
        state.standards as ComplianceToolkitName[],
        JOURNEY_CLAUSES
      );
      const live = new Map(state.clauses.map((c) => [`${c.standard}|${c.clause}`, c.status]));
      const states = rows
        .filter((r) => isLiveStandard(r.name))
        .map((r) => ({
          clause: r.clause,
          standard: r.name,
          status: live.get(`${r.name}|${r.clause}`) ?? r.health?.status ?? manualStateToHealth(r.state),
        }));
      const percentages = state.standards.map(
        (s) => summariseStandard(s, state.clauses.filter((c) => c.standard === s)).percentage
      );
      return buildJourney(states, await repository.journeyCompleted(ctx.organizationId), percentages);
    },

    async setJourneyStep(
      identity: SecurityIdentity | null | undefined,
      stepId: string,
      done: boolean
    ): Promise<JourneyResponse> {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "update");
      const step = JOURNEY_STEPS.find((s) => s.id === stepId);
      if (!step) throw new NotFoundError("Journey step not found");
      await repository.setJourneyStep(ctx.organizationId, stepId, done);
      if (done) {
        await repository.addActivity(ctx.organizationId, [
          { source: "Journey", text: `Step completed: ${step.title}`, at: now(), actorUserId: ctx.subjectId },
        ]);
      }
      return this.journey(identity);
    },

    /** Authorise a live-stream subscriber; returns its organisation scope. */
    async streamAccess(
      identity: SecurityIdentity | null | undefined
    ): Promise<{ organizationId: string; subjectId: string }> {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "read");
      return { organizationId: ctx.organizationId, subjectId: ctx.subjectId };
    },

    /** Drop cached evaluation so the next read recalculates (tests / events). */
    invalidate(organizationId: string): void {
      cache.delete(organizationId);
    },

    async health(
      identity: SecurityIdentity | null | undefined,
      standard?: string
    ): Promise<LiveHealthResponse> {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "read");
      if (standard && !isLiveStandard(standard)) {
        throw new ValidationAppError(`Unknown standard: ${standard}`);
      }
      const state = await fresh(ctx.organizationId);
      const standards = standard
        ? state.standards.filter((s) => s === standard)
        : state.standards;
      const clauses = state.clauses.filter((c) => standards.includes(c.standard));
      return {
        evaluatedAt: state.evaluatedAt.toISOString(),
        standards: standards.map((s) => summariseStandard(s, clauses)),
        clauses,
      };
    },

    async moduleHealth(
      identity: SecurityIdentity | null | undefined,
      module: LiveModule
    ): Promise<ModuleHealthResponse> {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "read");
      const state = await fresh(ctx.organizationId);
      const clauses = state.clauses.filter((c) => c.module === module);
      const statuses = clauses.map((c) => c.status);
      return {
        module,
        name: LIVE_MODULE_NAMES[module],
        percentage: percentageOf(statuses),
        worst: worstStatus(statuses),
        clauses,
      };
    },

    async advice(
      identity: SecurityIdentity | null | undefined,
      query: { module?: LiveModule; limit?: number }
    ): Promise<{ items: AdviceItem[]; total: number }> {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "read");
      const state = await fresh(ctx.organizationId);
      const visible = (await visibleAdvice(ctx.organizationId, state.advice)).filter(
        (a) => !query.module || a.module === query.module
      );
      return { items: visible.slice(0, query.limit ?? 3), total: visible.length };
    },

    async snooze(
      identity: SecurityIdentity | null | undefined,
      adviceId: string,
      days = DEFAULT_SNOOZE_DAYS
    ): Promise<{ adviceId: string; snoozedUntil: string }> {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "update");
      const until = new Date(now().getTime() + days * 86_400_000);
      const ok = await repository.snooze(ctx.organizationId, adviceId, until, ctx.subjectId);
      if (!ok) throw new NotFoundError("Advice item not found");
      return { adviceId, snoozedUntil: until.toISOString() };
    },

    async runAction(
      identity: SecurityIdentity | null | undefined,
      adviceId: string
    ): Promise<{ message: string }> {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "read");
      const state = await fresh(ctx.organizationId);
      const item = state.advice.find((a) => a.id === adviceId);
      if (!item) throw new NotFoundError("Advice item not found or already resolved");
      if (item.action.type !== "execute") {
        throw new ValidationAppError("This advice item is completed in its module");
      }
      const handler = commands[item.action.command];
      if (!handler) {
        throw new ValidationAppError(`Action "${item.action.label}" is not available yet`);
      }
      const result = await handler({
        identity: ctx.identity,
        organizationId: ctx.organizationId,
        ref: item.action.ref,
      });
      await repository.addActivity(ctx.organizationId, [
        { source: result.source, text: result.message, at: now(), actorUserId: ctx.subjectId, clause: item.clause },
      ]);
      await recalc(ctx.organizationId, "action");
      return { message: result.message };
    },

    async activity(
      identity: SecurityIdentity | null | undefined,
      limit = 10
    ): Promise<LiveActivity[]> {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "read");
      return repository.listActivity(ctx.organizationId, limit);
    },
  };
}
