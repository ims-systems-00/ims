import { config as loadDotenv } from "dotenv";
import type { MigrateCliOptions, MigrateWave } from "./types";

loadDotenv();

function parseWave(raw: string | undefined): MigrateWave {
  if (!raw || raw === "all") return "all";
  if (raw === "1-4") return "1-4";
  const n = Number(raw);
  if ([0, 1, 2, 3, 4, 5].includes(n)) return n as MigrateWave;
  throw new Error(
    `Invalid --wave=${raw}. Use 0|1|2|3|4|5|all|1-4`
  );
}

export function parseCliArgs(argv: string[]): MigrateCliOptions {
  let wave: MigrateWave = "all";
  let dryRun =
    process.env.MIGRATE_DRY_RUN === "true" ||
    process.env.MIGRATE_DRY_RUN === "1";
  let validateOnly = false;
  let tenantDbs: string[] | null = null;
  let reportPath: string | null = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") dryRun = true;
    else if (arg === "--validate-only") validateOnly = true;
    else if (arg.startsWith("--wave=")) wave = parseWave(arg.slice(7));
    else if (arg === "--wave") wave = parseWave(argv[++i]);
    else if (arg.startsWith("--tenant=")) {
      tenantDbs = arg
        .slice(9)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (arg === "--tenant") {
      tenantDbs = String(argv[++i] ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (arg.startsWith("--report=")) reportPath = arg.slice(9);
    else if (arg === "--report") reportPath = argv[++i] ?? null;
  }

  if (process.env.V4_TENANT_DBS && !tenantDbs) {
    tenantDbs = process.env.V4_TENANT_DBS.split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return { wave, dryRun, validateOnly, tenantDbs, reportPath };
}

export function loadMigrateEnv(): {
  v5Uri: string;
  v4UriBase: string;
  adminDbName: string;
} {
  const v5Uri = process.env.MONGODB_URI;
  if (!v5Uri) {
    throw new Error("MONGODB_URI is required (V5 target database)");
  }

  const v4UriBase =
    process.env.V4_MONGO_URI ??
    process.env.MONGO_URI ??
    "";
  if (!v4UriBase) {
    throw new Error(
      "V4_MONGO_URI (or MONGO_URI) is required — cluster URI without DB name"
    );
  }

  const adminDbName =
    process.env.V4_ADMIN_DB ?? process.env.ADMIN_DB ?? "ims_admin";

  return {
    v5Uri,
    v4UriBase: v4UriBase.replace(/\/$/, ""),
    adminDbName,
  };
}

export function wavesToRun(wave: MigrateWave): number[] {
  if (wave === "all") return [0, 1, 2, 3, 4, 5];
  if (wave === "1-4") return [1, 2, 3, 4];
  return [wave];
}
