import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  createCalendarEventBodySchema,
  idParamSchema,
  listCalendarEventsQuerySchema,
  updateCalendarEventBodySchema,
} from "../schemas";
import type { CalendarService } from "../services/calendar.service";

export type CalendarController = {
  list: RequestHandler;
  getById: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  remove: RequestHandler;
};

export function createCalendarController(
  service: CalendarService
): CalendarController {
  const list: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(listCalendarEventsQuerySchema, req.query);
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
      const body = parseWithSchema(createCalendarEventBodySchema, req.body);
      const data = await service.create(req.identity, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const update: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updateCalendarEventBodySchema, req.body);
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
        { message: "Calendar event deleted successfully" },
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  return { list, getById, create, update, remove };
}
