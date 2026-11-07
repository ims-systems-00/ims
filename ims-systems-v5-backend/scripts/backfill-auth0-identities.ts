/**
 * Backfill Auth0 identities for migrated Mongo members.
 *
 * For each organisation: ensure Auth0 Organization + DB connection, then for
 * each member with an email ensure Auth0 user + Mongo auth0SubjectId + Auth0
 * org membership. Optionally send change_password emails (default on for
 * real runs) so users can set a password without shared temps.
 *
 * Usage (from ims-systems-v5-backend):
 *   pnpm backfill:auth0-identities --organization-id=<mongoOrgId> --dry-run
 *   pnpm backfill:auth0-identities --organization-id=<mongoOrgId>
 *   pnpm backfill:auth0-identities --all --dry-run
 *   pnpm backfill:auth0-identities --all
 *
 * Flags:
 *   --organization-id=<id>   Process one Mongo organisation (required unless --all)
 *   --all                    Every org that has memberships
 *   --dry-run                Print actions; no Auth0/Mongo writes
 *   --send-reset-email       Send change_password (default on for real runs)
 *   --no-send-reset-email    Skip emails
 *   --force-reset            Email even when user was already linked / existed
 *   --skip-org-provision     Do not create Auth0 org if auth0OrganizationId missing
 *
 * After this script, run: pnpm backfill:openfga-memberships
 */
import { config as loadDotenv } from "dotenv";
import mongoose from "mongoose";
import { loadConfig } from "../src/config";
import { toAuth0OrgName } from "../src/modules/organisation/adapters/auth0-organisation.adapter";
import { createOrganisationMembershipRepository } from "../src/modules/organisation/repositories/organisation-membership.repository";
import { createOrganisationRepository } from "../src/modules/organisation/repositories/organisation.repository";
import { createUserRepository } from "../src/modules/users/repositories/user.repository";
import {
  createAuth0ManagementApiFromConfig,
  isAuth0ManagementConfigured,
  type Auth0ManagementApi,
} from "../src/security/auth0/auth0-management-api";

loadDotenv();

type CliFlags = {
  organizationId: string | null;
  all: boolean;
  dryRun: boolean;
  sendResetEmail: boolean;
  forceReset: boolean;
  skipOrgProvision: boolean;
};

type OrgSummary = {
  organizationId: string;
  name: string;
  auth0OrganizationId: string | null;
  linked: number;
  created: number;
  reused: number;
  emailed: number;
  skippedAlreadyLinked: number;
  failed: number;
  errors: string[];
};

const parseFlags = (argv: string[]): CliFlags => {
  const flags: CliFlags = {
    organizationId: null,
    all: false,
    dryRun: false,
    sendResetEmail: true,
    forceReset: false,
    skipOrgProvision: false,
  };
  for (const arg of argv) {
    if (arg === "--all") flags.all = true;
    else if (arg === "--dry-run") flags.dryRun = true;
    else if (arg === "--send-reset-email") flags.sendResetEmail = true;
    else if (arg === "--no-send-reset-email") flags.sendResetEmail = false;
    else if (arg === "--force-reset") flags.forceReset = true;
    else if (arg === "--skip-org-provision") flags.skipOrgProvision = true;
    else if (arg.startsWith("--organization-id=")) {
      flags.organizationId = arg.slice("--organization-id=".length).trim() || null;
    }
  }
  if (flags.dryRun) flags.sendResetEmail = false;
  return flags;
};

