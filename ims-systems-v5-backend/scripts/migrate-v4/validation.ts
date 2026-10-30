import mongoose from "mongoose";
import type { OrphanFkHit, WaveReport } from "./types";
import { asId } from "./transforms/common";

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
