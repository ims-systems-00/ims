import { Router } from "express";
import type { Authorizer } from "../../../security";
import { createRelyableController } from "../controllers/relyable.controller";
import {
  NoOpRelyableEvidenceCollector,
  NoOpRelyableOrgAdapter,
  type RelyableEvidenceCollectorPort,
  type RelyableOrgPort,
} from "../ports";
import { createRelyableEvidenceRepository } from "../repositories/relyable-evidence.repository";
import { createRelyableSettingsRepository } from "../repositories/relyable-settings.repository";
import { createRelyableSnapshotRepository } from "../repositories/relyable-snapshot.repository";
import { createRelyableService } from "../services/relyable.service";

export type RelyableRouterDeps = {
  authorizer: Authorizer;
  collectors?: RelyableEvidenceCollectorPort[];
  org?: RelyableOrgPort;
};

export function createRelyableModule(deps: RelyableRouterDeps): {
  service: ReturnType<typeof createRelyableService>;
  router: Router;
} {
  const settings = createRelyableSettingsRepository();
  const evidence = createRelyableEvidenceRepository();
  const snapshots = createRelyableSnapshotRepository();

  const service = createRelyableService({
    settings,
    evidence,
    snapshots,
    authorizer: deps.authorizer,
    collectors: deps.collectors?.length
      ? deps.collectors
      : [new NoOpRelyableEvidenceCollector()],
    org: deps.org ?? new NoOpRelyableOrgAdapter(),
  });

  const controller = createRelyableController(service);
  const router = Router();

  router.get("/settings", controller.getSettings);
  router.put("/settings", controller.updateSettings);
  router.put("/scope", controller.updateScope);
  router.get("/dashboard", controller.getDashboard);
  router.get("/rating", controller.getRating);
  router.get("/evidence", controller.listEvidence);
  router.post("/evidence", controller.emitEvidence);
  router.post("/evidence/batch", controller.emitBatch);
  router.post("/sync", controller.sync);
  router.get("/standard", controller.getStandard);

  return { service, router };
}
