import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  createKpiObjectiveBodySchema,
  idParamSchema,
  listKpiObjectivesQuerySchema,
  updateKpiObjectiveBodySchema,
} from "../schemas";
import type { KpiObjectivesService } from "../services/kpi-objectives.service";

export type KpiObjectivesController = {
  list: RequestHandler;
  getById: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  remove: RequestHandler;
};

export function createKpiObjectivesController(
  service: KpiObjectivesService
): KpiObjectivesController {
  const list: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(listKpiObjectivesQuerySchema, req.query);
      const data = await service.list(req.identity, query);
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
      const body = parseWithSchema(createKpiObjectiveBodySchema, req.body);
      const data = await service.create(req.identity, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const update: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updateKpiObjectiveBodySchema, req.body);
      const data = await service.update(req.identity, id, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const remove: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const data = await service.remove(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  return { list, getById, create, update, remove };
}