async function ensureAuth0Org(deps: {
  mgmt: Auth0ManagementApi;
  organisations: ReturnType<typeof createOrganisationRepository>;
  org: { id: string; name: string; auth0OrganizationId: string | null };
  dbConnection: string;
  dryRun: boolean;
  skipOrgProvision: boolean;
}): Promise<string> {
  const existing = deps.org.auth0OrganizationId?.trim();
  if (existing) {
    if (!deps.dryRun) {
      const connectionId = await deps.mgmt.getConnectionIdByName(deps.dbConnection);
      if (connectionId) {
        await deps.mgmt.enableOrganizationConnection({
          organizationId: existing,
          connectionId,
        });
      }
    }
    return existing;
  }
  if (deps.skipOrgProvision) {
    throw new Error(
      `Organisation ${deps.org.id} has no auth0OrganizationId and --skip-org-provision was set`,
    );
  }
  const name = toAuth0OrgName(deps.org.id, deps.org.name);
  if (deps.dryRun) {
    console.log(
      `  [dry-run] would ensure Auth0 org name=${name} display=${deps.org.name}`,
    );
    return `dry-run-org-${deps.org.id}`;
  }
  const found = await deps.mgmt.getOrganizationByName(name);
  const created =
    found ??
    (await deps.mgmt.createOrganization({
      name,
      displayName: deps.org.name,
    }));
  await deps.organisations.linkAuth0OrganizationId(deps.org.id, created.id);
  const connectionId = await deps.mgmt.getConnectionIdByName(deps.dbConnection);
  if (connectionId) {
    await deps.mgmt.enableOrganizationConnection({
      organizationId: created.id,
      connectionId,
    });
  } else {
    console.warn(
      `  WARN: Auth0 connection "${deps.dbConnection}" not found; enable it on the org in Dashboard`,
    );
  }
  console.log(`  Linked Auth0 org ${created.id} (${name})`);
  return created.id;
}

