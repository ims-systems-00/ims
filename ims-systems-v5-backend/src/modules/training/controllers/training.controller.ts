import type { RequestHandler } from "express";
import {
  parseWithSchema,
  sendSuccess,
  ValidationAppError,
} from "../../../shared";
import {
  acknowledgeBodySchema,
  attachmentBodySchema,
  attachmentIdParamSchema,
  attachmentKindParamSchema,
  cancelSessionBodySchema,
  competentQuerySchema,
  completeSessionBodySchema,
  createCompetencyBodySchema,
  createExternalBodySchema,
  createPersonBodySchema,
  createRecordBodySchema,
  createRoleBodySchema,
  createSessionBodySchema,
  exemptBodySchema,
  idParamSchema,
  inviteSessionBodySchema,
  leaverBodySchema,
  listPeopleQuerySchema,
  planQuerySchema,
  prepareUploadBodySchema,
  rsvpBodySchema,
  selfAcknowledgeBodySchema,
  selfUploadBodySchema,
  tokenParamSchema,
  updateCompetencyBodySchema,
  updatePersonBodySchema,
  updateRoleBodySchema,
  updateSessionBodySchema,
  updateSettingsBodySchema,
} from "../schemas";
import type { TrainingService } from "../services/training.service";
import type { SessionOutcome } from "../types";

export type TrainingController = {
  getSettings: RequestHandler;
  updateSettings: RequestHandler;
  getLog: RequestHandler;
  ensureCatalogue: RequestHandler;
  listCompetencies: RequestHandler;
  createCompetency: RequestHandler;
  updateCompetency: RequestHandler;
  archiveCompetency: RequestHandler;
  listRoles: RequestHandler;
  createRole: RequestHandler;
  updateRole: RequestHandler;
  removeRole: RequestHandler;
  listPeople: RequestHandler;
  createPerson: RequestHandler;
  addExternal: RequestHandler;
  getPerson: RequestHandler;
  updatePerson: RequestHandler;
  markLeaver: RequestHandler;
  setExemption: RequestHandler;
  clearExemption: RequestHandler;
  acknowledgePolicy: RequestHandler;
  issueSelfToken: RequestHandler;
  listRecords: RequestHandler;
  createRecord: RequestHandler;
  verifyRecord: RequestHandler;
  listSessions: RequestHandler;
  createSession: RequestHandler;
  getSession: RequestHandler;
  updateSession: RequestHandler;
  completeSession: RequestHandler;
  cancelSession: RequestHandler;
  inviteSession: RequestHandler;
  rsvpSession: RequestHandler;
  addAttachment: RequestHandler;
  removeAttachment: RequestHandler;
  overview: RequestHandler;
  matrix: RequestHandler;
  gaps: RequestHandler;
  plan: RequestHandler;
  readiness: RequestHandler;
  auditorPack: RequestHandler;
  exportMatrixCsv: RequestHandler;
  competent: RequestHandler;
  getSelfView: RequestHandler;
  selfAcknowledge: RequestHandler;
  selfUpload: RequestHandler;
  prepareSelfUpload: RequestHandler;
  getRsvpView: RequestHandler;
  publicRsvp: RequestHandler;
};

function emptyToUndefined(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return value.trim() === "" ? undefined : value;
}

