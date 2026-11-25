/**
 * Seed Relyable demo settings + evidence for a given organisation.
 *
 * Usage (from ims-systems-v5-backend):
 *   pnpm seed:relyable
 *   ORG_ID=65cdfa93b05b1d6e6f4a392c pnpm seed:relyable
 */
import { config as loadDotenv } from "dotenv";
import mongoose from "mongoose";
import { loadConfig } from "../src/config";
import { createLiveRelyableCollectors } from "../src/modules/relyable/adapters";
import {
  compute,
  defaultScope,
  registerEvidenceFromFacts,
} from "../src/modules/relyable/lib/relyable-rules";
import { createRelyableEvidenceRepository } from "../src/modules/relyable/repositories/relyable-evidence.repository";
import { getRelyableSettingsModel } from "../src/modules/relyable/repositories/relyable-settings.model";
import { createRelyableSnapshotRepository } from "../src/modules/relyable/repositories/relyable-snapshot.repository";

loadDotenv();

const ORG_ID = process.env.ORG_ID?.trim() || "65cdfa93b05b1d6e6f4a392c";

async function main() {
  const config = loadConfig();
  await mongoose.connect(config.MONGODB_URI);
  console.log("Connected. Seeding Relyable for", ORG_ID);

  const Settings = getRelyableSettingsModel();
  const scope = defaultScope({ sic: ["25620"], employees: 120 });
  scope.family = "engineering";
  scope.sizeBand = "51-250";
  scope.attrs = {
    employs: 1,
    sites: 0,
    premises: 1,
    contractor: 0,
    vehicles: 0,
    lifting: 1,
    food: 0,
    regulated: 0,
    data: 0,
  };
  scope.confirmed = true;

  await Settings.findOneAndUpdate(
    { organizationId: ORG_ID },
    {
      $set: {
        organizationId: ORG_ID,
        companyNumber: "04871234",
        legalName: "Northfield Engineering Ltd",
        sic: ["25620"],
        employees: 120,
        scope,
        facts: {},
        listedCertifications: ["ISO 9001", "ISO 45001"],
        enabled: true,
        lastSyncedAt: new Date(),
        updatedBy: "relyable-demo-seed",
        updatedOn: new Date(),
      },
    },
    { upsert: true }
  );

  const evidence = createRelyableEvidenceRepository();
  const collectors = createLiveRelyableCollectors();
  const day = new Date().toISOString().slice(0, 10);
  const collected = (
    await Promise.all(collectors.map((c) => c.collect(ORG_ID)))
  ).flat();
  const rows = [
    ...registerEvidenceFromFacts({}, day).map((r) => ({
      type: r.type,
      status: r.status,
      observedAt: r.observedAt,
      validUntil: r.validUntil ?? null,
      payload: r.payload ?? {},
      level: r.level,
      source: "ingest:registers" as const,
    })),
    ...collected,
  ];

  const written = await evidence.emitMany(ORG_ID, rows);
  console.log(
    `Evidence: ${written.emitted} new, ${written.duplicates} duplicates`
  );

  const current = await evidence.current(ORG_ID);
  const settingsDoc = await Settings.findOne({ organizationId: ORG_ID }).lean();
  const result = compute({
    scope,
    items: current.map((e) => ({
      type: e.type,
      status: e.status,
      observedAt: e.observedAt,
      validUntil: e.validUntil,
      payload: e.payload,
      level: e.level,
      disputed: e.disputed,
    })),
    facts: {},
  });
  const snapshots = createRelyableSnapshotRepository();
  const snap = await snapshots.create(ORG_ID, result, "seed");
  console.log(
    `Snapshot: ${snap.score} band ${snap.band} tier ${snap.tier} (listed=${(settingsDoc as { listedCertifications?: string[] } | null)?.listedCertifications?.join(", ")})`
  );

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
