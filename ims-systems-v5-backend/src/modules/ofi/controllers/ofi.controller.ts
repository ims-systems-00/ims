import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  addActivityBodySchema,
  attachmentIdParamSchema,
  createOfiBodySchema,
  idParamSchema,
  listOfisQuerySchema,
  setComplianceLinksBodySchema,
  updateOfiBodySchema,
} from "../schemas";
import type { OfiService } from "../services/ofi.service";

export type OfiController = {
  list: RequestHandler;
  stats: RequestHandler;
  getById: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  remove: RequestHandler;
  implement: RequestHandler;
  addActivity: RequestHandler;
  nudge: RequestHandler;
  removeAttachment: RequestHandler;
  setComplianceLinks: RequestHandler;
};

export function createOfiController(service: OfiService): OfiController {
  const list: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(listOfisQuerySchema, req.query);
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
      const body = parseWithSchema(createOfiBodySchema, req.body);
      const data = await service.create(req.identity, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const update: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updateOfiBodySchema, req.body);
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
        { message: "OFI deleted successfully" },
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const implement: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const data = await service.implement(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const addActivity: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(addActivityBodySchema, req.body);
      const data = await service.addActivity(req.identity, id, body);
      sendSuccess(res, data, 201, req.correlationId);
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
    getById,
    create,
    update,
    remove,
    implement,
    addActivity,
    nudge,
    removeAttachment,
    setComplianceLinks,
  };
}