export function createTrainingController(
  service: TrainingService
): TrainingController {
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
        await service.updateSettings(req.identity, {
          ...body,
          organiserEmail: emptyToUndefined(body.organiserEmail),
        }),
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

  const ensureCatalogue: RequestHandler = async (req, res, next) => {
    try {
      sendSuccess(
        res,
        await service.ensureCatalogue(req.identity),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const listCompetencies: RequestHandler = async (req, res, next) => {
    try {
      const includeArchived =
        req.query.includeArchived === "true" ||
        req.query.includeArchived === "1";
      sendSuccess(
        res,
        await service.listCompetencies(req.identity, { includeArchived }),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const createCompetency: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(createCompetencyBodySchema, req.body);
      sendSuccess(
        res,
        await service.createCompetency(req.identity, body),
        201,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const updateCompetency: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updateCompetencyBodySchema, req.body);
      sendSuccess(
        res,
        await service.updateCompetency(req.identity, id, body),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const archiveCompetency: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      sendSuccess(
        res,
        await service.archiveCompetency(req.identity, id),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const listRoles: RequestHandler = async (req, res, next) => {
    try {
      sendSuccess(
        res,
        await service.listRoles(req.identity),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const createRole: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(createRoleBodySchema, req.body);
      sendSuccess(
        res,
        await service.createRole(req.identity, body),
        201,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const updateRole: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updateRoleBodySchema, req.body);
      sendSuccess(
        res,
        await service.updateRole(req.identity, id, body),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const removeRole: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      sendSuccess(
        res,
        await service.removeRole(req.identity, id),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const listPeople: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(listPeopleQuerySchema, req.query);
      sendSuccess(
        res,
        await service.listPeople(req.identity, {
          status: query.status,
          site: query.site,
          role: query.role,
          search: query.search,
        }),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const createPerson: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(createPersonBodySchema, req.body);
      sendSuccess(
        res,
        await service.createPerson(req.identity, {
          ...body,
          start: emptyToUndefined(body.start),
          email: emptyToUndefined(body.email),
          manager: emptyToUndefined(body.manager),
          company: emptyToUndefined(body.company),
        }),
        201,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const addExternal: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(createExternalBodySchema, req.body);
      sendSuccess(
        res,
        await service.addExternal(req.identity, body),
        201,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const getPerson: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      sendSuccess(
        res,
        await service.getPerson(req.identity, id),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const updatePerson: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updatePersonBodySchema, req.body);
      sendSuccess(
        res,
        await service.updatePerson(req.identity, id, {
          ...body,
          start:
            body.start === undefined ? undefined : emptyToUndefined(body.start),
          end: body.end === undefined ? undefined : emptyToUndefined(body.end),
          email:
            body.email === undefined ? undefined : emptyToUndefined(body.email),
          manager:
            body.manager === undefined
              ? undefined
              : emptyToUndefined(body.manager),
          company:
            body.company === undefined
              ? undefined
              : emptyToUndefined(body.company),
        }),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const markLeaver: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(leaverBodySchema, req.body ?? {});
      sendSuccess(
        res,
        await service.markLeaver(req.identity, id, body.date),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const setExemption: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(exemptBodySchema, req.body);
      sendSuccess(
        res,
        await service.setExemption(req.identity, id, body.cid, body.reason),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const clearExemption: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, {
        id: req.params.id,
      });
      const cid = String(req.params.cid ?? "").trim();
      if (!cid) {
        throw new ValidationAppError("cid is required");
      }
      sendSuccess(
        res,
        await service.clearExemption(req.identity, id, cid),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const acknowledgePolicy: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(acknowledgeBodySchema, req.body);
      sendSuccess(
        res,
        await service.acknowledgePolicy(
          req.identity,
          id,
          body.cid,
          body.answers
        ),
        201,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const issueSelfToken: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      sendSuccess(
        res,
        await service.issueSelfToken(req.identity, id),
        201,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const listRecords: RequestHandler = async (req, res, next) => {
    try {
      const personId =
        typeof req.query.personId === "string"
          ? req.query.personId.trim()
          : undefined;
      sendSuccess(
        res,
        await service.listRecords(req.identity, {
          personId: personId || undefined,
        }),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const createRecord: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(createRecordBodySchema, req.body);
      sendSuccess(
        res,
        await service.createRecord(req.identity, body),
        201,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const verifyRecord: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      sendSuccess(
        res,
        await service.verifyRecord(req.identity, id),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const listSessions: RequestHandler = async (req, res, next) => {
    try {
      const status =
        typeof req.query.status === "string"
          ? req.query.status.trim()
          : undefined;
      const cid =
        typeof req.query.cid === "string" ? req.query.cid.trim() : undefined;
      sendSuccess(
        res,
        await service.listSessions(req.identity, {
          status: status || undefined,
          cid: cid || undefined,
        }),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const createSession: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(createSessionBodySchema, req.body);
      sendSuccess(
        res,
        await service.createSession(req.identity, body),
        201,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const getSession: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      sendSuccess(
        res,
        await service.getSession(req.identity, id),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const updateSession: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updateSessionBodySchema, req.body);
      sendSuccess(
        res,
        await service.updateSession(req.identity, id, body),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const completeSession: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(completeSessionBodySchema, req.body ?? {});
      sendSuccess(
        res,
        await service.completeSession(
          req.identity,
          id,
          body.outcomes as Record<string, SessionOutcome> | undefined
        ),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const cancelSession: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(cancelSessionBodySchema, req.body ?? {});
      sendSuccess(
        res,
        await service.cancelSession(req.identity, id, body.reason),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const inviteSession: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(inviteSessionBodySchema, req.body ?? {});
      sendSuccess(
        res,
        await service.inviteSession(req.identity, id, body),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const rsvpSession: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(rsvpBodySchema, req.body);
      if (!body.personId) {
        throw new ValidationAppError("personId is required");
      }
      sendSuccess(
        res,
        await service.rsvpSession(
          req.identity,
          id,
          body.personId,
          body.status,
          body.note
        ),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const addAttachment: RequestHandler = async (req, res, next) => {
    try {
      const { id, kind } = parseWithSchema(
        attachmentKindParamSchema,
        req.params
      );
      const body = parseWithSchema(attachmentBodySchema, req.body);
      sendSuccess(
        res,
        await service.addAttachment(req.identity, id, kind, body),
        201,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const removeAttachment: RequestHandler = async (req, res, next) => {
    try {
      const { id, kind, attachmentId } = parseWithSchema(
        attachmentIdParamSchema,
        req.params
      );
      sendSuccess(
        res,
        await service.removeAttachment(req.identity, id, kind, attachmentId),
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

  const matrix: RequestHandler = async (req, res, next) => {
    try {
      sendSuccess(
        res,
        await service.matrix(req.identity),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const gaps: RequestHandler = async (req, res, next) => {
    try {
      sendSuccess(
        res,
        await service.gaps(req.identity),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const plan: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(planQuerySchema, req.query);
      sendSuccess(
        res,
        await service.plan(req.identity, query.months ?? 3),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const readiness: RequestHandler = async (req, res, next) => {
    try {
      sendSuccess(
        res,
        await service.readiness(req.identity),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const auditorPack: RequestHandler = async (req, res, next) => {
    try {
      const format =
        String(req.query.format || "html").toLowerCase() === "pdf"
          ? "pdf"
          : "html";
      const pack = await service.auditorPack(req.identity, format);
      if (format === "pdf") {
        res.setHeader("Content-Type", pack.contentType);
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${pack.filename}"`
        );
        res.status(200).send(pack.body);
        return;
      }
      // Keep JSON envelope for existing open/print clients
      sendSuccess(res, { html: pack.html ?? pack.body }, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const exportMatrixCsv: RequestHandler = async (req, res, next) => {
    try {
      const csv = await service.exportMatrixCsv(req.identity);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="training-matrix.csv"'
      );
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  };

  const competent: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(competentQuerySchema, req.query);
      sendSuccess(
        res,
        await service.competent(req.identity, query.personId, query.covers),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const getSelfView: RequestHandler = async (req, res, next) => {
    try {
      const { token } = parseWithSchema(tokenParamSchema, req.params);
      sendSuccess(
        res,
        await service.getSelfView(token),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const selfAcknowledge: RequestHandler = async (req, res, next) => {
    try {
      const { token } = parseWithSchema(tokenParamSchema, req.params);
      const body = parseWithSchema(selfAcknowledgeBodySchema, req.body);
      sendSuccess(
        res,
        await service.selfAcknowledge(token, body),
        201,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const selfUpload: RequestHandler = async (req, res, next) => {
    try {
      const { token } = parseWithSchema(tokenParamSchema, req.params);
      const body = parseWithSchema(selfUploadBodySchema, req.body);
      sendSuccess(
        res,
        await service.selfUpload(token, body),
        201,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const prepareSelfUpload: RequestHandler = async (req, res, next) => {
    try {
      const { token } = parseWithSchema(tokenParamSchema, req.params);
      const body = parseWithSchema(prepareUploadBodySchema, req.body);
      sendSuccess(
        res,
        await service.prepareSelfUpload(token, body),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const getRsvpView: RequestHandler = async (req, res, next) => {
    try {
      const { token } = parseWithSchema(tokenParamSchema, req.params);
      sendSuccess(
        res,
        await service.getRsvpView(token),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const publicRsvp: RequestHandler = async (req, res, next) => {
    try {
      const { token } = parseWithSchema(tokenParamSchema, req.params);
      const body = parseWithSchema(rsvpBodySchema, req.body);
      sendSuccess(
        res,
        await service.publicRsvp(token, {
          status: body.status,
          note: body.note,
        }),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  return {
    getSettings,
    updateSettings,
    getLog,
    ensureCatalogue,
    listCompetencies,
    createCompetency,
    updateCompetency,
    archiveCompetency,
    listRoles,
    createRole,
    updateRole,
    removeRole,
    listPeople,
    createPerson,
    addExternal,
    getPerson,
    updatePerson,
    markLeaver,
    setExemption,
    clearExemption,
    acknowledgePolicy,
    issueSelfToken,
    listRecords,
    createRecord,
    verifyRecord,
    listSessions,
    createSession,
    getSession,
    updateSession,
    completeSession,
    cancelSession,
    inviteSession,
    rsvpSession,
    addAttachment,
    removeAttachment,
    overview,
    matrix,
    gaps,
    plan,
    readiness,
    auditorPack,
    exportMatrixCsv,
    competent,
    getSelfView,
    selfAcknowledge,
    selfUpload,
    prepareSelfUpload,
    getRsvpView,
    publicRsvp,
  };
}
