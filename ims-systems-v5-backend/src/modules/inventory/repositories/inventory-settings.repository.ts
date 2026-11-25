import type {
  InventoryCheckOverride,
  InventorySettings,
  UpdateInventorySettingsInput,
} from "../types";
import {
  getInventorySettingsModel,
  type InventorySettingsDocument,
} from "./inventory-settings.model";

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

function toOverrides(
  raw: unknown
): Record<string, InventoryCheckOverride[]> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, InventoryCheckOverride[]> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(val)) continue;
    out[key] = val
      .filter((v) => v && typeof v === "object")
      .map((v) => {
        const row = v as Record<string, unknown>;
        return {
          name: String(row.name ?? ""),
          intervalMonths: Number(row.intervalMonths ?? 0),
          basis: String(row.basis ?? ""),
          requiresCompetence: Boolean(row.requiresCompetence),
        };
      })
      .filter((r) => r.name);
  }
  return out;
}

function toCompetentPersons(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => String(v ?? "").trim())
    .filter(Boolean)
    .slice(0, 200);
}

function toDomain(doc: InventorySettingsDocument): InventorySettings {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    leadDays: doc.leadDays ?? 30,
    requireLoginForScanActions: Boolean(doc.requireLoginForScanActions),
    scanBase: doc.scanBase ?? null,
    categoryOverrides: toOverrides(doc.categoryOverrides),
    competentPersons: toCompetentPersons(
      (doc as { competentPersons?: unknown }).competentPersons
    ),
    updatedBy: doc.updatedBy ?? null,
    updatedOn: iso(doc.updatedOn),
    createdAt: iso(doc.createdAt) ?? new Date().toISOString(),
    updatedAt: iso(doc.updatedAt) ?? new Date().toISOString(),
  };
}

export type InventorySettingsRepository = ReturnType<
  typeof createInventorySettingsRepository
>;

export function createInventorySettingsRepository() {
  const Model = getInventorySettingsModel();

  return {
    async getOrCreate(organizationId: string): Promise<InventorySettings> {
      const existing = await Model.findOne({ organizationId }).lean();
      if (existing) return toDomain(existing as InventorySettingsDocument);

      const created = await Model.create({
        organizationId,
        leadDays: 30,
        requireLoginForScanActions: false,
        scanBase: null,
        categoryOverrides: {},
        competentPersons: [],
        updatedBy: null,
        updatedOn: null,
      });
      return toDomain(created.toObject() as InventorySettingsDocument);
    },

    async update(
      organizationId: string,
      input: UpdateInventorySettingsInput,
      actorId: string
    ): Promise<InventorySettings> {
      const current = await this.getOrCreate(organizationId);
      const now = new Date();
      const doc = await Model.findOneAndUpdate(
        { organizationId },
        {
          $set: {
            leadDays: input.leadDays ?? current.leadDays,
            requireLoginForScanActions:
              input.requireLoginForScanActions ??
              current.requireLoginForScanActions,
            scanBase:
              input.scanBase !== undefined
                ? input.scanBase
                : current.scanBase,
            categoryOverrides:
              input.categoryOverrides ?? current.categoryOverrides,
            competentPersons:
              input.competentPersons ?? current.competentPersons,
            updatedBy: actorId,
            updatedOn: now,
          },
        },
        { returnDocument: "after", upsert: true }
      ).lean();
      if (!doc) return this.getOrCreate(organizationId);
      return toDomain(doc as InventorySettingsDocument);
    },
  };
}
