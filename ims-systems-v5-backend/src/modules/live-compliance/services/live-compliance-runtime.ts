/**
 * Live Compliance runtime — keeps clause health current without a reader.
 *
 * - Record changes: `record.changed` events are debounced per organisation
 *   (a burst of edits → one recalculation).
 * - Hourly sweep: every organisation with an ISO 9001/14001/45001 toolkit is
 *   recalculated so date-based rules (expiries, due dates) fire on time.
 * - Daily digest: from DIGEST_HOUR (server local time), once per day per
 *   organisation (claimed atomically, so safe across restarts/instances).
 *
 * Mirrors the setInterval pattern of the training / ASL chase schedules.
 */

import type { EventBus } from "../../../infrastructure/events/event-bus";
import { isoDay } from "../lib/dates";
import type { LiveComplianceRepository } from "../repositories/live-compliance.repository";
import type { LiveComplianceNotifier } from "./live-compliance-notifier";
import type { LiveComplianceService } from "./live-compliance.service";

export const DEFAULT_DEBOUNCE_MS = 2_000;
export const DEFAULT_SWEEP_INTERVAL_MS = 60 * 60 * 1000;
export const DEFAULT_DIGEST_HOUR = 8;
const FIRST_SWEEP_DELAY_MS = 30_000;

type Logger = {
  info(obj: unknown, msg?: string): void;
  warn(obj: unknown, msg?: string): void;
  error(obj: unknown, msg?: string): void;
};

export type LiveComplianceRuntimeDeps = {
  service: LiveComplianceService;
  repository: LiveComplianceRepository;
  notifier?: LiveComplianceNotifier;
  bus?: EventBus;
  /** Organisations with any live standard provisioned. */
  listOrganizationIds: () => Promise<string[]>;
  debounceMs?: number;
  sweepIntervalMs?: number;
  digestHour?: number;
  now?: () => Date;
  logger?: Logger;
};

export type LiveComplianceRuntime = ReturnType<typeof createLiveComplianceRuntime>;

export function createLiveComplianceRuntime(deps: LiveComplianceRuntimeDeps) {
  const debounceMs = deps.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const sweepIntervalMs = deps.sweepIntervalMs ?? DEFAULT_SWEEP_INTERVAL_MS;
  const digestHour = deps.digestHour ?? DEFAULT_DIGEST_HOUR;
  const now = deps.now ?? (() => new Date());
  const pending = new Map<string, ReturnType<typeof setTimeout>>();
  let detach: (() => void) | null = null;
  let interval: ReturnType<typeof setInterval> | null = null;
  let firstSweep: ReturnType<typeof setTimeout> | null = null;

  async function recalcAfterChange(organizationId: string): Promise<void> {
    try {
      // A recalc already in flight may have read data from before the change;
      // recalc() returns that run, so go again if it was not ours.
      const result = await deps.service.recalc(organizationId, "event");
      if (result.source !== "event") {
        await deps.service.recalc(organizationId, "event");
      }
    } catch (err) {
      deps.logger?.warn({ err, organizationId }, "live-compliance event recalc failed");
    }
  }

  function schedule(organizationId: string): void {
    const existing = pending.get(organizationId);
    if (existing) clearTimeout(existing);
    pending.set(
      organizationId,
      setTimeout(() => {
        pending.delete(organizationId);
        void recalcAfterChange(organizationId);
      }, debounceMs)
    );
  }

  async function maybeSendDigest(organizationId: string, at: Date): Promise<void> {
    if (!deps.notifier || at.getHours() < digestHour) return;
    const day = isoDay(at);
    if (!(await deps.repository.claimDigest(organizationId, day))) return;
    const open = await deps.service.openAdviceForOrganization(organizationId);
    const { emails } = await deps.notifier.sendDigest({
      organizationId,
      day,
      advice: open.advice,
      clauseOwners: open.clauseOwners,
    });
    if (emails) {
      deps.logger?.info({ organizationId, emails }, "Live compliance digest sent");
    }
  }

  async function sweep(): Promise<{ organisations: number; failed: number }> {
    let failed = 0;
    const organizationIds = await deps.listOrganizationIds();
    for (const organizationId of organizationIds) {
      try {
        await deps.service.recalc(organizationId, "schedule");
        await maybeSendDigest(organizationId, now());
      } catch (err) {
        failed += 1;
        deps.logger?.error({ err, organizationId }, "Live compliance sweep failed");
      }
    }
    return { organisations: organizationIds.length, failed };
  }

  return {
    /** Subscribe to record changes (idempotent). */
    attach(): void {
      if (detach || !deps.bus) return;
      detach = deps.bus.on("record.changed", (event) => schedule(event.organizationId));
    },

    sweep,

    /** Run debounced recalcs now (tests / graceful shutdown). */
    async flush(): Promise<void> {
      const orgs = [...pending.keys()];
      for (const org of orgs) clearTimeout(pending.get(org)!);
      pending.clear();
      await Promise.all(orgs.map(recalcAfterChange));
    },

    pendingCount(): number {
      return pending.size;
    },

    start(): void {
      this.attach();
      if (interval) return;
      firstSweep = setTimeout(() => void sweep(), FIRST_SWEEP_DELAY_MS);
      interval = setInterval(() => void sweep(), sweepIntervalMs);
      deps.logger?.info({ sweepIntervalMs, digestHour }, "Live compliance schedule started");
    },

    stop(): void {
      detach?.();
      detach = null;
      if (interval) clearInterval(interval);
      if (firstSweep) clearTimeout(firstSweep);
      interval = null;
      firstSweep = null;
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    },
  };
}
