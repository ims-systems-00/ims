/**
 * Import migrated V4 users into Auth0 WITH their existing bcrypt password
 * hashes, so they can sign in to V5 with their old email + password.
 *
 * Run this BEFORE `pnpm backfill:auth0-identities`: the backfill reuses an
 * Auth0 user that already exists for an email (keeping its password) and only
 * creates password-less users for emails Auth0 doesn't know yet.
 *
 * Safe by design:
 * - Only users with a bcrypt hash ($2a$/$2b$/$2y$), no auth0SubjectId and
 *   not deleted are exported.
 * - upsert=false: an email that already exists in Auth0 is left untouched
 *   (reported as DUPLICATED_USER), so current V5 users keep their password.
 * - No emails are sent (no completion email; bulk import never sends
 *   verification mail).
 * - Default is a dry run. Nothing is sent to Auth0 without --apply.
 *
 * By default only users who belong to at least one organisation are imported
 * (V4 has ~1,000 abandoned/unverified sign-ups with no organisation).
 * Pass --include-non-members to import those too.
 *
 * Usage (from ims-systems-v5-backend):
 *   MONGODB_URI=<target> pnpm import:auth0-v4-passwords            # dry run
 *   MONGODB_URI=<target> pnpm import:auth0-v4-passwords --apply
 *
 * Then: pnpm backfill:auth0-identities --all --no-send-reset-email
 *       pnpm backfill:openfga-memberships
 */
import { config as loadDotenv } from "dotenv";
import mongoose from "mongoose";
import { loadConfig } from "../src/config";
import {
  createAuth0ManagementApiFromConfig,
  isAuth0ManagementConfigured,
} from "../src/security/auth0/auth0-management-api";

loadDotenv();

/** Auth0 caps each import file at 500KB; stay well under. */
const MAX_FILE_BYTES = 400_000;
const BCRYPT = /^\$2[aby]\$\d{2}\$/;

type V5UserRow = {
  _id: unknown;
  email?: string;
  firstName?: string;
  lastName?: string;
  passwordHash?: string;
  auth0SubjectId?: string | null;
  deletedAt?: Date | null;
  emailVerified?: { status?: string };
};

type Auth0ImportUser = {
  email: string;
  email_verified: boolean;
  given_name?: string;
  family_name?: string;
  name?: string;
  custom_password_hash: { algorithm: "bcrypt"; hash: { value: string } };
  app_metadata: { imsUserId: string; source: "v4-migration" };
};

const redact = (uri: string) => uri.replace(/\/\/[^@/]*@/, "//***@");

function toAuth0User(row: V5UserRow): Auth0ImportUser {
  const email = String(row.email).trim().toLowerCase();
  const given = row.firstName?.trim() || undefined;
  const family = row.lastName?.trim() || undefined;
  const name = [given, family].filter(Boolean).join(" ") || undefined;
  return {
    email,
    // Existing customers who have used this address for years; marking it
    // verified avoids a verify-email wall on their first V5 login.
    email_verified: true,
    ...(given ? { given_name: given } : {}),
    ...(family ? { family_name: family } : {}),
    ...(name ? { name } : {}),
    custom_password_hash: {
      algorithm: "bcrypt",
      hash: { value: String(row.passwordHash) },
    },
    app_metadata: { imsUserId: String(row._id), source: "v4-migration" },
  };
}

