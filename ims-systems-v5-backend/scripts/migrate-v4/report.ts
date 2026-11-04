import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { EntityStat, WaveReport } from "./types";

export function emptyEntityStat(collection: string, v4Count = 0): EntityStat {
  return {
    collection,
    v4Count,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };
}

export function printWaveReport(report: WaveReport): void {
  console.log(
    `\n=== Wave ${report.wave} · tenant=${report.tenantDb} · org=${report.organizationId ?? "n/a"} · dryRun=${report.dryRun} ===`
  );
  for (const e of report.entities) {
    console.log(
      `  ${e.collection}: v4=${e.v4Count} migrated=${e.migrated} skipped=${e.skipped} failed=${e.failed}`
    );
    for (const err of e.errors.slice(0, 5)) {
      console.log(`    ! ${err}`);
    }
    if (e.errors.length > 5) {
      console.log(`    … ${e.errors.length - 5} more errors`);
    }
  }
  if (report.orphanFks.length > 0) {
    console.log(`  Orphan FKs: ${report.orphanFks.length}`);
    for (const hit of report.orphanFks.slice(0, 10)) {
      console.log(
        `    ${hit.collection}:${hit.docId} ${hit.field}=${hit.value} (expected ${hit.expectedCollection})`
      );
    }
  }
  for (const note of report.notes) {
    console.log(`  note: ${note}`);
  }
}

export async function writeReports(
  reports: WaveReport[],
  reportPath: string | null
): Promise<void> {
  if (!reportPath) return;
  const abs = path.resolve(reportPath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, JSON.stringify(reports, null, 2), "utf8");
  console.log(`Wrote migration report → ${abs}`);
}
