import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  attachmentIdParamSchema,
  createAuditBodySchema,
  createEmbeddedRiskBodySchema,
  createIdentificationBodySchema,
  createOfiBodySchema,
  extractReportBodySchema,
  idParamSchema,
  identificationIdParamSchema,
  listAuditsQuerySchema,
  ofiIdParamSchema,
  riskIdParamSchema,
  setComplianceLinksBodySchema,
  updateAuditBodySchema,
  updateEmbeddedRiskBodySchema,
  updateIdentificationBodySchema,
  updateOfiBodySchema,
} from "../schemas";
import type { AuditService } from "../services/audit.service";

export type AuditController = {
  list: RequestHandler;
  stats: RequestHandler;
  getById: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  remove: RequestHandler;
  complete: RequestHandler;
  addIdentification: RequestHandler;
  updateIdentification: RequestHandler;
  removeIdentification: RequestHandler;
  addRisk: RequestHandler;
  updateRisk: RequestHandler;
  removeRisk: RequestHandler;
  addOfi: RequestHandler;
  updateOfi: RequestHandler;
  removeOfi: RequestHandler;
  removeAttachment: RequestHandler;
  setComplianceLinks: RequestHandler;
  extractReport: RequestHandler;
};

export function createAuditController(service: AuditService): AuditController {
  const list: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(listAuditsQuerySchema, req.query);
      const data = await service.list(req.identity, query);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const stats: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(listAuditsQuerySchema.pick({ type: true }), {
        type: req.query.type,
      });
      const data = await service.stats(req.identity, query.type);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const getById: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const data = await service.getById(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const create: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(createAuditBodySchema, req.body);
      const data = await service.create(req.identity, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const update: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updateAuditBodySchema, req.body);
      const data = await service.update(req.identity, id, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const remove: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      await service.remove(req.identity, id);
      sendSuccess(
        res,
        { message: "Audit deleted successfully" },
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const complete: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const data = await service.complete(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const addIdentification: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(createIdentificationBodySchema, req.body);
      const data = await service.addIdentification(req.identity, id, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const updateIdentification: RequestHandler = async (req, res, next) => {
    try {
      const { id, identificationId } = parseWithSchema(
        identificationIdParamSchema,
        req.params
      );
      const body = parseWithSchema(updateIdentificationBodySchema, req.body);
      const data = await service.updateIdentification(
        req.identity,
        id,
        identificationId,
        body
      );
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const removeIdentification: RequestHandler = async (req, res, next) => {
    try {
      const { id, identificationId } = parseWithSchema(
        identificationIdParamSchema,
        req.params
      );
      const data = await service.removeIdentification(
        req.identity,
        id,
        identificationId
      );
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const addRisk: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(createEmbeddedRiskBodySchema, req.body);
      const data = await service.addRisk(req.identity, id, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const updateRisk: RequestHandler = async (req, res, next) => {
    try {
      const { id, riskId } = parseWithSchema(riskIdParamSchema, req.params);
      const body = parseWithSchema(updateEmbeddedRiskBodySchema, req.body);
      const data = await service.updateRisk(req.identity, id, riskId, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const removeRisk: RequestHandler = async (req, res, next) => {
    try {
      const { id, riskId } = parseWithSchema(riskIdParamSchema, req.params);
      const data = await service.removeRisk(req.identity, id, riskId);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const addOfi: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(createOfiBodySchema, req.body);
      const data = await service.addOfi(req.identity, id, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const updateOfi: RequestHandler = async (req, res, next) => {
    try {
      const { id, ofiId } = parseWithSchema(ofiIdParamSchema, req.params);
      const body = parseWithSchema(updateOfiBodySchema, req.body);
      const data = await service.updateOfi(req.identity, id, ofiId, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const removeOfi: RequestHandler = async (req, res, next) => {
    try {
      const { id, ofiId } = parseWithSchema(ofiIdParamSchema, req.params);
      const data = await service.removeOfi(req.identity, id, ofiId);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const removeAttachment: RequestHandler = async (req, res, next) => {
    try {
      const { id, attachmentId } = parseWithSchema(
        attachmentIdParamSchema,
        req.params
      );
      const data = await service.removeAttachment(
        req.identity,
        id,
        attachmentId
      );
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const setComplianceLinks: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(setComplianceLinksBodySchema, req.body);
      const data = await service.setComplianceLinks(req.identity, id, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const extractReport: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(extractReportBodySchema, req.body);
      const data = await service.extractReport(req.identity, id, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  return {
    list,
    stats,
    getById,
    create,
    update,
    remove,
    complete,
    addIdentification,
    updateIdentification,
    removeIdentification,
    addRisk,
    updateRisk,
    removeRisk,
    addOfi,
    updateOfi,
    removeOfi,
    removeAttachment,
    setComplianceLinks,
    extractReport,
  };
}
