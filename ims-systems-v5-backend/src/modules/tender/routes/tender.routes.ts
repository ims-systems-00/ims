import { Router } from "express";
import type { Authorizer } from "../../../security";
import {
  NoOpDocumentModuleLibraryAdapter,
  type DocumentModuleLibraryPort,
} from "../../document-management";
import { createTenderController } from "../controllers/tender.controller";
import {
  NoOpTenderAliceAdapter,
  NoOpTenderEmailAdapter,
  NoOpTenderFilesAdapter,
  NoOpTenderNotificationAdapter,
  NoOpTenderOrgAdapter,
  NoOpTenderUsersAdapter,
  type TenderAlicePort,
  type TenderEmailPort,
  type TenderFilesPort,
  type TenderNotificationPort,
  type TenderOrgPort,
  type TenderUsersPort,
} from "../ports";
import { createTenderAnswerRepository } from "../repositories/tender-answer.repository";
import { createTenderAuditLogRepository } from "../repositories/tender-audit-log.repository";
import { createTenderCaseRepository } from "../repositories/tender-case.repository";
import { createTenderCertificateRepository } from "../repositories/tender-certificate.repository";
import { createTenderPolicyRepository } from "../repositories/tender-policy.repository";
import { createTenderQuestionnaireRepository } from "../repositories/tender-questionnaire.repository";
import { createTenderRateRepository } from "../repositories/tender-rate.repository";
import { createTenderServiceRepository } from "../repositories/tender-service.repository";
import { createTenderSettingsRepository } from "../repositories/tender-settings.repository";
import { createTenderService } from "../services/tender.service";

export type TenderRouterDeps = {
  authorizer: Authorizer;
  email?: TenderEmailPort;
  files?: TenderFilesPort;
  org?: TenderOrgPort;
  users?: TenderUsersPort;
  notifications?: TenderNotificationPort;
  alice?: TenderAlicePort;
  documents?: DocumentModuleLibraryPort;
};

export function createTenderModule(deps: TenderRouterDeps): {
  service: ReturnType<typeof createTenderService>;
  router: Router;
} {
  const settings = createTenderSettingsRepository();
  const answers = createTenderAnswerRepository();
  const certificates = createTenderCertificateRepository();
  const policies = createTenderPolicyRepository();
  const services = createTenderServiceRepository();
  const cases = createTenderCaseRepository();
  const rates = createTenderRateRepository();
  const questionnaires = createTenderQuestionnaireRepository();
  const auditLog = createTenderAuditLogRepository();

  const service = createTenderService({
    settings,
    answers,
    certificates,
    policies,
    services,
    cases,
    rates,
    questionnaires,
    auditLog,
    authorizer: deps.authorizer,
    email: deps.email ?? new NoOpTenderEmailAdapter(),
    files: deps.files ?? new NoOpTenderFilesAdapter(),
    org: deps.org ?? new NoOpTenderOrgAdapter(),
    users: deps.users ?? new NoOpTenderUsersAdapter(),
    notifications: deps.notifications ?? new NoOpTenderNotificationAdapter(),
    alice: deps.alice ?? new NoOpTenderAliceAdapter(),
    documents: deps.documents ?? new NoOpDocumentModuleLibraryAdapter(),
  });

  const controller = createTenderController(service);
  const router = Router();

  router.get("/settings", controller.getSettings);
  router.put("/settings", controller.updateSettings);
  router.put("/facts", controller.updateFacts);
  router.get("/health", controller.libraryHealth);
  router.get("/overview", controller.overview);
  router.get("/log", controller.getLog);

  router.get("/library/answers", controller.listAnswers);
  router.post("/library/answers", controller.createAnswer);
  router.put("/library/answers/:id", controller.updateAnswer);
  router.delete("/library/answers/:id", controller.deleteAnswer);

  router.get("/library/certificates", controller.listCertificates);
  router.post("/library/certificates", controller.createCertificate);
  router.put("/library/certificates/:id", controller.updateCertificate);
  router.delete("/library/certificates/:id", controller.deleteCertificate);

  router.get("/library/policies", controller.listPolicies);
  router.post("/library/policies", controller.createPolicy);
  router.put("/library/policies/:id", controller.updatePolicy);
  router.delete("/library/policies/:id", controller.deletePolicy);

  router.get("/library/services", controller.listServices);
  router.post("/library/services", controller.createService);
  router.put("/library/services/:id", controller.updateService);
  router.delete("/library/services/:id", controller.deleteService);

  router.get("/library/cases", controller.listCases);
  router.post("/library/cases", controller.createCase);
  router.put("/library/cases/:id", controller.updateCase);
  router.delete("/library/cases/:id", controller.deleteCase);

  router.get("/library/rates", controller.listRates);
  router.post("/library/rates", controller.createRate);
  router.put("/library/rates/:id", controller.updateRate);
  router.delete("/library/rates/:id", controller.deleteRate);

  router.post("/parse", controller.parseUpload);

  router.get("/questionnaires", controller.listQuestionnaires);
  router.post("/questionnaires", controller.createQuestionnaire);
  router.get("/questionnaires/:id", controller.getQuestionnaire);
  router.put("/questionnaires/:id", controller.updateBid);
  router.delete("/questionnaires/:id", controller.deleteQuestionnaire);

  router.post("/questionnaires/:id/documents", controller.addDocument);
  router.put(
    "/questionnaires/:id/requirements/:rid",
    controller.assessRequirement
  );
  router.post(
    "/questionnaires/:id/requirements/assess",
    controller.autoAssess
  );
  router.put("/questionnaires/:id/pricing", controller.setPricing);
  router.get("/questionnaires/:id/gate", controller.getGate);
  router.get("/questionnaires/:id/bid", controller.getBid);
  router.post("/questionnaires/:id/submit", controller.submit);
  router.post("/questionnaires/:id/draft", controller.draftQuestionnaire);
  router.put("/questionnaires/:id/questions/:qid", controller.setAnswer);
  router.post(
    "/questionnaires/:id/questions/:qid/accept",
    controller.acceptAnswer
  );
  router.post("/questionnaires/:id/approve", controller.approve);
  router.post("/questionnaires/:id/submitted", controller.markSubmitted);
  router.get("/questionnaires/:id/export", controller.exportQuestionnaire);

  router.post("/draft", controller.standaloneDraft);
  router.post("/files/upload-url", controller.createFileUpload);
  router.get("/auditor-pack", controller.auditorPack);

  return { service, router };
}
