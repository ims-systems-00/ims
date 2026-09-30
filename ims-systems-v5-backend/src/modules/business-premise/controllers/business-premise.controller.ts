import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  attachFunctionalUnitBodySchema,
  createBusinessPremiseBodySchema,
  idParamSchema,
  listBusinessPremisesQuerySchema,
  updateBusinessPremiseBodySchema,
} from "../schemas";
import type { BusinessPremiseService } from "../services/business-premise.service";

export type BusinessPremiseController = {
  list: RequestHandler;
  getById: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  remove: RequestHandler;
  attachFunctionalUnit: RequestHandler;
};

export function createBusinessPremiseController(
  service: BusinessPremiseService
): BusinessPremiseController {
  const list: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(listBusinessPremisesQuerySchema, req.query);
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
      const body = parseWithSchema(createBusinessPremiseBodySchema, req.body);
      const data = await service.create(req.identity, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const update: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updateBusinessPremiseBodySchema, req.body);
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
        { message: "Business Premise deleted successfully" },
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const attachFunctionalUnit: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(attachFunctionalUnitBodySchema, req.body);
      const data = await service.attachFunctionalUnit(req.identity, id, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  return {
    list,
    getById,
    create,
    update,
    remove,
    attachFunctionalUnit,
  };
}
