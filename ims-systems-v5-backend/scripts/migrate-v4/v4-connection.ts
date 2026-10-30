import mongoose, { type Connection } from "mongoose";
import type { TenantHandle } from "./types";
import { asId } from "./transforms/common";

export function tenantDbUri(baseUri: string, dbName: string): string {
  // Support mongodb://host:27017 and mongodb+srv://cluster/...
  if (baseUri.includes("?")) {
    const [withoutQuery, query] = baseUri.split("?");
    const trimmed = withoutQuery.replace(/\/$/, "");
    return `${trimmed}/${dbName}?${query}`;
  }
  return `${baseUri.replace(/\/$/, "")}/${dbName}`;
}

export async function connectV4Db(
  baseUri: string,
  dbName: string
): Promise<Connection> {
  const uri = tenantDbUri(baseUri, dbName);
  const conn = mongoose.createConnection(uri, {
    serverSelectionTimeoutMS: 8_000,
  });
  await conn.asPromise();
  return conn;
}

export async function disconnectV4(conn: Connection): Promise<void> {
  if (conn.readyState !== 0) {
    await conn.close();
  }
}

export async function discoverTenantDbNames(
  baseUri: string,
  adminDbName: string,
  override: string[] | null
): Promise<string[]> {
  if (override && override.length > 0) return override;

  const admin = await connectV4Db(baseUri, adminDbName);
  try {
    const tenants = await admin.db
      .collection("tenants")
      .find({})
      .project({ name: 1, dbName: 1, database: 1 })
      .toArray();

    const builds = await admin.db
      .collection("builds")
      .find({})
      .project({ name: 1, tenant: 1, dbName: 1 })
      .toArray();

    const names = new Set<string>();
    for (const t of tenants) {
      const n = String(t.name ?? t.dbName ?? t.database ?? "").trim();
      if (n) names.add(n);
    }
    for (const b of builds) {
      const n = String(b.dbName ?? b.name ?? b.tenant ?? "").trim();
      if (n) names.add(n);
    }

    if (names.size === 0) {
      console.warn(
        `No tenants/builds found in ${adminDbName}; pass --tenant=db1,db2 or V4_TENANT_DBS`
      );
    }
    return [...names];
  } finally {
    await disconnectV4(admin);
  }
}

export async function openTenant(
  baseUri: string,
  dbName: string
): Promise<TenantHandle> {
  const connection = await connectV4Db(baseUri, dbName);
  let organizationId: string | null = null;
  try {
    const org = await connection.db
      .collection("organizations")
      .findOne({}, { projection: { _id: 1 } });
    organizationId = asId(org?._id);
  } catch {
    organizationId = null;
  }
  return { dbName, connection, organizationId };
}

export async function countCollection(
  conn: Connection,
  name: string
): Promise<number> {
  try {
    const exists = await conn.db
      .listCollections({ name }, { nameOnly: true })
      .hasNext();
    if (!exists) return 0;
    return conn.db.collection(name).countDocuments({});
  } catch {
    return 0;
  }
}

export async function* iterateCollection(
  conn: Connection,
  name: string,
  batchSize = 200
): AsyncGenerator<Record<string, unknown>[]> {
  const exists = await conn.db
    .listCollections({ name }, { nameOnly: true })
    .hasNext();
  if (!exists) return;

  const cursor = conn.db.collection(name).find({}).batchSize(batchSize);
  let batch: Record<string, unknown>[] = [];
  for await (const doc of cursor) {
    batch.push(doc as Record<string, unknown>);
    if (batch.length >= batchSize) {
      yield batch;
      batch = [];
    }
  }
  if (batch.length > 0) yield batch;
}
