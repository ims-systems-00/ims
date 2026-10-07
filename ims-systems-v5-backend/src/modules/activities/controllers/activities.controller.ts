import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  createActivityBodySchema,
  idParamSchema,
  listActivitiesQuerySchema,
  updateActivityBodySchema,
} from "../schemas";
import type { ActivitiesService } from "../services/activities.service";

export type ActivitiesController = {
  list: RequestHandler;
  getById: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  remove: RequestHandler;
};

export function createActivitiesController(
  service: ActivitiesService
): ActivitiesController {
  const list: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(listActivitiesQuerySchema, req.query);
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
      const body = parseWithSchema(createActivityBodySchema, req.body);
      const data = await service.create(req.identity, {
        moduleType: body.moduleType,
        moduleId: body.moduleId,
        value: body.value,
        metaInfo: body.metaInfo ?? undefined,
        groupId: body.groupId,
      });
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const update: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updateActivityBodySchema, req.body);
      const data = await service.update(req.identity, id, {
        value: body.value,
      });
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
