import { createHash } from "node:crypto";
import {
  defaultScope,
  fillAttrs,
} from "../lib/relyable-rules";
import type {
  RelyableAttrs,
  RelyableCapFacts,
  RelyableFamily,
  RelyableScope,
  RelyableSettings,
  RelyableSizeBand,
  UpdateRelyableScopeInput,
  UpdateRelyableSettingsInput,
} from "../types";
import { RELYABLE_ATTRS } from "../types";
import {
  getRelyableSettingsModel,
  type RelyableSettingsDocument,
} from "./relyable-settings.model";

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

function toAttrs(raw: unknown): RelyableAttrs {
  const src =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out = fillAttrs();
  for (const k of RELYABLE_ATTRS) {
    out[k] = Number(src[k]) ? 1 : 0;
  }
  return out;
}

function toScope(raw: unknown, fallback: RelyableScope): RelyableScope {
  if (!raw || typeof raw !== "object") return fallback;
  const s = raw as Record<string, unknown>;
  return {
    family: (String(s.family || fallback.family) as RelyableFamily) || "other",
    sizeBand:
      (String(s.sizeBand || fallback.sizeBand) as RelyableSizeBand) ||
      "unknown",
    attrs: toAttrs(s.attrs),
    confirmed: Boolean(s.confirmed),
    declarations: Array.isArray(s.declarations)
      ? s.declarations
          .filter((d) => d && typeof d === "object")
          .map((d) => {
            const row = d as Record<string, unknown>;
            return {
              attr: String(row.attr) as keyof RelyableAttrs,
              contradicted: Boolean(row.contradicted),
              reason: row.reason ? String(row.reason) : undefined,
            };
          })
      : [],
  };
}

function toFacts(raw: unknown): RelyableCapFacts {
  if (!raw || typeof raw !== "object") return {};
  const f = raw as Record<string, unknown>;
  return {
    accountsOverdue: Boolean(f.accountsOverdue),
    insolvency: Boolean(f.insolvency),
    enforcement: Boolean(f.enforcement),
    disqualifiedDirector: Boolean(f.disqualifiedDirector),
    riddorOpen: Boolean(f.riddorOpen),
  };
}

function toDomain(doc: RelyableSettingsDocument): RelyableSettings {
  const fallback = defaultScope({
    sic: (doc.sic as string[]) ?? [],
    employees: doc.employees as number | null,
  });
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    companyNumber: doc.companyNumber ?? null,
    legalName: doc.legalName ?? null,
    sic: Array.isArray(doc.sic) ? doc.sic.map(String) : [],
    employees:
      doc.employees == null || Number.isNaN(Number(doc.employees))
        ? null
        : Number(doc.employees),
    scope: toScope(doc.scope, fallback),
    facts: toFacts(doc.facts),
    listedCertifications: Array.isArray(doc.listedCertifications)
      ? doc.listedCertifications.map(String)
      : [],
    enabled: doc.enabled !== false,
    lastSyncedAt: iso(doc.lastSyncedAt as Date | null),
    updatedBy: doc.updatedBy ?? null,
    updatedOn: iso(doc.updatedOn as Date | null),
    createdAt: iso(doc.createdAt) ?? new Date().toISOString(),
    updatedAt: iso(doc.updatedAt) ?? new Date().toISOString(),
  };
}

export type RelyableSettingsRepository = ReturnType<
  typeof createRelyableSettingsRepository
>;

export function createRelyableSettingsRepository() {
  const Model = getRelyableSettingsModel();

  return {
    async getOrCreate(organizationId: string): Promise<RelyableSettings> {
      const existing = await Model.findOne({ organizationId }).lean();
      if (existing) return toDomain(existing as RelyableSettingsDocument);

      const scope = defaultScope();
      const created = await Model.create({
        organizationId,
        companyNumber: null,
        legalName: null,
        sic: [],
        employees: null,
        scope,
        facts: {},
        listedCertifications: [],
        enabled: true,
        lastSyncedAt: null,
        updatedBy: null,
        updatedOn: null,
      });
      return toDomain(created.toObject() as RelyableSettingsDocument);
    },

    async update(
      organizationId: string,
      input: UpdateRelyableSettingsInput,
      actorId: string
    ): Promise<RelyableSettings> {
      const current = await this.getOrCreate(organizationId);
      const now = new Date();
      const nextSic = input.sic ?? current.sic;
      const nextEmployees =
        input.employees !== undefined ? input.employees : current.employees;
      let nextScope = current.scope;
      if (input.sic || input.employees !== undefined) {
        if (!current.scope.confirmed) {
          nextScope = {
            ...defaultScope({ sic: nextSic, employees: nextEmployees }),
            confirmed: current.scope.confirmed,
            declarations: current.scope.declarations,
          };
        } else if (input.employees !== undefined) {
          nextScope = {
            ...current.scope,
            sizeBand: defaultScope({ employees: nextEmployees }).sizeBand,
          };
        }
      }

      const doc = await Model.findOneAndUpdate(
        { organizationId },
        {
          $set: {
            companyNumber:
              input.companyNumber !== undefined
                ? input.companyNumber
                : current.companyNumber,
            legalName:
              input.legalName !== undefined
                ? input.legalName
                : current.legalName,
            sic: nextSic,
            employees: nextEmployees,
            scope: nextScope,
            facts: input.facts ?? current.facts,
            listedCertifications:
              input.listedCertifications ?? current.listedCertifications,
            enabled:
              input.enabled !== undefined ? input.enabled : current.enabled,
            updatedBy: actorId,
            updatedOn: now,
          },
        },
        { returnDocument: "after", upsert: true }
      ).lean();
      if (!doc) return this.getOrCreate(organizationId);
      return toDomain(doc as RelyableSettingsDocument);
    },

    async updateScope(
      organizationId: string,
      input: UpdateRelyableScopeInput,
      actorId: string
    ): Promise<RelyableSettings> {
      const current = await this.getOrCreate(organizationId);
      const attrs = fillAttrs({
        ...current.scope.attrs,
        ...(input.attrs ?? {}),
      });
      const scope: RelyableScope = {
        family: input.family ?? current.scope.family,
        sizeBand: input.sizeBand ?? current.scope.sizeBand,
        attrs,
        confirmed:
          input.confirmed !== undefined
            ? input.confirmed
            : current.scope.confirmed,
        declarations: current.scope.declarations,
      };
      const now = new Date();
      const doc = await Model.findOneAndUpdate(
        { organizationId },
        {
          $set: {
            scope,
            updatedBy: actorId,
            updatedOn: now,
          },
        },
        { returnDocument: "after" }
      ).lean();
      if (!doc) return this.getOrCreate(organizationId);
      return toDomain(doc as RelyableSettingsDocument);
    },

    async markSynced(
      organizationId: string,
      at: Date = new Date()
    ): Promise<RelyableSettings> {
      const doc = await Model.findOneAndUpdate(
        { organizationId },
        { $set: { lastSyncedAt: at } },
        { returnDocument: "after", upsert: true }
      ).lean();
      if (!doc) return this.getOrCreate(organizationId);
      return toDomain(doc as RelyableSettingsDocument);
    },
  };
}

/** Stable hash helper exported for tests / seed. */
export function settingsFingerprint(settings: RelyableSettings): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        companyNumber: settings.companyNumber,
        scope: settings.scope,
        facts: settings.facts,
      })
    )
    .digest("hex")
    .slice(0, 12);
}
