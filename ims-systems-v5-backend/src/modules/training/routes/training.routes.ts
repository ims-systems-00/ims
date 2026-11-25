import { Router } from "express";
import type { Authorizer } from "../../../security";
import { createTrainingController } from "../controllers/training.controller";
import {
  NoOpDocumentModuleLibraryAdapter,
  type DocumentModuleLibraryPort,
} from "../../document-management";
import {
  NoOpTrainingEmailAdapter,
  NoOpTrainingFilesAdapter,
  NoOpTrainingNotificationAdapter,
  NoOpTrainingOrgAdapter,
  NoOpTrainingUsersAdapter,
  type TrainingEmailPort,
  type TrainingFilesPort,
  type TrainingNotificationPort,
  type TrainingOrgPort,
  type TrainingUsersPort,
} from "../ports";
import { createTrainingCompetencyRepository } from "../repositories/training-competency.repository";
import { createTrainingPersonRepository } from "../repositories/training-person.repository";
import { createTrainingRecordRepository } from "../repositories/training-record.repository";
import { createTrainingRoleRepository } from "../repositories/training-role.repository";
import { createTrainingSessionRepository } from "../repositories/training-session.repository";
import { createTrainingSettingsRepository } from "../repositories/training-settings.repository";
import { createTrainingService } from "../services/training.service";

export type TrainingRouterDeps = {
  authorizer: Authorizer;
  clientUrl: string;
  tokenSecret: string;
  email?: TrainingEmailPort;
  files?: TrainingFilesPort;
  org?: TrainingOrgPort;
  users?: TrainingUsersPort;
  notifications?: TrainingNotificationPort;
  documents?: DocumentModuleLibraryPort;
};

export function createTrainingModule(deps: TrainingRouterDeps): {
  service: ReturnType<typeof createTrainingService>;
  router: Router;
} {
  const settings = createTrainingSettingsRepository();
  const competencies = createTrainingCompetencyRepository();
  const roles = createTrainingRoleRepository();
  const people = createTrainingPersonRepository();
  const records = createTrainingRecordRepository();
  const sessions = createTrainingSessionRepository();

  const service = createTrainingService({
    settings,
    competencies,
    roles,
    people,
    records,
    sessions,
    authorizer: deps.authorizer,
    email: deps.email ?? new NoOpTrainingEmailAdapter(),
    files: deps.files ?? new NoOpTrainingFilesAdapter(),
    org: deps.org ?? new NoOpTrainingOrgAdapter(),
    users: deps.users ?? new NoOpTrainingUsersAdapter(),
    notifications: deps.notifications ?? new NoOpTrainingNotificationAdapter(),
    documents: deps.documents ?? new NoOpDocumentModuleLibraryAdapter(),
    clientUrl: deps.clientUrl,
    tokenSecret: deps.tokenSecret,
  });

  const controller = createTrainingController(service);
  const router = Router();

  // Settings & bootstrap
  router.get("/settings", controller.getSettings);
  router.put("/settings", controller.updateSettings);
  router.get("/log", controller.getLog);
  router.post("/bootstrap", controller.ensureCatalogue);

  // Competencies
  router.get("/competencies", controller.listCompetencies);
  router.post("/competencies", controller.createCompetency);
  router.put("/competencies/:id", controller.updateCompetency);
  router.delete("/competencies/:id", controller.archiveCompetency);

  // Roles
  router.get("/roles", controller.listRoles);
  router.post("/roles", controller.createRole);
  router.put("/roles/:id", controller.updateRole);
  router.delete("/roles/:id", controller.removeRole);

  // People (static paths before :id)
  router.get("/people", controller.listPeople);
  router.post("/people", controller.createPerson);
  router.post("/people/external", controller.addExternal);
  router.get("/people/:id", controller.getPerson);
  router.put("/people/:id", controller.updatePerson);
  router.post("/people/:id/leaver", controller.markLeaver);
  router.post("/people/:id/exempt", controller.setExemption);
  router.delete("/people/:id/exempt/:cid", controller.clearExemption);
  router.post("/people/:id/acknowledge", controller.acknowledgePolicy);
  router.post("/people/:id/self-token", controller.issueSelfToken);

  // Records
  router.get("/records", controller.listRecords);
  router.post("/records", controller.createRecord);
  router.post("/records/:id/verify", controller.verifyRecord);

  // Sessions (static action paths before :kind)
  router.get("/sessions", controller.listSessions);
  router.post("/sessions", controller.createSession);
  router.get("/sessions/:id", controller.getSession);
  router.put("/sessions/:id", controller.updateSession);
  router.post("/sessions/:id/complete", controller.completeSession);
  router.post("/sessions/:id/cancel", controller.cancelSession);
  router.post("/sessions/:id/invite", controller.inviteSession);
  router.post("/sessions/:id/rsvp", controller.rsvpSession);
  router.post("/sessions/:id/:kind", controller.addAttachment);
  router.delete(
    "/sessions/:id/:kind/:attachmentId",
    controller.removeAttachment
  );

  // Read models & exports
  router.get("/overview", controller.overview);
  router.get("/matrix", controller.matrix);
  router.get("/gaps", controller.gaps);
  router.get("/plan", controller.plan);
  router.get("/readiness", controller.readiness);
  router.get("/auditor-pack", controller.auditorPack);
  router.get("/export/matrix.csv", controller.exportMatrixCsv);
  router.get("/competent", controller.competent);

  // Public self-service
  router.get("/public/self/:token", controller.getSelfView);
  router.post("/public/self/:token/acknowledge", controller.selfAcknowledge);
  router.post("/public/self/:token/upload", controller.selfUpload);
  router.post(
    "/public/self/:token/prepare-upload",
    controller.prepareSelfUpload
  );

  // Public RSVP
  router.get("/public/rsvp/:token", controller.getRsvpView);
  router.post("/public/rsvp/:token", controller.publicRsvp);

  return { service, router };
}
