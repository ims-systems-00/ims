import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  addDocumentBodySchema,
  approveBodySchema,
  assessRequirementBodySchema,
  auditorPackQuerySchema,
  bidQuerySchema,
  createQuestionnaireBodySchema,
  draftQuestionnaireBodySchema,
  exportQuerySchema,
  fileUploadBodySchema,
  idParamSchema,
  markSubmittedBodySchema,
  parseUploadBodySchema,
  questionParamSchema,
  requirementParamSchema,
  setAnswerBodySchema,
  setPricingBodySchema,
  standaloneDraftBodySchema,
  submitBodySchema,
  updateBidBodySchema,
  updateFactsBodySchema,
  updateSettingsBodySchema,
  upsertAnswerBodySchema,
  upsertCaseBodySchema,
  upsertCertificateBodySchema,
  upsertPolicyBodySchema,
  upsertRateBodySchema,
  upsertServiceBodySchema,
} from "../schemas";
import type { TenderService } from "../services/tender.service";
import type { TenderParsedRows } from "../types";

function attachmentHeaders(
  res: {
    setHeader: (name: string, value: string) => void;
  },
  mime: string,
  filename: string,
  disposition: "attachment" | "inline" = "attachment"
) {
  const safe = filename.replace(/[\\/:*?"<>|]/g, "-");
  const ascii = safe.replace(/[^\x20-\x7E]/g, "-");
  res.setHeader("Content-Type", mime);
  res.setHeader(
    "Content-Disposition",
    `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(safe)}`
  );
}

export type TenderController = {
  getSettings: RequestHandler;
  updateSettings: RequestHandler;
  updateFacts: RequestHandler;
  libraryHealth: RequestHandler;
  overview: RequestHandler;
  getLog: RequestHandler;
  listAnswers: RequestHandler;
  createAnswer: RequestHandler;
  updateAnswer: RequestHandler;
  deleteAnswer: RequestHandler;
  listCertificates: RequestHandler;
  createCertificate: RequestHandler;
  updateCertificate: RequestHandler;
  deleteCertificate: RequestHandler;
  listPolicies: RequestHandler;
  createPolicy: RequestHandler;
  updatePolicy: RequestHandler;
  deletePolicy: RequestHandler;
  listServices: RequestHandler;
  createService: RequestHandler;
  updateService: RequestHandler;
  deleteService: RequestHandler;
  listCases: RequestHandler;
  createCase: RequestHandler;
  updateCase: RequestHandler;
  deleteCase: RequestHandler;
  listRates: RequestHandler;
  createRate: RequestHandler;
  updateRate: RequestHandler;
  deleteRate: RequestHandler;
  parseUpload: RequestHandler;
  listQuestionnaires: RequestHandler;
  createQuestionnaire: RequestHandler;
  getQuestionnaire: RequestHandler;
  updateBid: RequestHandler;
  deleteQuestionnaire: RequestHandler;
  addDocument: RequestHandler;
  assessRequirement: RequestHandler;
  autoAssess: RequestHandler;
  setPricing: RequestHandler;
  getGate: RequestHandler;
  getBid: RequestHandler;
  submit: RequestHandler;
  draftQuestionnaire: RequestHandler;
  setAnswer: RequestHandler;
  acceptAnswer: RequestHandler;
  approve: RequestHandler;
  markSubmitted: RequestHandler;
  exportQuestionnaire: RequestHandler;
  standaloneDraft: RequestHandler;
  createFileUpload: RequestHandler;
  auditorPack: RequestHandler;
};

export function createTenderController(
  service: TenderService
): TenderController {
  const getSettings: RequestHandler = async (req, res, next) => {
    try {
      sendSuccess(
        res,
        await service.getSettings(req.identity),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const updateSettings: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(updateSettingsBodySchema, req.body);
      sendSuccess(
        res,
        await service.updateSettings(req.identity, body),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const updateFacts: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(updateFactsBodySchema, req.body);
      sendSuccess(
        res,
        await service.updateFacts(req.identity, body),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const libraryHealth: RequestHandler = async (req, res, next) => {
    try {
      sendSuccess(
        res,
        await service.libraryHealth(req.identity),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const overview: RequestHandler = async (req, res, next) => {
    try {
      sendSuccess(
        res,
        await service.overview(req.identity),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const getLog: RequestHandler = async (req, res, next) => {
    try {
      sendSuccess(
        res,
        await service.getLog(req.identity),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const listAnswers: RequestHandler = async (req, res, next) => {
    try {
      sendSuccess(
        res,
        await service.listLibrary(req.identity, "answers"),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const createAnswer: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(upsertAnswerBodySchema, req.body);
      sendSuccess(
        res,
        await service.upsertLibraryAnswer(req.identity, body),
        201,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const updateAnswer: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(upsertAnswerBodySchema, req.body);
      sendSuccess(
        res,
        await service.upsertLibraryAnswer(req.identity, { ...body, id }),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const deleteAnswer: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      await service.deleteLibraryAnswer(req.identity, id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };

  const listCertificates: RequestHandler = async (req, res, next) => {
    try {
      sendSuccess(
        res,
        await service.listLibrary(req.identity, "certificates"),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const createCertificate: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(upsertCertificateBodySchema, req.body);
      sendSuccess(
        res,
        await service.upsertLibraryCertificate(req.identity, body),
        201,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const updateCertificate: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(upsertCertificateBodySchema, req.body);
      sendSuccess(
        res,
        await service.upsertLibraryCertificate(req.identity, { ...body, id }),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const deleteCertificate: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      await service.deleteLibraryItem(req.identity, "certificates", id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };

  const listPolicies: RequestHandler = async (req, res, next) => {
    try {
      sendSuccess(
        res,
        await service.listLibrary(req.identity, "policies"),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const createPolicy: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(upsertPolicyBodySchema, req.body);
      sendSuccess(
        res,
        await service.upsertLibraryPolicy(req.identity, body),
        201,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const updatePolicy: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(upsertPolicyBodySchema, req.body);
      sendSuccess(
        res,
        await service.upsertLibraryPolicy(req.identity, { ...body, id }),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const deletePolicy: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      await service.deleteLibraryItem(req.identity, "policies", id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };

  const listServices: RequestHandler = async (req, res, next) => {
    try {
      sendSuccess(
        res,
        await service.listLibrary(req.identity, "services"),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const createService: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(upsertServiceBodySchema, req.body);
      sendSuccess(
        res,
        await service.upsertLibraryService(req.identity, body),
        201,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const updateService: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(upsertServiceBodySchema, req.body);
      sendSuccess(
        res,
        await service.upsertLibraryService(req.identity, { ...body, id }),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const deleteService: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      await service.deleteLibraryItem(req.identity, "services", id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };

  const listCases: RequestHandler = async (req, res, next) => {
    try {
      sendSuccess(
        res,
        await service.listLibrary(req.identity, "cases"),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const createCase: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(upsertCaseBodySchema, req.body);
      sendSuccess(
        res,
        await service.upsertLibraryCase(req.identity, body),
        201,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const updateCase: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(upsertCaseBodySchema, req.body);
      sendSuccess(
        res,
        await service.upsertLibraryCase(req.identity, { ...body, id }),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const deleteCase: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      await service.deleteLibraryItem(req.identity, "cases", id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };

  const listRates: RequestHandler = async (req, res, next) => {
    try {
      sendSuccess(
        res,
        await service.listLibrary(req.identity, "rates"),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const createRate: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(upsertRateBodySchema, req.body);
      sendSuccess(
        res,
        await service.upsertLibraryRate(req.identity, body),
        201,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const updateRate: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(upsertRateBodySchema, req.body);
      sendSuccess(
        res,
        await service.upsertLibraryRate(req.identity, { ...body, id }),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const deleteRate: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      await service.deleteLibraryItem(req.identity, "rates", id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };

  const parseUpload: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(parseUploadBodySchema, req.body);
      sendSuccess(
        res,
        await service.parseUpload(req.identity, body),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const listQuestionnaires: RequestHandler = async (req, res, next) => {
    try {
      sendSuccess(
        res,
        await service.listQuestionnaires(req.identity),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const createQuestionnaire: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(createQuestionnaireBodySchema, req.body);
      sendSuccess(
        res,
        await service.createQuestionnaire(req.identity, {
          ...body,
          parsed: body.parsed as TenderParsedRows | undefined,
        }),
        201,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const getQuestionnaire: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      sendSuccess(
        res,
        await service.getQuestionnaire(req.identity, id),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const updateBid: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updateBidBodySchema, req.body);
      sendSuccess(
        res,
        await service.updateBid(req.identity, id, body),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const deleteQuestionnaire: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      await service.deleteQuestionnaire(req.identity, id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };

  const addDocument: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(addDocumentBodySchema, req.body);
      sendSuccess(
        res,
        await service.addPackDocument(req.identity, id, body),
        201,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const assessRequirement: RequestHandler = async (req, res, next) => {
    try {
      const { id, rid } = parseWithSchema(requirementParamSchema, req.params);
      const body = parseWithSchema(assessRequirementBodySchema, req.body);
      sendSuccess(
        res,
        await service.assessRequirement(req.identity, id, rid, body),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const autoAssess: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      sendSuccess(
        res,
        await service.autoAssessRequirements(req.identity, id),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const setPricing: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(setPricingBodySchema, req.body);
      sendSuccess(
        res,
        await service.setPricing(req.identity, id, body),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const getGate: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      sendSuccess(
        res,
        await service.getGate(req.identity, id),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const getBid: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const query = parseWithSchema(bidQuerySchema, req.query);
      const file = await service.getBid(
        req.identity,
        id,
        query.what || "bid"
      );
      attachmentHeaders(res, file.mime, file.name);
      res.status(200).send(file.bytes);
    } catch (error) {
      next(error);
    }
  };

  const submit: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(submitBodySchema, req.body);
      sendSuccess(
        res,
        await service.submitEmail(req.identity, id, body),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const draftQuestionnaire: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(draftQuestionnaireBodySchema, req.body ?? {});
      sendSuccess(
        res,
        await service.draftQuestionnaire(req.identity, id, body.only || null),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const setAnswer: RequestHandler = async (req, res, next) => {
    try {
      const { id, qid } = parseWithSchema(questionParamSchema, req.params);
      const body = parseWithSchema(setAnswerBodySchema, req.body);
      sendSuccess(
        res,
        await service.setAnswer(req.identity, id, qid, body),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const acceptAnswer: RequestHandler = async (req, res, next) => {
    try {
      const { id, qid } = parseWithSchema(questionParamSchema, req.params);
      sendSuccess(
        res,
        await service.acceptAnswer(req.identity, id, qid),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const approve: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(approveBodySchema, req.body ?? {});
      sendSuccess(
        res,
        await service.approveAnswers(
          req.identity,
          id,
          body.questionIds ?? null
        ),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const markSubmitted: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(markSubmittedBodySchema, req.body ?? {});
      sendSuccess(
        res,
        await service.markSubmitted(req.identity, id, body.how || "manual"),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const exportQuestionnaire: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const query = parseWithSchema(exportQuerySchema, req.query);
      const file = await service.exportQuestionnaire(
        req.identity,
        id,
        query.format || "xlsx"
      );
      attachmentHeaders(res, file.mime, file.name);
      res.status(200).send(file.bytes);
    } catch (error) {
      next(error);
    }
  };

  const standaloneDraft: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(standaloneDraftBodySchema, req.body);
      sendSuccess(
        res,
        await service.standaloneDraft(req.identity, body),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const createFileUpload: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(fileUploadBodySchema, req.body);
      sendSuccess(
        res,
        await service.createFileUpload(req.identity, body),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const auditorPack: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(auditorPackQuerySchema, req.query);
      const format = query.format === "pdf" ? "pdf" : "html";
      const pack = await service.auditorPack(req.identity, format);
      attachmentHeaders(
        res,
        pack.contentType,
        pack.filename,
        format === "pdf" ? "attachment" : "inline"
      );
      res.status(200).send(pack.body);
    } catch (error) {
      next(error);
    }
  };

  return {
    getSettings,
    updateSettings,
    updateFacts,
    libraryHealth,
    overview,
    getLog,
    listAnswers,
    createAnswer,
    updateAnswer,
    deleteAnswer,
    listCertificates,
    createCertificate,
    updateCertificate,
    deleteCertificate,
    listPolicies,
    createPolicy,
    updatePolicy,
    deletePolicy,
    listServices,
    createService,
    updateService,
    deleteService,
    listCases,
    createCase,
    updateCase,
    deleteCase,
    listRates,
    createRate,
    updateRate,
    deleteRate,
    parseUpload,
    listQuestionnaires,
    createQuestionnaire,
    getQuestionnaire,
    updateBid,
    deleteQuestionnaire,
    addDocument,
    assessRequirement,
    autoAssess,
    setPricing,
    getGate,
    getBid,
    submit,
    draftQuestionnaire,
    setAnswer,
    acceptAnswer,
    approve,
    markSubmitted,
    exportQuestionnaire,
    standaloneDraft,
    createFileUpload,
    auditorPack,
  };
}
