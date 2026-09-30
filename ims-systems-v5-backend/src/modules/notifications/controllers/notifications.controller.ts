import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  broadcastBodySchema,
  idParamSchema,
  listNotificationsQuerySchema,
  markPopupBodySchema,
} from "../schemas";
import type { NotificationsService } from "../services/notifications.service";

export type NotificationsController = {
  list: RequestHandler;
  unsentCount: RequestHandler;
  getById: RequestHandler;
  broadcast: RequestHandler;
  markAllSent: RequestHandler;
  markRead: RequestHandler;
  markPopup: RequestHandler;
  markAllPopupsRead: RequestHandler;
};

export function createNotificationsController(
  service: NotificationsService
): NotificationsController {
  const list: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(listNotificationsQuerySchema, req.query);
      const data = await service.list(req.identity, query);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const unsentCount: RequestHandler = async (req, res, next) => {
    try {
      const data = await service.unsentCount(req.identity);
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

  const broadcast: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(broadcastBodySchema, req.body);
      const data = await service.broadcast(req.identity, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const markAllSent: RequestHandler = async (req, res, next) => {
    try {
      const data = await service.markAllSent(req.identity);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const markRead: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const data = await service.markRead(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const markPopup: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(markPopupBodySchema, req.body ?? {});
      const data = await service.markPopup(req.identity, id, body.status);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const markAllPopupsRead: RequestHandler = async (req, res, next) => {
    try {
      const data = await service.markAllPopupsRead(req.identity);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  return {
    list,
    unsentCount,
    getById,
    broadcast,
    markAllSent,
    markRead,
    markPopup,
    markAllPopupsRead,
  };
}
