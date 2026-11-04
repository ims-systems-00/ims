import mongoose, { type Connection, Types } from "mongoose";
import type { OrphanFkHit, WaveReport } from "./types";
import { asId } from "./transforms/common";
import { CORE_V5_PARITY } from "./module-type-map";
import { legacyCollectionName } from "./waves/wave6-archive";
import { PARKED_COLLECTIONS } from "./module-type-map";

type FkRule = {
  collection: string;
  field: string;
  /** Dot path into doc, e.g. source.moduleId */
  path: string;
  expectedCollection: string;
  optional?: boolean;
};

const WAVE_FK_RULES: Record<number, FkRule[]> = {
  1: [
    {
      collection: "organisationmemberships",
      field: "userId",
      path: "userId",
      expectedCollection: "users",
    },
    {
      collection: "organisationmemberships",
      field: "organizationId",
      path: "organizationId",
      expectedCollection: "organisations",
    },
    {
      collection: "unitmemberships",
      field: "userId",
      path: "userId",
      expectedCollection: "users",
    },
    {
      collection: "unitmemberships",
      field: "functionalUnitId",
      path: "functionalUnitId",
      expectedCollection: "functionalunits",
    },
    {
      collection: "functionalunits",
      field: "organizationId",
      path: "organizationId",
      expectedCollection: "organisations",
    },
    {
      collection: "businesspremises",
      field: "organizationId",
      path: "organizationId",
      expectedCollection: "organisations",
    },
  ],
  3: [
    {
      collection: "risks",
      field: "organizationId",
      path: "organizationId",
      expectedCollection: "organisations",
    },
    {
      collection: "risks",
      field: "ownerId",
      path: "ownerId",
      expectedCollection: "users",
      optional: true,
    },
    {
      collection: "risks",
      field: "businessUnitId",
      path: "businessUnitId",
      expectedCollection: "functionalunits",
      optional: true,
    },
    {
      collection: "incidents",
      field: "organizationId",
      path: "organizationId",
      expectedCollection: "organisations",
    },
    {
      collection: "ofis",
      field: "organizationId",
      path: "organizationId",
      expectedCollection: "organisations",
    },
    {
      collection: "tasks",
      field: "organizationId",
      path: "organizationId",
      expectedCollection: "organisations",
    },
    {
      collection: "customers",
      field: "organizationId",
      path: "organizationId",
      expectedCollection: "organisations",
    },
  ],
  4: [
    {
      collection: "controlstatuses",
      field: "organizationId",
      path: "organizationId",
      expectedCollection: "organisations",
    },
    {
      collection: "controlevidences",
      field: "organizationId",
      path: "organizationId",
      expectedCollection: "organisations",
    },
  ],
};

