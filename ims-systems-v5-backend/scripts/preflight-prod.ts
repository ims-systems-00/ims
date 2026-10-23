/**
 * Staging / production preflight (LIC-01).
 *
 *   pnpm preflight:prod [--offline] [--organization-id <orgId>]
 *
 * Validates the production config matrix (Auth0+OpenFGA, Stripe key mode,
 * email deliverability, per-org S3 buckets, https CLIENT_URL) and, unless
 * --offline, probes connectivity (Mongo, Auth0 JWKS, OpenFGA model, S3,
 * Redis, Stripe prices). Exits 1 when any check FAILs.
 *
 * Secrets are never printed — only check ids, areas and messages.
 */
import "dotenv/config";
import { loadConfig } from "../src/config";
import {
  evaluateProdConfig,
  runConnectivityChecks,
  summarizePreflight,
  type PreflightCheck,
} from "../src/infrastructure/preflight/prod-preflight";

const args = process.argv.slice(2);
const offline = args.includes("--offline");
const orgFlag = args.indexOf("--organization-id");
const organizationId = orgFlag >= 0 ? args[orgFlag + 1] : undefined;

const icon = (c: PreflightCheck) =>
  c.status === "pass" ? "PASS" : c.status === "warn" ? "WARN" : "FAIL";

async function main() {
  const config = loadConfig();
  const checks = [...evaluateProdConfig(config)];
  if (!offline) checks.push(...(await runConnectivityChecks(config, { organizationId })));

  for (const c of checks) console.log(`[${icon(c)}] ${c.area}/${c.id} — ${c.message}`);
  const s = summarizePreflight(checks);
  console.log(`\nPreflight: ${s.pass} pass, ${s.warn} warn, ${s.fail} fail`);
  if (s.fail > 0) {
    console.log("Fix every FAIL before the staging smoke (docs/security/CUTOVER_CHECKLIST.md).");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`Preflight crashed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