function chunkBySize(users: Auth0ImportUser[]): Auth0ImportUser[][] {
  const chunks: Auth0ImportUser[][] = [];
  let current: Auth0ImportUser[] = [];
  let size = 2;
  for (const u of users) {
    const bytes = Buffer.byteLength(JSON.stringify(u)) + 1;
    if (current.length > 0 && size + bytes > MAX_FILE_BYTES) {
      chunks.push(current);
      current = [];
      size = 2;
    }
    current.push(u);
    size += bytes;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const includeNonMembers = process.argv.includes("--include-non-members");
  const config = loadConfig();

  console.log(`Target Mongo: ${redact(config.MONGODB_URI)}`);
  console.log(`Auth0 tenant: ${config.AUTH0_DOMAIN} · connection: ${config.AUTH0_DB_CONNECTION}`);
  console.log(`Mode: ${apply ? "APPLY (writes to Auth0)" : "DRY-RUN (nothing sent)"}`);

  await mongoose.connect(config.MONGODB_URI);
  try {
    const db = mongoose.connection.db!;
    const rows = (await db
      .collection("users")
      .find(
        {},
        {
          projection: {
            email: 1,
            firstName: 1,
            lastName: 1,
            passwordHash: 1,
            auth0SubjectId: 1,
            deletedAt: 1,
            emailVerified: 1,
          },
        },
      )
      .toArray()) as V5UserRow[];

    const memberUserIds = new Set(
      (await db.collection("organisationmemberships").distinct("userId")).map(String),
    );

    const seen = new Set<string>();
    const eligible: V5UserRow[] = [];
    const skipped = { linked: 0, deleted: 0, noBcrypt: 0, badEmail: 0, dupEmail: 0 };
    for (const row of rows) {
      const email = String(row.email ?? "").trim().toLowerCase();
      if (row.auth0SubjectId && String(row.auth0SubjectId).trim()) skipped.linked += 1;
      else if (row.deletedAt) skipped.deleted += 1;
      else if (!email.includes("@")) skipped.badEmail += 1;
      else if (!BCRYPT.test(String(row.passwordHash ?? ""))) skipped.noBcrypt += 1;
      else if (seen.has(email)) skipped.dupEmail += 1;
      else {
        seen.add(email);
        eligible.push(row);
      }
    }
    const withoutMembership = eligible.filter((r) => !memberUserIds.has(String(r._id))).length;
    const selected = includeNonMembers
      ? eligible
      : eligible.filter((r) => memberUserIds.has(String(r._id)));

    console.log(`\nUsers in Mongo: ${rows.length}`);
    console.log(`Eligible for import (bcrypt, not linked, not deleted): ${eligible.length}`);
    console.log(
      `Skipped: already Auth0-linked=${skipped.linked}, deleted=${skipped.deleted}, ` +
        `no bcrypt hash=${skipped.noBcrypt}, invalid email=${skipped.badEmail}, duplicate email=${skipped.dupEmail}`,
    );
    if (withoutMembership > 0) {
      console.log(
        includeNonMembers
          ? `Including ${withoutMembership} user(s) with no organisation membership (--include-non-members).`
          : `Not importing ${withoutMembership} user(s) with no organisation membership (pass --include-non-members to include them).`,
      );
    }
    console.log(`Selected for import: ${selected.length}`);

    const users = selected.map(toAuth0User);
    const chunks = chunkBySize(users);
    console.log(`Import files: ${chunks.length} (≤${Math.round(MAX_FILE_BYTES / 1000)}KB each)`);

    if (!apply) {
      console.log("\nDry run only. Re-run with --apply to import into Auth0.");
      return;
    }

    if (!isAuth0ManagementConfigured(config)) {
      throw new Error("AUTH0_DOMAIN / AUTH0_MGMT_CLIENT_ID / AUTH0_MGMT_CLIENT_SECRET are required");
    }
    const mgmt = createAuth0ManagementApiFromConfig(config)!;
    const connectionId = await mgmt.getConnectionIdByName(config.AUTH0_DB_CONNECTION);
    if (!connectionId) {
      throw new Error(`Auth0 connection "${config.AUTH0_DB_CONNECTION}" not found`);
    }

    const totals = { inserted: 0, duplicates: 0, otherFailures: 0 };
    const errorCodes: Record<string, number> = {};
    const otherErrors: string[] = [];

    for (const [index, chunk] of chunks.entries()) {
      const job = await mgmt.startUsersImport({
        connectionId,
        usersJson: JSON.stringify(chunk),
        upsert: false,
        externalId: `v4-migration-${index + 1}`,
      });
      process.stdout.write(`\nJob ${index + 1}/${chunks.length} (${chunk.length} users) ${job.id} `);

      let status = job.status;
      let summary: { failed: number; inserted: number } | undefined;
      for (let i = 0; i < 400 && (status === "pending" || status === "processing"); i += 1) {
        await sleep(3000);
        const current = await mgmt.getJob(job.id);
        status = current.status;
        summary = current.summary;
        process.stdout.write(".");
      }
      console.log(` ${status}`);
      if (status !== "completed") {
        throw new Error(`Auth0 import job ${job.id} ended with status "${status}"`);
      }

      totals.inserted += summary?.inserted ?? 0;
      if ((summary?.failed ?? 0) > 0) {
        for (const row of await mgmt.getJobErrors(job.id)) {
          for (const err of row.errors ?? []) {
            errorCodes[err.code] = (errorCodes[err.code] ?? 0) + 1;
            if (err.code === "DUPLICATED_USER") totals.duplicates += 1;
            else {
              totals.otherFailures += 1;
              if (otherErrors.length < 30) {
                otherErrors.push(`${row.user?.email ?? "?"}: ${err.code} ${err.message}`);
              }
            }
          }
        }
      }
    }

    console.log("\n======== SUMMARY ========");
    console.log(`Imported with old password: ${totals.inserted}`);
    console.log(`Already in Auth0 (left untouched): ${totals.duplicates}`);
    console.log(`Other failures: ${totals.otherFailures}`);
    if (Object.keys(errorCodes).length) console.log(`Error codes: ${JSON.stringify(errorCodes)}`);
    for (const line of otherErrors) console.log(`  ${line}`);
    console.log("\nNext: pnpm backfill:auth0-identities --all --no-send-reset-email");
    if (totals.otherFailures > 0) process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
  void mongoose.disconnect();
});
