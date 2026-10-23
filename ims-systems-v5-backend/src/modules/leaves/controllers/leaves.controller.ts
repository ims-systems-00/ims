import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  createLeaveBodySchema,
  evaluateLeaveBodySchema,
  holidaysQuerySchema,
  idParamSchema,
  listLeavesQuerySchema,
  updateLeaveBodySchema,
} from "../schemas";
import type { LeavesService } from "../services/leaves.service";

export type LeavesController = {
  list: RequestHandler;
  holidays: RequestHandler;
  getById: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  remove: RequestHandler;
  submit: RequestHandler;
  evaluate: RequestHandler;
};

export function createLeavesController(
  service: LeavesService
): LeavesController {
  const list: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(listLeavesQuerySchema, req.query);
      const data = await service.list(req.identity, query);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const holidays: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(holidaysQuerySchema, req.query);
      const data = await service.listHolidays(req.identity, query);
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
      const body = parseWithSchema(createLeaveBodySchema, req.body);
      const data = await service.create(req.identity, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const update: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updateLeaveBodySchema, req.body);
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
        { message: "Leave request deleted successfully" },
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const submit: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const data = await service.submit(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const evaluate: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(evaluateLeaveBodySchema, req.body);
      const data = await service.evaluate(req.identity, id, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  return {
    list,
    holidays,
    getById,
    create,
    update,
    remove,
    submit,
    evaluate,
  };
}
