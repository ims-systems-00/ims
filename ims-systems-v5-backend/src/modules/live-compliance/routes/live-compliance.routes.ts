import { Router } from "express";
import type { Authorizer } from "../../../security";
import type { ComplianceApplicationPort } from "../../compliance";
import { createLiveSnapshotCollectors } from "../adapters/collectors";
import type { EventBus } from "../../../infrastructure/events/event-bus";
import { createLiveComplianceController } from "../controllers/live-compliance.controller";
import { createLiveStreamController } from "../controllers/live-stream.controller";
import type {
  AdviceCommandRegistry,
  LiveClauseStorePort,
  LiveComplianceEmailPort,
  LiveComplianceNotificationsPort,
  LiveComplianceRecipientsPort,
  SnapshotCollectorPort,
} from "../ports";
import { createLiveComplianceRepository } from "../repositories/live-compliance.repository";
import {
  createLiveComplianceNotifier,
  type LiveComplianceNotifier,
} from "../services/live-compliance-notifier";
import {
  createLiveComplianceRuntime,
  type LiveComplianceRuntime,
} from "../services/live-compliance-runtime";
import {
  createLiveComplianceService,
  type LiveComplianceService,
} from "../services/live-compliance.service";
import { createLiveStreamHub, type LiveStreamHub } from "../services/live-stream-hub";
import { LIVE_STANDARDS } from "../types";
import { createAliceController } from "../alice/alice.controller";
import { createAliceDraftRepository } from "../alice/alice-draft.repository";
import { createAliceRecordsAdapter } from "../alice/alice-records.adapter";
import {
  createAliceService,
  type AliceApplyRegistry,
  type AliceModelPort,
  type AliceService,
} from "../alice/alice.service";
import type { AliceRecordsPort } from "../alice/tasks";

export type LiveComplianceRouterDeps = {
  authorizer: Authorizer;
  compliance: Pick<
    ComplianceApplicationPort,
    "frameworkPercentages" | "listClauseHealthRows" | "applyClauseHealth"
  > &
    Partial<Pick<ComplianceApplicationPort, "listOrganizationIdsWithToolkits">>;
  collectors?: SnapshotCollectorPort[];
  commands?: AdviceCommandRegistry;
  now?: () => Date;
  staleMs?: number;
  logger?: {
    info(obj: unknown, msg?: string): void;
    warn(obj: unknown, msg?: string): void;
    error(obj: unknown, msg?: string): void;
  };
  /** Phase 2: record-change events trigger debounced recalculation. */
  bus?: EventBus;
  /** Phase 2: notifications on transitions / new advice (+ digest). */
  notify?: {
    notifications: LiveComplianceNotificationsPort;
    recipients: LiveComplianceRecipientsPort;
    email?: LiveComplianceEmailPort;
    appUrl: string;
  };
  /** Admin check for the action centre. */
  people?: { isAdmin(organizationId: string, userId: string): Promise<boolean> };
  /** Debounce for record-change recalcs (default 2s). */
  debounceMs?: number;
  /** Live stream heartbeat (default 25s). */
  heartbeatMs?: number;
  /** Phase 3: ALICE drafts with approval. */
  alice?: {
    model: AliceModelPort;
    apply: AliceApplyRegistry;
    records?: AliceRecordsPort;
    organisationName?: (organizationId: string) => Promise<string | null>;
    displayName?: (userId: string) => Promise<string | null>;
  };
};

export function createComplianceClauseStore(
  compliance: LiveComplianceRouterDeps["compliance"]
): LiveClauseStorePort {
  return {
    async provisionedToolkits(organizationId) {
      return (await compliance.frameworkPercentages(organizationId)).map((f) => f.name);
    },
    listRows: (organizationId, toolkits, clauses) =>
      compliance.listClauseHealthRows(organizationId, toolkits, clauses),
    applyHealth: (organizationId, updates) =>
      compliance.applyClauseHealth(organizationId, updates),
  };
}

/**
 * Compose Live Compliance. Mounted at /api/v1/live-compliance
 */
