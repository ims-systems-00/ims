import type { MigrateContext, TenantHandle, WaveReport } from "../types";
import { countV5 } from "../validation";

/**
 * Wave 5 does not invent Auth0 users/orgs. It prints the post-Mongo cutover
 * runbook and verifies membership rows exist for OpenFGA backfill.
 */
export async function runWave5(
  tenant: TenantHandle,
  ctx: MigrateContext
): Promise<WaveReport> {
  const startedAt = new Date().toISOString();
  const notes: string[] = [];

  const orgs = await countV5("organisations");
  const users = await countV5("users");
  const memberships = await countV5("organisationmemberships");

  notes.push(`V5 organisations=${orgs}, users=${users}, memberships=${memberships}`);
  notes.push(
    "1) Link Auth0 Organizations → Organisation.auth0OrganizationId (see docs/security/AUTH0_IDENTITY_BACKFILL.md)"
  );
  notes.push(
    "2) Link Auth0 users → User.auth0SubjectId for each member who must sign in"
  );
  notes.push(
    "3) Ensure Auth0 org membership matches Mongo OrganisationMembership"
  );
  notes.push(
    "4) Run: pnpm backfill:openfga-memberships (requires SECURITY_PROVIDER=auth0-openfga)"
  );
  notes.push(
    "5) Follow docs/security/CUTOVER_CHECKLIST.md before pointing production traffic"
  );
  notes.push(
    "Optional: compute nextNudgeAt from due/escalation rules after cutover if product requires continuity"
  );
  notes.push("Skip migrating historical AI chat threads / analyser responses unless requested");

  if (ctx.dryRun) {
    notes.push("Dry-run: no Auth0/OpenFGA side effects were performed.");
  }

  return {
    wave: 5,
    tenantDb: tenant.dbName,
    organizationId: tenant.organizationId,
    dryRun: ctx.dryRun,
    startedAt,
    finishedAt: new Date().toISOString(),
    entities: [
      {
        collection: "auth0+openfga",
        v4Count: 0,
        migrated: 0,
        skipped: memberships,
        failed: 0,
        errors: [],
      },
    ],
    orphanFks: [],
    notes,
  };
}
