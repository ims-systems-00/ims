import type { Connection, Model } from "mongoose";

export type MigrateWave =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | "all"
  | "1-4";

export type MigrateCliOptions = {
  wave: MigrateWave;
  dryRun: boolean;
  validateOnly: boolean;
  tenantDbs: string[] | null;
  reportPath: string | null;
};

export type EntityStat = {
  collection: string;
  v4Count: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: string[];
};

export type WaveReport = {
  wave: number | string;
  tenantDb: string;
  organizationId: string | null;
  dryRun: boolean;
  startedAt: string;
  finishedAt: string;
  entities: EntityStat[];
  orphanFks: OrphanFkHit[];
  notes: string[];
};

export type OrphanFkHit = {
  collection: string;
  docId: string;
  field: string;
  value: string;
  expectedCollection: string;
};

export type MigrateContext = {
  dryRun: boolean;
  validateOnly: boolean;
  v4UriBase: string;
  v5Uri: string;
  adminDbName: string;
  /** Shared across tenants: email → canonical user id */
  emailToUserId: Map<string, string>;
  /** V4 user id that was remapped to another canonical user */
  userIdRemap: Map<string, string>;
  /** toolkit|clause → V5 compliance control id */
  complianceNaturalKeyToId: Map<string, string>;
  reports: WaveReport[];
};

export type TenantHandle = {
  dbName: string;
  connection: Connection;
  organizationId: string | null;
};

export type UpsertResult = "inserted" | "updated" | "dry-run" | "skipped";

export type CollectionWriter = {
  model: Model<any>;
  name: string;
};
