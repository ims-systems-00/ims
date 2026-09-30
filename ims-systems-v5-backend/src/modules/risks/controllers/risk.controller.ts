import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  acceptRiskBodySchema,
  attachmentIdParamSchema,
  createRiskBodySchema,
  idParamSchema,
  listRisksQuerySchema,
  mitigateRiskBodySchema,
  setComplianceLinksBodySchema,
  updateRiskBodySchema,
} from "../schemas";
import type { RiskService } from "../services/risk.service";

export type RiskController = {
  list: RequestHandler;
  stats: RequestHandler;
  report: RequestHandler;
  getById: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  remove: RequestHandler;
  mitigate: RequestHandler;
  accept: RequestHandler;
  escalate: RequestHandler;
  nudge: RequestHandler;
  removeAttachment: RequestHandler;
  setComplianceLinks: RequestHandler;
};

export function createRiskController(service: RiskService): RiskController {
  const list: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(listRisksQuerySchema, req.query);
      const data = await service.list(req.identity, query);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const stats: RequestHandler = async (req, res, next) => {
    try {
      const data = await service.stats(req.identity);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const report: RequestHandler = async (req, res, next) => {
    try {
      const csv = await service.reportCsv(req.identity);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="risks-report.csv"'
      );
      res.status(200).send(csv);
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
      const body = parseWithSchema(createRiskBodySchema, req.body);
      const data = await service.create(req.identity, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const update: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updateRiskBodySchema, req.body);
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
        { message: "Risk deleted successfully" },
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const mitigate: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(mitigateRiskBodySchema, req.body);
      const data = await service.mitigate(req.identity, id, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const accept: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(acceptRiskBodySchema, req.body);
      const data = await service.accept(req.identity, id, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const escalate: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const data = await service.escalate(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const nudge: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const data = await service.nudge(req.identity, id);
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

  return {
    list,
    stats,
    report,
    getById,
    create,
    update,
    remove,
    mitigate,
    accept,
    escalate,
    nudge,
    removeAttachment,
    setComplianceLinks,
  };
}