async function processOrganisation(deps: {
  mgmt: Auth0ManagementApi;
  organisations: ReturnType<typeof createOrganisationRepository>;
  memberships: ReturnType<typeof createOrganisationMembershipRepository>;
  users: ReturnType<typeof createUserRepository>;
  organizationId: string;
  dbConnection: string;
  flags: CliFlags;
}): Promise<OrgSummary> {
  const org = await deps.organisations.findById(deps.organizationId);
  if (!org) {
    throw new Error(`Organisation not found: ${deps.organizationId}`);
  }

  const summary: OrgSummary = {
    organizationId: org.id,
    name: org.name,
    auth0OrganizationId: org.auth0OrganizationId,
    linked: 0,
    created: 0,
    reused: 0,
    emailed: 0,
    skippedAlreadyLinked: 0,
    failed: 0,
    errors: [],
  };

  console.log(`\n=== ${org.name} (${org.id}) ===`);
  const auth0OrgId = await ensureAuth0Org({
    mgmt: deps.mgmt,
    organisations: deps.organisations,
    org,
    dbConnection: deps.dbConnection,
    dryRun: deps.flags.dryRun,
    skipOrgProvision: deps.flags.skipOrgProvision,
  });
  summary.auth0OrganizationId = auth0OrgId;

  const rows = await deps.memberships.listByOrganization(org.id);
  console.log(`  Members: ${rows.length}`);

  for (const row of rows) {
    const user = await deps.users.findById(row.userId);
    if (!user) {
      summary.failed += 1;
      summary.errors.push(`missing user ${row.userId}`);
      console.error(`  FAIL member ${row.userId}: user document missing`);
      continue;
    }
    const email = user.email?.trim().toLowerCase();
    if (!email) {
      summary.failed += 1;
      summary.errors.push(`no email for user ${user.id}`);
      console.error(`  FAIL ${user.id}: no email`);
      continue;
    }

    try {
      const alreadyLinked = Boolean(user.auth0SubjectId?.trim());
      let auth0SubjectId = user.auth0SubjectId?.trim() || null;
      let created = false;
      let reused = false;

      if (alreadyLinked) {
        summary.skippedAlreadyLinked += 1;
        console.log(
          `  SKIP linked ${email} → ${auth0SubjectId} (ensure Auth0 org membership)`,
        );
      } else if (deps.flags.dryRun) {
        const existing = await deps.mgmt.getUserByEmail(email);
        if (existing?.user_id) {
          reused = true;
          auth0SubjectId = existing.user_id;
          console.log(
            `  [dry-run] would link ${email} → ${existing.user_id} (reuse)`,
          );
        } else {
          created = true;
          auth0SubjectId = `dry-run|${email}`;
          console.log(`  [dry-run] would create+link Auth0 user for ${email}`);
        }
      } else {
        const ensured = await deps.mgmt.ensureUserByEmail({
          email,
          connection: deps.dbConnection,
          emailVerified: true,
          name: user.name || `${user.firstName} ${user.lastName}`.trim(),
        });
        auth0SubjectId = ensured.user.user_id;
        created = ensured.created;
        reused = !ensured.created;
        await deps.users.linkAuth0SubjectId(user.id, auth0SubjectId);
        console.log(
          `  LINK ${email} → ${auth0SubjectId} (${created ? "created" : "reused"})`,
        );
      }

      if (auth0SubjectId && !deps.flags.dryRun) {
        await deps.mgmt.addOrganizationMembers(auth0OrgId, [auth0SubjectId]);
      } else if (auth0SubjectId && deps.flags.dryRun) {
        console.log(
          `  [dry-run] would add ${auth0SubjectId} to Auth0 org ${auth0OrgId}`,
        );
      }

      if (created) summary.created += 1;
      else if (reused) summary.reused += 1;
      if (!alreadyLinked && auth0SubjectId) summary.linked += 1;

      const shouldEmail =
        deps.flags.sendResetEmail &&
        (deps.flags.forceReset || created || (!alreadyLinked && reused));
      if (shouldEmail && email) {
        if (deps.flags.dryRun) {
          console.log(`  [dry-run] would send change_password to ${email}`);
        } else {
          await deps.mgmt.sendChangePasswordEmail({
            email,
            connection: deps.dbConnection,
          });
          summary.emailed += 1;
          console.log(`  EMAIL change_password → ${email}`);
        }
      }
    } catch (error) {
      summary.failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      summary.errors.push(`${email}: ${message}`);
      console.error(`  FAIL ${email}:`, message);
    }
  }

  return summary;
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  if (!flags.all && !flags.organizationId) {
    throw new Error(
      "Pass --organization-id=<mongoOrgId> or --all. See docs/security/AUTH0_IDENTITY_BACKFILL.md",
    );
  }

  const config = loadConfig();
  if (!isAuth0ManagementConfigured(config)) {
    throw new Error(
      "Auth0 Management API not configured (AUTH0_DOMAIN + AUTH0_MGMT_CLIENT_ID + AUTH0_MGMT_CLIENT_SECRET)",
    );
  }
  const mgmt = createAuth0ManagementApiFromConfig(config);
  if (!mgmt) {
    throw new Error("Failed to create Auth0 Management API client");
  }

  await mongoose.connect(config.MONGODB_URI);
  console.log("Connected to MongoDB");
  console.log(
    `Mode: ${flags.dryRun ? "DRY-RUN" : "APPLY"} | reset emails: ${flags.sendResetEmail ? "on" : "off"} | force-reset: ${flags.forceReset}`,
  );

  const organisations = createOrganisationRepository();
  const memberships = createOrganisationMembershipRepository();
  const users = createUserRepository();

  let orgIds: string[] = [];
  if (flags.all) {
    const all = await memberships.listAll();
    orgIds = [...new Set(all.map((m) => m.organizationId))];
    console.log(`--all: ${orgIds.length} organisations with memberships`);
  } else if (flags.organizationId) {
    orgIds = [flags.organizationId];
  }

  const summaries: OrgSummary[] = [];
  for (const organizationId of orgIds) {
    const summary = await processOrganisation({
      mgmt,
      organisations,
      memberships,
      users,
      organizationId,
      dbConnection: config.AUTH0_DB_CONNECTION,
      flags,
    });
    summaries.push(summary);
  }

  console.log("\n======== SUMMARY ========");
  let linked = 0;
  let created = 0;
  let emailed = 0;
  let failed = 0;
  for (const s of summaries) {
    linked += s.linked;
    created += s.created;
    emailed += s.emailed;
    failed += s.failed;
    console.log(
      `${s.name}: linked=${s.linked} created=${s.created} reused=${s.reused} already=${s.skippedAlreadyLinked} emailed=${s.emailed} failed=${s.failed} auth0Org=${s.auth0OrganizationId}`,
    );
  }
  console.log(
    `TOTAL: orgs=${summaries.length} linked=${linked} created=${created} emailed=${emailed} failed=${failed}`,
  );
  console.log(
    "Next: pnpm backfill:openfga-memberships  (project Mongo roles into OpenFGA)",
  );

  await mongoose.disconnect();
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
  void mongoose.disconnect();
});