export function createLiveComplianceModule(deps: LiveComplianceRouterDeps): {
  service: LiveComplianceService;
  router: Router;
  hub: LiveStreamHub;
  runtime: LiveComplianceRuntime;
  notifier: LiveComplianceNotifier | null;
  alice: AliceService | null;
} {
  const repository = createLiveComplianceRepository();
  const service = createLiveComplianceService({
    authorizer: deps.authorizer,
    repository,
    clauses: createComplianceClauseStore(deps.compliance),
    collectors: deps.collectors ?? createLiveSnapshotCollectors(),
    commands: deps.commands,
    now: deps.now,
    staleMs: deps.staleMs,
    logger: deps.logger,
    ...(deps.people ? { people: deps.people } : {}),
  });
  const hub = createLiveStreamHub();
  const notifier = deps.notify
    ? createLiveComplianceNotifier({ ...deps.notify, logger: deps.logger })
    : null;

  service.onRecalculated((result) => {
    hub.publishRecalc(result);
  });
  if (notifier) {
    service.onRecalculated(async (result) => {
      const outcome = await notifier.handleRecalc(result);
      if (outcome.inApp) {
        hub.publish(
          result.organizationId,
          { type: "notification.created", data: { count: outcome.inApp } },
          outcome.recipientUserIds
        );
      }
    });
  }

  const listOrganizationIds = deps.compliance.listOrganizationIdsWithToolkits;
  const runtime = createLiveComplianceRuntime({
    service,
    repository,
    ...(notifier ? { notifier } : {}),
    ...(deps.bus ? { bus: deps.bus } : {}),
    listOrganizationIds: listOrganizationIds
      ? () => listOrganizationIds([...LIVE_STANDARDS])
      : async () => [],
    ...(deps.debounceMs !== undefined ? { debounceMs: deps.debounceMs } : {}),
    ...(deps.now ? { now: deps.now } : {}),
    ...(deps.logger ? { logger: deps.logger } : {}),
  });
  // Event-driven recalcs are cheap and per-request; attach immediately.
  // The hourly sweep + digest start with the app's background jobs.
  runtime.attach();

  const controller = createLiveComplianceController(service);
  const streamController = createLiveStreamController({
    service,
    hub,
    ...(deps.heartbeatMs ? { heartbeatMs: deps.heartbeatMs } : {}),
  });
  const router = Router();

  router.get("/health", controller.health);
  router.get("/modules/:module", controller.moduleHealth);
  router.get("/advice", controller.advice);
  router.post("/advice/:id/snooze", controller.snooze);
  router.post("/advice/:id/action", controller.runAction);
  router.get("/activity", controller.activity);
  router.get("/stream", streamController.stream);
  router.get("/action-centre", controller.actionCentre);
  router.get("/journey", controller.journey);
  router.post("/journey/:step/complete", controller.setJourneyStep);

  const alice = deps.alice
    ? createAliceService({
        authorizer: deps.authorizer,
        live: service,
        drafts: createAliceDraftRepository(),
        activity: repository,
        model: deps.alice.model,
        records: deps.alice.records ?? createAliceRecordsAdapter(),
        apply: deps.alice.apply,
        ...(deps.alice.organisationName ? { organisationName: deps.alice.organisationName } : {}),
        ...(deps.alice.displayName ? { displayName: deps.alice.displayName } : {}),
        ...(deps.now ? { now: deps.now } : {}),
      })
    : null;
  if (alice) {
    const aliceController = createAliceController(alice);
    router.get("/alice/tasks", aliceController.tasks);
    router.post("/alice/tasks/:task/run", aliceController.run);
    router.get("/alice/drafts", aliceController.listDrafts);
    router.get("/alice/drafts/:id", aliceController.getDraft);
    router.post("/alice/drafts/:id/approve", aliceController.approve);
    router.post("/alice/drafts/:id/discard", aliceController.discard);
  }

  return { service, router, hub, runtime, notifier, alice };
}
