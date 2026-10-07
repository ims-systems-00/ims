/**
 * Seed global Compliance control catalogues from V4 JSON exports.
 *
 * Usage (from ims-systems-v5-backend):
 *   pnpm seed:compliance-catalogues
 *
 * Expects JSON files at:
 *   ../ims-systems-backend/scripts/data/compliance/
 */

import { config as loadDotenv } from "dotenv";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../src/config";
import { createLogger } from "../src/infrastructure/logging/logger";
import { createMongoConnection } from "../src/infrastructure/mongodb/connection";
import {
  buildCatalogueFromJson,
  TOOLKIT_JSON_FILES,
  COMPLIANCE_TOOLKIT_NAMES,
  createComplianceControlRepository,
  type ComplianceToolkitName,
} from "../src/modules/compliance";

loadDotenv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({ level: config.LOG_LEVEL });
  const mongo = createMongoConnection({
    uri: config.MONGODB_URI,
    logger,
  });
  await mongo.connect();

  const catalogueRoot = path.resolve(
    __dirname,
    "../../ims-systems-backend/scripts/data/compliance"
  );
  const repository = createComplianceControlRepository();

  try {
    for (const name of COMPLIANCE_TOOLKIT_NAMES) {
      const fileName = TOOLKIT_JSON_FILES[name as ComplianceToolkitName];
      const filePath = path.join(catalogueRoot, fileName);
      const raw = JSON.parse(await readFile(filePath, "utf8"));
      const rows = buildCatalogueFromJson(name, raw);
      const written = await repository.upsertCatalogue(name, rows);
      logger.info(
        { toolkit: name, file: fileName, controls: written },
        "Compliance catalogue seeded"
      );
    }
  } finally {
    await mongo.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