function getPath(doc: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = doc;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

async function idExists(
  collection: string,
  id: string,
  cache: Map<string, Set<string>>
): Promise<boolean> {
  let set = cache.get(collection);
  if (!set) {
    set = new Set();
    const docs = await mongoose.connection.db
      .collection(collection)
      .find({}, { projection: { _id: 1 } })
      .toArray();
    for (const d of docs) {
      const sid = asId(d._id);
      if (sid) set.add(sid);
    }
    cache.set(collection, set);
  }
  return set.has(id);
}

export async function validateWaveFks(wave: number): Promise<OrphanFkHit[]> {
  const rules = WAVE_FK_RULES[wave] ?? [];
  if (rules.length === 0) return [];

  const cache = new Map<string, Set<string>>();
  const hits: OrphanFkHit[] = [];

  for (const rule of rules) {
    const exists = await mongoose.connection.db
      .listCollections({ name: rule.collection }, { nameOnly: true })
      .hasNext();
    if (!exists) continue;

    const cursor = mongoose.connection.db.collection(rule.collection).find({});
    for await (const raw of cursor) {
      const doc = raw as Record<string, unknown>;
      const value = getPath(doc, rule.path);
      const id = asId(value);
      if (!id) {
        if (!rule.optional) {
          hits.push({
            collection: rule.collection,
            docId: asId(doc._id) ?? "?",
            field: rule.field,
            value: "(missing)",
            expectedCollection: rule.expectedCollection,
          });
        }
        continue;
      }
      const ok = await idExists(rule.expectedCollection, id, cache);
      if (!ok) {
        hits.push({
          collection: rule.collection,
          docId: asId(doc._id) ?? "?",
          field: rule.field,
          value: id,
          expectedCollection: rule.expectedCollection,
        });
      }
    }
  }

  return hits;
}

export async function countV5(collection: string): Promise<number> {
  try {
    const exists = await mongoose.connection.db
      .listCollections({ name }, { nameOnly: true })
      .hasNext();
    if (!exists) return 0;
    return mongoose.connection.db.collection(collection).countDocuments({});
  } catch {
    return 0;
  }
}

export async function validateUniques(): Promise<string[]> {
  const issues: string[] = [];
  const users = await mongoose.connection.db
    .collection("users")
    .aggregate([
      { $group: { _id: "$email", n: { $sum: 1 } } },
      { $match: { n: { $gt: 1 } } },
    ])
    .toArray();
  for (const u of users) {
    issues.push(`Duplicate user email: ${u._id} (${u.n})`);
  }

  const memberships = await mongoose.connection.db
    .collection("organisationmemberships")
    .aggregate([
      {
        $group: {
          _id: { o: "$organizationId", u: "$userId" },
          n: { $sum: 1 },
        },
      },
      { $match: { n: { $gt: 1 } } },
    ])
    .toArray();
  for (const m of memberships) {
    issues.push(
      `Duplicate membership: org=${m._id.o} user=${m._id.u} (${m.n})`
    );
  }

  return issues;
}

export async function attachValidation(
  report: WaveReport,
  wave: number
): Promise<void> {
  report.orphanFks = await validateWaveFks(wave);
  const uniqueIssues = await validateUniques();
  for (const issue of uniqueIssues) {
    report.notes.push(issue);
  }
}

/**
 * Per-organisation V4 vs V5 CORE counts + wrong organizationId stamps on FUs.
 * Returns human-readable failure lines (empty = pass).
 */
export async function validatePerOrgParity(
  v4Conn: Connection,
  options?: { sampleOrgIds?: string[] }
): Promise<string[]> {
  const failures: string[] = [];
  const v5 = mongoose.connection.db;
  if (!v5) {
    failures.push("V5 mongoose connection not ready for parity validation");
    return failures;
  }

  const orgIds = new Set<string>();
  if (options?.sampleOrgIds?.length) {
    for (const id of options.sampleOrgIds) orgIds.add(id);
  } else {
    const orgs = await v4Conn.db
      .collection("organizations")
      .find({}, { projection: { _id: 1 } })
      .toArray();
    for (const o of orgs) {
      const id = asId(o._id);
      if (id) orgIds.add(id);
    }
  }

  for (const orgId of orgIds) {
    let oid: Types.ObjectId;
    try {
      oid = new Types.ObjectId(orgId);
    } catch {
      continue;
    }

    for (const rule of CORE_V5_PARITY) {
      const v4Exists = await v4Conn.db
        .listCollections({ name: rule.v4 }, { nameOnly: true })
        .hasNext();
      if (!v4Exists) continue;

      const v4Count = await v4Conn.db
        .collection(rule.v4)
        .countDocuments({ organization: oid });

      if (v4Count === 0) continue;

      const v5Exists = await v5
        .listCollections({ name: rule.v5 }, { nameOnly: true })
        .hasNext();
      const v5Count = v5Exists
        ? await v5
            .collection(rule.v5)
            .countDocuments({ organizationId: orgId })
        : 0;

      if (v5Count === 0) {
        failures.push(
          `ORG ${orgId}: ${rule.v4}→${rule.v5} V4=${v4Count} V5=0 (CORE gap)`
        );
      } else if (v5Count < Math.floor(v4Count * 0.5)) {
        // Soft warn: allow some skips (expired invites etc.) but flag large loss.
        failures.push(
          `ORG ${orgId}: ${rule.v4}→${rule.v5} V4=${v4Count} V5=${v5Count} (<50% retained)`
        );
      }
    }

    // Wrong org stamp: V4 group _id exists in V5 under a different organizationId
    const v4Groups = await v4Conn.db
      .collection("groups")
      .find({ organization: oid }, { projection: { _id: 1 } })
      .toArray();
    if (v4Groups.length > 0) {
      const ids = v4Groups
        .map((g) => asId(g._id))
        .filter((id): id is string => Boolean(id))
        .map((id) => new Types.ObjectId(id));
      const misStamped = await v5.collection("functionalunits").countDocuments({
        _id: { $in: ids },
        organizationId: { $ne: orgId },
      });
      if (misStamped > 0) {
        failures.push(
          `ORG ${orgId}: ${misStamped} functionalunits mis-stamped under wrong organizationId`
        );
      }
    }
  }

  return failures;
}

/** Parked archive coverage: V4 parked count vs V5 legacy_* count. */
export async function validateParkedArchive(
  v4Conn: Connection
): Promise<string[]> {
  const failures: string[] = [];
  const v5 = mongoose.connection.db;
  if (!v5) return ["V5 connection not ready for parked archive validation"];

  for (const parked of PARKED_COLLECTIONS) {
    const v4Exists = await v4Conn.db
      .listCollections({ name: parked }, { nameOnly: true })
      .hasNext();
    if (!v4Exists) continue;
    const v4Count = await v4Conn.db.collection(parked).countDocuments({});
    if (v4Count === 0) continue;

    const legacy = legacyCollectionName(parked);
    const v5Exists = await v5
      .listCollections({ name: legacy }, { nameOnly: true })
      .hasNext();
    const v5Count = v5Exists
      ? await v5.collection(legacy).countDocuments({})
      : 0;
    if (v5Count < v4Count) {
      failures.push(
        `PARKED ${parked}: V4=${v4Count} legacy=${v5Count} (${legacy})`
      );
    }
  }
  return failures;
}
