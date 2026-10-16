/**
 * Backfill OpenFGA membership tuples from Mongo OrganisationMembership.
 *
 * Requires SECURITY_PROVIDER=auth0-openfga and valid OPENFGA_* env.
 * Idempotent writes (OpenFGA write of an existing tuple is safe).
 *
 * Usage (from ims-systems-v5-backend):
 *   pnpm backfill:openfga-memberships
 *
 * Staging checklist: run after Auth0 identity links exist; verify a Super Admin
 * can read organisation; spot-check Basic cannot manage.
 */
import { config as loadDotenv } from "dotenv";
import mongoose from "mongoose";
import { loadConfig } from "../src/config";
import { createOrganisationMembershipRepository } from "../src/modules/organisation/repositories/organisation-membership.repository";
import { createMembershipProjection } from "../src/security/openfga/membership-projection";
import { createOpenFgaSdkGateway } from "../src/security/openfga/sdk-gateway";

loadDotenv();

async function main(): Promise<void> {
  const config = loadConfig();
  if (config.SECURITY_PROVIDER !== "auth0-openfga") {
    throw new Error(
      "Set SECURITY_PROVIDER=auth0-openfga before running OpenFGA membership backfill"
    );
  }

  await mongoose.connect(config.MONGODB_URI);
  console.log("Connected to MongoDB");

  const gateway = createOpenFgaSdkGateway(config);
  const projection = createMembershipProjection(gateway);
  const memberships = createOrganisationMembershipRepository();
  const rows = await memberships.listAll();

  let written = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await projection.onMembershipCreated({
        userId: row.userId,
        organizationId: row.organizationId,
        role: row.role,
      });
      written += 1;
      console.log(
        `OK ${row.userId} → ${row.organizationId} (${row.role})`
      );
    } catch (error) {
      failed += 1;
      console.error(
        `FAIL ${row.userId} → ${row.organizationId}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  console.log(
    `Backfill complete: ${written} written, ${failed} failed, ${rows.length} total`
  );
  await mongoose.disconnect();
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
  void mongoose.disconnect();
});
