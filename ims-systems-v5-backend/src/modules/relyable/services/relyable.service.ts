/**
 * Relyable application service — rating, evidence ledger, sync.
 */
import type { Authorizer, SecurityIdentity } from "../../../security";
import {
  ForbiddenError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import {
  BANDS,
  DOMAINS,
  MODEL_VERSION,
  TYPES,
  compute,
  contributions,
  evidenceLabel,
  nextRisks,
  raiseIt,
  registerEvidenceFromFacts,
} from "../lib/relyable-rules";
import type {
  RelyableEvidenceCollectorPort,
  RelyableOrgPort,
} from "../ports";
import type { RelyableEvidenceRepository } from "../repositories/relyable-evidence.repository";
import type { RelyableSettingsRepository } from "../repositories/relyable-settings.repository";
import type { RelyableSnapshotRepository } from "../repositories/relyable-snapshot.repository";
import {
  RELYABLE_RESOURCE,
  type EmitEvidenceInput,
  type RelyableDashboard,
  type RelyableSettings,
  type RelyableSnapshot,
  type RelyableSyncResult,
  type UpdateRelyableScopeInput,
  type UpdateRelyableSettingsInput,
} from "../types";

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

export type RelyableServiceDeps = {
  settings: RelyableSettingsRepository;
  evidence: RelyableEvidenceRepository;
  snapshots: RelyableSnapshotRepository;
  authorizer: Authorizer;
  collectors?: RelyableEvidenceCollectorPort[];
  org?: RelyableOrgPort;
};

export type RelyableService = ReturnType<typeof createRelyableService>;

export function createRelyableService(deps: RelyableServiceDeps) {
  const collectors = deps.collectors ?? [];

  async function assertAllowed(
    identity: SecurityIdentity,
    action: "read" | "create" | "update" | "manage"
  ) {
    const allowed = await deps.authorizer.allow({
      identity,
      action,
      resourceType: RELYABLE_RESOURCE,
      organizationId: identity.organizationId!,
    });
    if (!allowed) throw new ForbiddenError();
  }

  async function ensureSnapshot(
    organizationId: string,
    reason: string
  ): Promise<{ settings: RelyableSettings; snapshot: RelyableSnapshot; chainValid: boolean }> {
    const settings = await deps.settings.getOrCreate(organizationId);
    const current = await deps.evidence.current(organizationId);
    const now = new Date();
    const registerItems = registerEvidenceFromFacts(
      settings.facts,
      now.toISOString().slice(0, 10)
    );
    const merged = [
      ...current.map((e) => ({
        type: e.type,
        status: e.status,
        observedAt: e.observedAt,
        validUntil: e.validUntil,
        payload: e.payload,
        level: e.level,
        disputed: e.disputed,
      })),
      // Register facts always overlay for scoring when not already present as newer
      ...registerItems.filter(
        (r) => !current.some((c) => c.type === r.type && c.source.startsWith("module:"))
      ),
    ];
    const result = compute({
      scope: settings.scope,
      items: merged,
      now,
      facts: settings.facts,
    });
    const snapshot = await deps.snapshots.create(organizationId, result, reason);
    const chainValid = await deps.evidence.verifyChain(organizationId);
    return { settings, snapshot, chainValid };
  }

  async function buildDashboard(
    organizationId: string,
    opts?: { recompute?: boolean; reason?: string }
  ): Promise<RelyableDashboard> {
    const settings = await deps.settings.getOrCreate(organizationId);
    let snapshot = await deps.snapshots.latest(organizationId);
    let chainValid = true;

    if (!snapshot || opts?.recompute) {
      const ensured = await ensureSnapshot(
        organizationId,
        opts?.reason ?? "dashboard"
      );
      snapshot = ensured.snapshot;
      chainValid = ensured.chainValid;
    } else {
      chainValid = await deps.evidence.verifyChain(organizationId);
    }

    const current = await deps.evidence.current(organizationId);
    const scoreItems = current.map((e) => ({
      type: e.type,
      status: e.status,
      observedAt: e.observedAt,
      validUntil: e.validUntil,
      payload: e.payload,
      level: e.level,
      disputed: e.disputed,
    }));
    // Prefer persisted snapshot fields; rebuild helpers from current ledger
    const live = compute({
      scope: settings.scope,
      items: [
        ...scoreItems,
        ...registerEvidenceFromFacts(
          settings.facts,
          new Date().toISOString().slice(0, 10)
        ).filter((r) => !scoreItems.some((c) => c.type === r.type)),
      ],
      facts: settings.facts,
    });
    const contrib = contributions(live, settings.scope);
    const raise = raiseIt({
      scope: settings.scope,
      items: scoreItems,
      facts: settings.facts,
    });
    const risks = nextRisks({ scope: settings.scope, items: scoreItems });

    const weekAgo = await deps.snapshots.weekAgo(organizationId);
    const weekDelta =
      weekAgo != null ? snapshot.score - weekAgo.score : null;

    const registerTypes = [
      "register.companies-house",
      "register.directors",
      "register.gazette",
      "register.hse",
      "fin.accounts",
      "safety.riddor",
    ];
    let clear = 0;
    for (const t of registerTypes) {
      const item = scoreItems.find((e) => e.type === t);
      const adverse =
        settings.facts.accountsOverdue && t === "fin.accounts"
          ? true
          : settings.facts.insolvency && t === "register.gazette"
            ? true
            : settings.facts.enforcement && t === "register.hse"
              ? true
              : settings.facts.disqualifiedDirector &&
                  t === "register.directors"
                ? true
                : settings.facts.riddorOpen && t === "safety.riddor"
                  ? true
                  : item?.status === "adverse" || item?.status === "fail";
      if (!adverse) clear += 1;
    }

    return {
      rating: snapshot.score,
      band: snapshot.band,
      bandName: snapshot.bandName,
      tier: snapshot.tier,
      verifiedRatio: snapshot.verifiedRatio,
      domains: snapshot.domains,
      caps: snapshot.caps,
      scope: settings.scope,
      listedCertifications: settings.listedCertifications,
      modelVersion: snapshot.modelVersion,
      computedAt: snapshot.computedAt,
      lastSyncedAt: settings.lastSyncedAt,
      weekDelta,
      weekDeltaReason:
        weekDelta != null && weekDelta !== 0
          ? weekDelta > 0
            ? `+${weekDelta} this week`
            : `${weekDelta} this week`
          : null,
      modules: contrib.modules,
      raiseIt: raise,
      nextRisks: risks,
      riskIndicators: { clear, total: registerTypes.length },
      chainValid,
    };
  }

  return {
    async getSettings(identity: SecurityIdentity | null | undefined) {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "read");
      return deps.settings.getOrCreate(ctx.organizationId);
    },

    async updateSettings(
      identity: SecurityIdentity | null | undefined,
      input: UpdateRelyableSettingsInput
    ) {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "manage");
      const settings = await deps.settings.update(
        ctx.organizationId,
        input,
        ctx.subjectId
      );
      await ensureSnapshot(ctx.organizationId, "settings-update");
      return settings;
    },

    async updateScope(
      identity: SecurityIdentity | null | undefined,
      input: UpdateRelyableScopeInput
    ) {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "manage");
      const settings = await deps.settings.updateScope(
        ctx.organizationId,
        input,
        ctx.subjectId
      );
      await ensureSnapshot(ctx.organizationId, "scope-update");
      return settings;
    },

    async getDashboard(identity: SecurityIdentity | null | undefined) {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "read");
      return buildDashboard(ctx.organizationId);
    },

    async getRating(identity: SecurityIdentity | null | undefined) {
      const dash = await this.getDashboard(identity);
      return {
        rating: dash.rating,
        band: dash.band,
        bandName: dash.bandName,
        tier: dash.tier,
        verifiedRatio: dash.verifiedRatio,
        domains: dash.domains,
        caps: dash.caps,
        scope: dash.scope,
        listedCertifications: dash.listedCertifications,
        modelVersion: dash.modelVersion,
        computedAt: dash.computedAt,
      };
    },

    async listEvidence(
      identity: SecurityIdentity | null | undefined,
      limit?: number
    ) {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "read");
      const items = await deps.evidence.list(ctx.organizationId, limit);
      const chainValid = await deps.evidence.verifyChain(ctx.organizationId);
      return { items, chainValid };
    },

    async emitEvidence(
      identity: SecurityIdentity | null | undefined,
      input: EmitEvidenceInput
    ) {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "create");
      if (!Object.prototype.hasOwnProperty.call(TYPES, input.type)) {
        throw new ValidationAppError(`Unknown evidence type: ${input.type}`);
      }
      const result = await deps.evidence.emit(ctx.organizationId, {
        ...input,
        source: input.source || `user:${ctx.subjectId}`,
      });
      if (!result.duplicate) {
        await ensureSnapshot(ctx.organizationId, "evidence-emit");
      }
      return result;
    },

    async emitBatch(
      identity: SecurityIdentity | null | undefined,
      items: EmitEvidenceInput[]
    ) {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "create");
      for (const item of items) {
        if (!Object.prototype.hasOwnProperty.call(TYPES, item.type)) {
          throw new ValidationAppError(`Unknown evidence type: ${item.type}`);
        }
      }
      const result = await deps.evidence.emitMany(
        ctx.organizationId,
        items.map((i) => ({
          ...i,
          source: i.source || `user:${ctx.subjectId}`,
        }))
      );
      if (result.emitted > 0) {
        await ensureSnapshot(ctx.organizationId, "evidence-batch");
      }
      return result;
    },

    /**
     * Sync: collect facts from iMS module collectors, write ledger, recompute rating.
     */
    async sync(
      identity: SecurityIdentity | null | undefined
    ): Promise<RelyableSyncResult> {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "create");

      const collected: EmitEvidenceInput[] = [];
      for (const collector of collectors) {
        const rows = await collector.collect(ctx.organizationId);
        collected.push(...rows);
      }

      // Always refresh register-derived facts onto the ledger (idempotent by day)
      const settings = await deps.settings.getOrCreate(ctx.organizationId);
      const day = new Date().toISOString().slice(0, 10);
      const registerRows = registerEvidenceFromFacts(settings.facts, day).map(
        (r) =>
          ({
            type: r.type,
            status: r.status,
            observedAt: r.observedAt,
            validUntil: r.validUntil ?? null,
            payload: r.payload ?? {},
            level: r.level,
            source: "ingest:registers",
          }) satisfies EmitEvidenceInput
      );

      const all = [...registerRows, ...collected];
      const written = await deps.evidence.emitMany(ctx.organizationId, all);
      await deps.settings.markSynced(ctx.organizationId);
      const dashboard = await buildDashboard(ctx.organizationId, {
        recompute: true,
        reason: "sync",
      });

      return {
        emitted: written.emitted,
        duplicates: written.duplicates,
        dashboard,
      };
    },

    async getStandard(identity: SecurityIdentity | null | undefined) {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "read");
      return {
        modelVersion: MODEL_VERSION,
        bands: BANDS.map(([id, min, name]) => ({ id, min, name })),
        domains: DOMAINS.map((d) => ({ id: d.id, name: d.name, weight: d.w })),
        types: Object.entries(TYPES).map(([id, def]) => ({
          id,
          label: evidenceLabel(id),
          domain: def.dom,
          weight: def.w,
          kind: def.kind,
          halfLife: def.halfLife ?? null,
          core: !!def.core,
        })),
      };
    },

    async resolveOrgName(organizationId: string): Promise<string | null> {
      return deps.org?.getLegalName(organizationId) ?? null;
    },
  };
}
