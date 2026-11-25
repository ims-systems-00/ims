/**
 * Inventory & Assets application service (phase 2).
 */
import type { Authorizer, SecurityIdentity } from "../../../security";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import {
  buildAuditorPackHtml,
  buildAuditorPackPdf,
  complianceMapRows,
} from "../lib/auditor-pack";
import {
  aliceSummary,
  appendHistory,
  applyResult,
  applyStockMove,
  buildSchedule,
  CATEGORIES,
  checkRows,
  confirmSighting,
  DEFAULT_SETTINGS,
  earliestNextDue,
  fixedAssetsCsv,
  issues,
  moveLocation,
  moveStage,
  okToUse,
  readiness,
  recordEachUse,
  registerCsv,
  reportFault,
  scheduleCsv,
  stockState,
  validateAsset,
  validateStageMove,
  type InventoryRulesContext,
} from "../lib/inventory-rules";
import {
  storageInfoFromFileId,
  type DocumentModuleLibraryPort,
} from "../../document-management";
import type {
  InventoryIncidentPort,
  InventorySupplierPort,
  InventoryTaskPort,
} from "../ports";
import type { InventoryAssetRepository } from "../repositories/inventory-asset.repository";
import type { InventorySettingsRepository } from "../repositories/inventory-settings.repository";
import type { InventoryStockRepository } from "../repositories/inventory-stock.repository";
import {
  INVENTORY_MODULE_RESOURCE,
  type AttentionItem,
  type ConfirmSightingInput,
  type CreateInventoryAssetInput,
  type CreateStockItemInput,
  type InventoryAsset,
  type InventoryAssetListItem,
  type InventoryOverview,
  type InventoryScanSnapshot,
  type InventorySettings,
  type InventoryStockListItem,
  type ListInventoryAssetsQuery,
  type ListScheduleQuery,
  type MarkLabelledInput,
  type MoveLocationInput,
  type MoveStageInput,
  type PaginatedInventoryAssets,
  type RecordCheckInput,
  type RecordEachUseInput,
  type ReportFaultInput,
  type ScheduleRow,
  type StockMoveInput,
  type UpdateInventoryAssetInput,
  type UpdateInventorySettingsInput,
  type UpdateStockItemInput,
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

function actorName(identity: SecurityIdentity): string {
  return identity.email?.trim() || identity.subjectId || "System";
}

function rulesFrom(settings: InventorySettings): InventoryRulesContext {
  return {
    leadDays: settings.leadDays,
    categoryOverrides: settings.categoryOverrides,
    competentPersons: settings.competentPersons ?? [],
  };
}

function scanUrl(
  clientUrl: string,
  organizationId: string,
  tag: string,
  scanBase?: string | null
): string {
  const base = (scanBase || clientUrl).replace(/\/$/, "");
  if (scanBase) {
    return `${base}${encodeURIComponent(tag)}`;
  }
  return `${base}/inventory/scan/${encodeURIComponent(organizationId)}/${encodeURIComponent(tag)}`;
}

export type InventoryMutationResult = InventoryAsset & {
  incidentId?: string | null;
};

export type InventoryServiceDeps = {
  assets: InventoryAssetRepository;
  settings: InventorySettingsRepository;
  stock: InventoryStockRepository;
  authorizer: Authorizer;
  tasks: InventoryTaskPort;
  incidents: InventoryIncidentPort;
  suppliers: InventorySupplierPort;
  documents: DocumentModuleLibraryPort;
  clientUrl: string;
  orgNameResolver?: (organizationId: string) => Promise<string | null>;
};

export type InventoryService = ReturnType<typeof createInventoryService>;

export type InventoryLibrarySyncResult = {
  scanned: number;
  created: number;
  existing: number;
  failed: number;
};

export function createInventoryService(deps: InventoryServiceDeps) {
  async function registerInventoryFile(input: {
    organizationId: string;
    createdBy: string;
    sourceKey: string;
    name: string;
    fileId: string | null | undefined;
    sourceLabel?: string | null;
  }): Promise<"created" | "existing" | "skipped" | "failed"> {
    // Keep storageInfo.Name as the real object filename (from the key).
    // Passing the display label breaks PDF preview / signed Content-Disposition.
    const storageInfo = storageInfoFromFileId(input.fileId);
    if (!storageInfo) return "skipped";
    try {
      const result = await deps.documents.registerDocument({
        organizationId: input.organizationId,
        createdBy: input.createdBy,
        sourceModule: "inventory",
        sourceKey: input.sourceKey,
        name: input.name,
        storageInfo,
        purpose: "Document",
        sourceLabel: input.sourceLabel ?? null,
        folderName: "Certificates",
      });
      if (!result) return "skipped";
      return result.created ? "created" : "existing";
    } catch {
      // Non-fatal — inventory write already succeeded.
      return "failed";
    }
  }

  function queueInventoryFile(
    input: Parameters<typeof registerInventoryFile>[0]
  ): void {
    void registerInventoryFile(input);
  }

  async function assertAllowed(
    identity: SecurityIdentity,
    action: "read" | "create" | "delete",
    resourceId?: string
  ): Promise<void> {
    const allowed = await deps.authorizer.allow({
      identity,
      action,
      resourceType: INVENTORY_MODULE_RESOURCE,
      resourceId,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError(
        "User does not have permission to access inventory"
      );
    }
  }

  async function requireAsset(
    organizationId: string,
    id: string
  ): Promise<InventoryAsset> {
    const row = await deps.assets.findById(organizationId, id);
    if (!row) throw new NotFoundError("Asset not found");
    return row;
  }

  async function settingsFor(
    organizationId: string
  ): Promise<InventorySettings> {
    return deps.settings.getOrCreate(organizationId);
  }

  async function raiseNcr(input: {
    organizationId: string;
    asset: InventoryAsset;
    title: string;
    description: string;
    createdBy: string;
  }): Promise<string | null> {
    try {
      const created = await deps.incidents.createFailOrFaultIncident({
        organizationId: input.organizationId,
        assetId: input.asset.id,
        assetTag: input.asset.tag,
        assetName: input.asset.name,
        title: input.title,
        description: input.description,
        createdBy: input.createdBy,
      });
      return created?.id ?? null;
    } catch (err) {
      console.warn(
        "[inventory] NCR create failed",
        input.asset.tag,
        err instanceof Error ? err.message : err
      );
      return null;
    }
  }

  function enrich(
    asset: InventoryAsset,
    settings: InventoryRulesContext
  ): InventoryAssetListItem {
    const nd = earliestNextDue(asset, undefined, settings);
    const iss = issues(asset, settings);
    return {
      ...asset,
      nextDue: nd.due,
      nextDueState: nd.state,
      issues: iss,
      okToUse: okToUse(asset, settings),
    };
  }

  function enrichStock(
    item: Awaited<ReturnType<InventoryStockRepository["list"]>>[number],
    leadDays: number
  ): InventoryStockListItem {
    return { ...item, state: stockState(item, leadDays) };
  }

  function toSnapshot(
    asset: InventoryAsset,
    settings: InventorySettings
  ): InventoryScanSnapshot {
    const ctx = rulesFrom(settings);
    const rows = checkRows(
      asset,
      ctx.leadDays,
      undefined,
      ctx.categoryOverrides
    );
    return {
      id: asset.id,
      organizationId: asset.organizationId,
      tag: asset.tag,
      name: asset.name,
      category: asset.category,
      location: asset.location,
      custodian: asset.custodian,
      stage: asset.stage,
      safetyNotes: asset.safetyNotes,
      okToUse: okToUse(asset, ctx),
      checks: rows.map((r) => ({
        name: r.name,
        intervalMonths: r.intervalMonths,
        lastDate: r.last?.date ?? null,
        lastResult: r.last?.result ?? null,
        nextDue: r.nextDue,
        state: r.state,
      })),
      lastActivity: asset.history[0] ?? null,
      requireLoginForScanActions: settings.requireLoginForScanActions,
    };
  }

  function resolveScanActor(
    identity: SecurityIdentity | null | undefined,
    scanName: string | undefined,
    settings: InventorySettings,
    forWrite: boolean
  ): string {
    if (identity?.subjectId) return actorName(identity);
    if (forWrite && settings.requireLoginForScanActions) {
      throw new ForbiddenError("Login is required for scan actions");
    }
    const name = (scanName ?? "").trim();
    if (forWrite && !name) {
      throw new ValidationAppError("Provide your name (X-Scan-Name)");
    }
    return name || "Anonymous";
  }

  async function persistAsset(
    organizationId: string,
    asset: InventoryAsset,
    actorId: string
  ): Promise<InventoryAssetListItem> {
    const settings = await settingsFor(organizationId);
    const saved = await deps.assets.replace(
      organizationId,
      asset.id,
      asset,
      actorId
    );
    if (!saved) throw new NotFoundError("Asset not found");
    return enrich(saved, rulesFrom(settings));
  }

  return {
    async categories(identity: SecurityIdentity | null | undefined) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const settings = await settingsFor(organizationId);
      return CATEGORIES.map((c) => ({
        ...c,
        checks:
          settings.categoryOverrides[c.name]?.length
            ? settings.categoryOverrides[c.name]
            : c.checks,
      }));
    },

    async getSettings(identity: SecurityIdentity | null | undefined) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      return settingsFor(organizationId);
    },

    async updateSettings(
      identity: SecurityIdentity | null | undefined,
      input: UpdateInventorySettingsInput
    ) {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      if (input.leadDays != null && (input.leadDays < 1 || input.leadDays > 365)) {
        throw new ValidationAppError("leadDays must be 1–365");
      }
      return deps.settings.update(organizationId, input, subjectId);
    },

    async overview(
      identity: SecurityIdentity | null | undefined
    ): Promise<InventoryOverview> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const settings = await settingsFor(organizationId);
      const ctx = rulesFrom(settings);

      const all = await deps.assets.listAll(organizationId, {
        includeDisposed: true,
      });
      const active = all.filter((a) => a.stage !== "Disposed");
      const stock = await deps.stock.list(organizationId);

      let overdueChecks = 0;
      let soonChecks = 0;
      const attention: AttentionItem[] = [];

      for (const asset of active) {
        const iss = issues(asset, ctx);
        for (const i of iss) {
          if (i.code === "overdue") overdueChecks += 1;
          if (i.code === "soon") soonChecks += 1;
          if (i.severity !== "low") {
            attention.push({
              severity: i.severity,
              assetId: asset.id,
              tag: asset.tag,
              name: asset.name,
              message: i.message,
            });
          }
        }
      }

      let stockLow = 0;
      let stockExpired = 0;
      for (const s of stock) {
        const st = stockState(s, ctx.leadDays);
        if (st === "low" || st === "expsoon") {
          stockLow += st === "low" ? 1 : 0;
          attention.push({
            severity: st === "low" ? "medium" : "medium",
            assetId: s.id,
            tag: s.code,
            name: s.name,
            message:
              st === "low"
                ? `Stock low (${s.qty} ≤ min ${s.min})`
                : `Stock expiring soon (${s.expiry})`,
          });
        }
        if (st === "expired") {
          stockExpired += 1;
          attention.push({
            severity: "high",
            assetId: s.id,
            tag: s.code,
            name: s.name,
            message: `Stock expired (${s.expiry})`,
          });
        }
      }

      const severityRank = { high: 0, medium: 1, low: 2 } as const;
      attention.sort(
        (a, b) => severityRank[a.severity] - severityRank[b.severity]
      );

      const activity = [
        ...active.flatMap((a) =>
          a.history.slice(0, 3).map((h) => ({
            ...h,
            what: `${a.tag}: ${h.what}`,
          }))
        ),
        ...stock.flatMap((s) =>
          s.history.slice(0, 2).map((h) => ({
            ...h,
            what: `${s.code}: ${h.what}`,
          }))
        ),
      ]
        .sort((a, b) => b.t.localeCompare(a.t))
        .slice(0, 40);

      const cutoff = Date.now() - 90 * 86_400_000;
      const recent = activity.filter(
        (h) => new Date(h.t).getTime() >= cutoff
      );

      const ready = readiness(all, ctx);
      const totals = {
        assets: active.length,
        inService: active.filter((a) => a.stage === "In service").length,
        quarantined: active.filter((a) => a.stage === "Quarantined").length,
        underMaintenance: active.filter(
          (a) => a.stage === "Under maintenance"
        ).length,
        overdueChecks,
        soonChecks,
        stockLow,
        stockExpired,
      };

      return {
        totals,
        attention: attention.slice(0, 25),
        readiness: ready,
        activity: recent,
        aliceSummary: aliceSummary(ready, attention, totals),
      };
    },

    async list(
      identity: SecurityIdentity | null | undefined,
      query: ListInventoryAssetsQuery
    ): Promise<PaginatedInventoryAssets> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const settings = await settingsFor(organizationId);
      const ctx = rulesFrom(settings);

      if (query.issue) {
        const all = await deps.assets.listAll(organizationId, {
          includeDisposed: query.includeDisposed,
        });
        let items = all.map((a) => enrich(a, ctx)).filter((a) => a.issues.length > 0);
        if (query.category) items = items.filter((a) => a.category === query.category);
        if (query.stage) items = items.filter((a) => a.stage === query.stage);
        if (query.site) {
          const s = query.site.toLowerCase();
          items = items.filter((a) => a.location.toLowerCase().includes(s));
        }
        if (query.search?.trim()) {
          const q = query.search.trim().toLowerCase();
          items = items.filter(
            (a) =>
              a.tag.toLowerCase().includes(q) ||
              a.name.toLowerCase().includes(q) ||
              a.serial.toLowerCase().includes(q) ||
              a.location.toLowerCase().includes(q) ||
              a.custodian.toLowerCase().includes(q)
          );
        }
        const page = query.page && query.page > 0 ? query.page : 1;
        const pageSize =
          query.pageSize && query.pageSize > 0
            ? Math.min(query.pageSize, 100)
            : 25;
        return {
          items: items.slice((page - 1) * pageSize, page * pageSize),
          total: items.length,
          page,
          pageSize,
        };
      }

      const page = await deps.assets.list(organizationId, query);
      return { ...page, items: page.items.map((a) => enrich(a, ctx)) };
    },

    async getById(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<InventoryAssetListItem> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read", id);
      const settings = await settingsFor(organizationId);
      return enrich(await requireAsset(organizationId, id), rulesFrom(settings));
    },

    async create(
      identity: SecurityIdentity | null | undefined,
      input: CreateInventoryAssetInput
    ): Promise<InventoryAssetListItem> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      const settings = await settingsFor(organizationId);
      const tags = await deps.assets.listTags(organizationId);
      const err = validateAsset(
        { ...input, stage: input.stage ?? "Requested" },
        { existingTags: new Set(tags) }
      );
      if (err) throw new ValidationAppError(err);
      const who = actorName(actor);
      const created = await deps.assets.create(organizationId, {
        ...input,
        tag: input.tag.trim().toUpperCase(),
        stage: input.stage ?? "Requested",
        criticality: input.criticality ?? "Standard",
        createdBy: subjectId,
        history: appendHistory([], who, "Asset created"),
      });
      return enrich(created, rulesFrom(settings));
    },

    async update(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateInventoryAssetInput
    ): Promise<InventoryAssetListItem> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create", id);
      const settings = await settingsFor(organizationId);
      const existing = await requireAsset(organizationId, id);
      const merged = {
        tag: input.tag ?? existing.tag,
        name: input.name ?? existing.name,
        category: input.category ?? existing.category,
        location: input.location ?? existing.location,
        custodian: input.custodian ?? existing.custodian,
        stage: input.stage ?? existing.stage,
        criticality: input.criticality ?? existing.criticality,
        makeModel: input.makeModel ?? existing.makeModel,
        serial: input.serial ?? existing.serial,
        purchaseDate:
          input.purchaseDate !== undefined
            ? input.purchaseDate
            : existing.purchaseDate,
        cost: input.cost !== undefined ? input.cost : existing.cost,
        supplier: input.supplier ?? existing.supplier,
        warrantyEnds:
          input.warrantyEnds !== undefined
            ? input.warrantyEnds
            : existing.warrantyEnds,
        informationAsset:
          input.informationAsset !== undefined
            ? input.informationAsset
            : existing.informationAsset,
        safetyNotes: input.safetyNotes ?? existing.safetyNotes,
        labelPrinted:
          input.labelPrinted !== undefined
            ? input.labelPrinted
            : existing.labelPrinted,
      };
      const tags = await deps.assets.listTags(organizationId);
      const err = validateAsset(merged, {
        existingTags: new Set(tags),
        excludeTag: existing.tag,
      });
      if (err) throw new ValidationAppError(err);
      if (input.stage && input.stage !== existing.stage) {
        throw new ValidationAppError(
          "Use the stage endpoint to change lifecycle stage"
        );
      }
      const who = actorName(actor);
      const next: InventoryAsset = {
        ...existing,
        ...merged,
        tag: merged.tag.trim().toUpperCase(),
        history: appendHistory(existing.history, who, "Asset details updated"),
      };
      const saved = await deps.assets.replace(
        organizationId,
        id,
        next,
        subjectId
      );
      if (!saved) throw new NotFoundError("Asset not found");
      return enrich(saved, rulesFrom(settings));
    },

    async moveStage(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: MoveStageInput
    ) {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create", id);
      const existing = await requireAsset(organizationId, id);
      const err = validateStageMove(existing, input);
      if (err) throw new ValidationAppError(err);
      try {
        const moved = moveStage(existing, input, actorName(actor));
        return persistAsset(organizationId, moved, subjectId);
      } catch (e) {
        throw new ValidationAppError(
          e instanceof Error ? e.message : "Invalid stage move"
        );
      }
    },

    async recordCheck(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: RecordCheckInput
    ): Promise<InventoryMutationResult> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create", id);
      const settings = await settingsFor(organizationId);
      const existing = await requireAsset(organizationId, id);
      try {
        const next = applyResult(
          existing,
          input,
          actorName(actor),
          undefined,
          settings.categoryOverrides,
          settings.competentPersons ?? []
        );
        const saved = await persistAsset(organizationId, next, subjectId);
        if (input.fileId) {
          queueInventoryFile({
            organizationId,
            createdBy: subjectId,
            sourceKey: `inventory:check:${saved.id}:${input.checkName}:${input.date}`,
            name: `${saved.tag} — ${input.checkName} — certificate`,
            fileId: input.fileId,
            sourceLabel: `${saved.tag} ${saved.name}`.trim(),
          });
        }
        let incidentId: string | null = null;
        if (input.result === "Fail") {
          incidentId = await raiseNcr({
            organizationId,
            asset: saved,
            title: `Inventory check Fail: ${saved.tag} ${saved.name}`,
            description: [
              `Check: ${input.checkName}`,
              `Result: Fail`,
              `By: ${input.by}`,
              input.ref ? `Ref: ${input.ref}` : null,
              input.note ? `Note: ${input.note}` : null,
              "Asset quarantined. Assess validity of previous results (ISO 9001 7.1.5.2).",
            ]
              .filter(Boolean)
              .join("\n"),
            createdBy: subjectId,
          });
        }
        return { ...saved, incidentId };
      } catch (e) {
        throw new ValidationAppError(
          e instanceof Error ? e.message : "Invalid check result"
        );
      }
    },

    async syncDocumentsToLibrary(
      identity: SecurityIdentity | null | undefined
    ): Promise<InventoryLibrarySyncResult> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const result: InventoryLibrarySyncResult = {
        scanned: 0,
        created: 0,
        existing: 0,
        failed: 0,
      };
      const assets = await deps.assets.listAll(organizationId);
      for (const asset of assets) {
        for (const [checkName, check] of Object.entries(asset.checks || {})) {
          if (!check?.fileId) continue;
          const status = await registerInventoryFile({
            organizationId,
            createdBy: subjectId,
            sourceKey: `inventory:check:${asset.id}:${checkName}:${check.date}`,
            name: `${asset.tag} — ${checkName} — certificate`,
            fileId: check.fileId,
            sourceLabel: `${asset.tag} ${asset.name}`.trim(),
          });
          result.scanned += 1;
          if (status === "created") result.created += 1;
          else if (status === "existing") result.existing += 1;
          else if (status === "failed") result.failed += 1;
        }
      }
      return result;
    },

    async reportFault(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: ReportFaultInput
    ): Promise<InventoryMutationResult> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create", id);
      const existing = await requireAsset(organizationId, id);
      try {
        const next = reportFault(existing, input.note, actorName(actor));
        const saved = await persistAsset(organizationId, next, subjectId);
        const incidentId = await raiseNcr({
          organizationId,
          asset: saved,
          title: `Inventory fault: ${saved.tag} ${saved.name}`,
          description: `Fault reported: ${input.note.trim()}`,
          createdBy: subjectId,
        });
        return { ...saved, incidentId };
      } catch (e) {
        throw new ValidationAppError(
          e instanceof Error ? e.message : "Unable to report fault"
        );
      }
    },

    async moveLocation(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: MoveLocationInput
    ) {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create", id);
      const existing = await requireAsset(organizationId, id);
      try {
        const next = moveLocation(existing, input.location, actorName(actor));
        return persistAsset(organizationId, next, subjectId);
      } catch (e) {
        throw new ValidationAppError(
          e instanceof Error ? e.message : "Unable to move location"
        );
      }
    },

    async confirmSighting(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: ConfirmSightingInput
    ) {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create", id);
      const existing = await requireAsset(organizationId, id);
      try {
        const next = confirmSighting(
          existing,
          input.note ?? "",
          actorName(actor)
        );
        return persistAsset(organizationId, next, subjectId);
      } catch (e) {
        throw new ValidationAppError(
          e instanceof Error ? e.message : "Unable to confirm sighting"
        );
      }
    },

    async recordEachUse(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: RecordEachUseInput
    ) {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create", id);
      const settings = await settingsFor(organizationId);
      const existing = await requireAsset(organizationId, id);
      try {
        const next = recordEachUse(
          existing,
          input.checkName,
          actorName(actor),
          input.note ?? "",
          undefined,
          settings.categoryOverrides
        );
        return persistAsset(organizationId, next, subjectId);
      } catch (e) {
        throw new ValidationAppError(
          e instanceof Error ? e.message : "Unable to record each-use"
        );
      }
    },

    async markLabelled(
      identity: SecurityIdentity | null | undefined,
      input: MarkLabelledInput
    ) {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      const count = await deps.assets.markLabelled(
        organizationId,
        input.ids,
        subjectId
      );
      return { updated: count };
    },

    async schedule(
      identity: SecurityIdentity | null | undefined,
      query: ListScheduleQuery
    ): Promise<ScheduleRow[]> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const settings = await settingsFor(organizationId);
      const assets = await deps.assets.listAll(organizationId, {
        includeDisposed: false,
      });
      return buildSchedule(
        assets,
        { due: query.due || undefined, checkType: query.checkType || undefined },
        undefined,
        rulesFrom(settings)
      );
    },

    // --- Stock ---
    async listStock(identity: SecurityIdentity | null | undefined) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const settings = await settingsFor(organizationId);
      const items = await deps.stock.list(organizationId);
      return items.map((i) => enrichStock(i, settings.leadDays));
    },

    async createStock(
      identity: SecurityIdentity | null | undefined,
      input: CreateStockItemInput
    ) {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      if (!input.code?.trim() || !input.name?.trim()) {
        throw new ValidationAppError("Code and name are required");
      }
      const settings = await settingsFor(organizationId);
      const created = await deps.stock.create(organizationId, {
        ...input,
        createdBy: subjectId,
        history: appendHistory([], actorName(actor), "Stock item created"),
      });
      return enrichStock(created, settings.leadDays);
    },

    async updateStock(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateStockItemInput
    ) {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      const settings = await settingsFor(organizationId);
      const saved = await deps.stock.updateFields(
        organizationId,
        id,
        input,
        subjectId
      );
      if (!saved) throw new NotFoundError("Stock item not found");
      return enrichStock(saved, settings.leadDays);
    },

    async moveStock(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: StockMoveInput
    ) {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      const settings = await settingsFor(organizationId);
      const existing = await deps.stock.findById(organizationId, id);
      if (!existing) throw new NotFoundError("Stock item not found");
      const before = stockState(existing, settings.leadDays);
      try {
        const next = applyStockMove(existing, input, actorName(actor));
        const saved = await deps.stock.replace(
          organizationId,
          id,
          next,
          subjectId
        );
        if (!saved) throw new NotFoundError("Stock item not found");
        const after = stockState(saved, settings.leadDays);
        if (before !== "low" && after === "low") {
          try {
            const task = await deps.tasks.createPurchaseTask({
              organizationId,
              stockId: saved.id,
              stockCode: saved.code,
              stockName: saved.name,
              title: `Reorder stock: ${saved.code} ${saved.name}`,
              description: `On hand ${saved.qty} is at or below minimum ${saved.min}.`,
              createdBy: subjectId,
            });
            console.info(
              "[inventory] low-stock purchase task",
              saved.code,
              task?.id ? `created ${task.id}` : "skipped (no adapter)"
            );
          } catch (err) {
            console.warn(
              "[inventory] low-stock purchase task failed",
              saved.code,
              err instanceof Error ? err.message : err
            );
          }
        }
        return enrichStock(saved, settings.leadDays);
      } catch (e) {
        throw new ValidationAppError(
          e instanceof Error ? e.message : "Invalid stock movement"
        );
      }
    },

    // --- Exports / packs ---
    async exportRegisterCsv(identity: SecurityIdentity | null | undefined) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const settings = await settingsFor(organizationId);
      const assets = await deps.assets.listAll(organizationId, {
        includeDisposed: true,
      });
      const csv = registerCsv(
        assets,
        (a) =>
          scanUrl(
            deps.clientUrl,
            organizationId,
            a.tag,
            settings.scanBase
          ),
        rulesFrom(settings)
      );
      return csv;
    },

    async exportScheduleCsv(identity: SecurityIdentity | null | undefined) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const settings = await settingsFor(organizationId);
      const assets = await deps.assets.listAll(organizationId, {
        includeDisposed: false,
      });
      return scheduleCsv(assets, rulesFrom(settings));
    },

    async exportModelJson(identity: SecurityIdentity | null | undefined) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const settings = await settingsFor(organizationId);
      const [assets, stock] = await Promise.all([
        deps.assets.listAll(organizationId, { includeDisposed: true }),
        deps.stock.list(organizationId),
      ]);
      return {
        settings,
        assets,
        stock,
        exportedAt: new Date().toISOString(),
      };
    },

    async complianceMap(identity: SecurityIdentity | null | undefined) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const settings = await settingsFor(organizationId);
      return complianceMapRows(rulesFrom(settings));
    },

    async auditorPack(
      identity: SecurityIdentity | null | undefined,
      format: "html" | "pdf" = "html"
    ): Promise<{
      contentType: string;
      body: Buffer | string;
      filename: string;
    }> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const settings = await settingsFor(organizationId);
      const [assets, stock] = await Promise.all([
        deps.assets.listAll(organizationId, { includeDisposed: true }),
        deps.stock.list(organizationId),
      ]);
      const orgName =
        (await deps.orgNameResolver?.(organizationId)) ?? "Organisation";
      const asOf = new Date().toISOString().slice(0, 10);
      const payload = {
        orgName,
        assets,
        stock,
        settings: rulesFrom(settings),
      };
      if (format === "pdf") {
        const body = await buildAuditorPackPdf(payload);
        return {
          contentType: "application/pdf",
          body,
          filename: `inventory-auditor-pack-${asOf}.pdf`,
        };
      }
      return {
        contentType: "text/html; charset=utf-8",
        body: buildAuditorPackHtml(payload),
        filename: `inventory-auditor-pack-${asOf}.html`,
      };
    },

    async auditorPackHtml(identity: SecurityIdentity | null | undefined) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const settings = await settingsFor(organizationId);
      const [assets, stock] = await Promise.all([
        deps.assets.listAll(organizationId, { includeDisposed: true }),
        deps.stock.list(organizationId),
      ]);
      const orgName =
        (await deps.orgNameResolver?.(organizationId)) ?? "Organisation";
      return buildAuditorPackHtml({
        orgName,
        assets,
        stock,
        settings: rulesFrom(settings),
      });
    },

    async exportFixedAssetsCsv(identity: SecurityIdentity | null | undefined) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const assets = await deps.assets.listAll(organizationId, {
        includeDisposed: true,
      });
      return fixedAssetsCsv(assets);
    },

    async listCalibrationLabs(identity: SecurityIdentity | null | undefined) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      return deps.suppliers.listCalibrationLabs(organizationId);
    },

    // --- Public scan ---
    async publicGetByTag(organizationId: string, tag: string) {
      const settings = await settingsFor(organizationId);
      const asset = await deps.assets.findByTag(
        organizationId,
        tag.toUpperCase()
      );
      if (!asset || asset.stage === "Disposed") {
        throw new NotFoundError("Asset not found");
      }
      return toSnapshot(asset, settings);
    },

    async publicMutate(
      organizationId: string,
      tag: string,
      action:
        | "fault"
        | "each-use"
        | "move"
        | "sighting"
        | "checks",
      body: Record<string, unknown>,
      identity: SecurityIdentity | null | undefined,
      scanName: string | undefined
    ) {
      const settings = await settingsFor(organizationId);
      const actor = resolveScanActor(identity, scanName, settings, true);
      const asset = await deps.assets.findByTag(
        organizationId,
        tag.toUpperCase()
      );
      if (!asset || asset.stage === "Disposed") {
        throw new NotFoundError("Asset not found");
      }
      const actorId = identity?.subjectId ?? `scan:${actor}`;
      try {
        let next = asset;
        let ncrTitle: string | null = null;
        let ncrDescription: string | null = null;
        if (action === "fault") {
          const note = String(body.note ?? "");
          next = reportFault(asset, note, actor);
          ncrTitle = `Inventory fault: ${asset.tag} ${asset.name}`;
          ncrDescription = `Fault reported: ${note.trim()}`;
        } else if (action === "move") {
          next = moveLocation(asset, String(body.location ?? ""), actor);
        } else if (action === "sighting") {
          next = confirmSighting(asset, String(body.note ?? ""), actor);
        } else if (action === "each-use") {
          next = recordEachUse(
            asset,
            String(body.checkName ?? ""),
            actor,
            String(body.note ?? ""),
            undefined,
            settings.categoryOverrides
          );
        } else if (action === "checks") {
          const checkInput: RecordCheckInput = {
            checkName: String(body.checkName ?? ""),
            date: String(body.date ?? ""),
            result: body.result as RecordCheckInput["result"],
            by: String(body.by ?? actor),
            ref: String(body.ref ?? ""),
            note: String(body.note ?? ""),
          };
          next = applyResult(
            asset,
            checkInput,
            actor,
            undefined,
            settings.categoryOverrides,
            settings.competentPersons ?? []
          );
          if (checkInput.result === "Fail") {
            ncrTitle = `Inventory check Fail: ${asset.tag} ${asset.name}`;
            ncrDescription = [
              `Check: ${checkInput.checkName}`,
              `Result: Fail`,
              `By: ${checkInput.by}`,
              checkInput.note ? `Note: ${checkInput.note}` : null,
            ]
              .filter(Boolean)
              .join("\n");
          }
        }
        const saved = await deps.assets.replace(
          organizationId,
          asset.id,
          next,
          actorId
        );
        if (!saved) throw new NotFoundError("Asset not found");
        if (ncrTitle && ncrDescription) {
          await raiseNcr({
            organizationId,
            asset: saved,
            title: ncrTitle,
            description: ncrDescription,
            createdBy: actorId,
          });
        }
        return toSnapshot(saved, settings);
      } catch (e) {
        if (e instanceof ForbiddenError || e instanceof NotFoundError) throw e;
        throw new ValidationAppError(
          e instanceof Error ? e.message : "Scan action failed"
        );
      }
    },
  };
}
