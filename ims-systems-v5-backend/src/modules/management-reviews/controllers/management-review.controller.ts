import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  addAttachmentsBodySchema,
  addAttendeeBodySchema,
  attachmentIdParamSchema,
  attendeeIdParamSchema,
  createManagementReviewBodySchema,
  idParamSchema,
  listManagementReviewsQuerySchema,
  updateManagementReviewBodySchema,
} from "../schemas";
import type { ManagementReviewService } from "../services/management-review.service";

export type ManagementReviewController = {
  list: RequestHandler;
  stats: RequestHandler;
  getById: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  remove: RequestHandler;
  complete: RequestHandler;
  addAgenda: RequestHandler;
  removeAgenda: RequestHandler;
  addMinutes: RequestHandler;
  removeMinutes: RequestHandler;
  addAttendee: RequestHandler;
  removeAttendee: RequestHandler;
};

export function createManagementReviewController(
  service: ManagementReviewService
): ManagementReviewController {
  const list: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(listManagementReviewsQuerySchema, req.query);
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
      const body = parseWithSchema(createManagementReviewBodySchema, req.body);
      const data = await service.create(req.identity, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const update: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updateManagementReviewBodySchema, req.body);
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
        { message: "Management review deleted successfully" },
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

  const addAgenda: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(addAttachmentsBodySchema, req.body);
      const data = await service.addAgenda(
        req.identity,
        id,
        body.attachments
      );
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const removeAgenda: RequestHandler = async (req, res, next) => {
    try {
      const { id, attachmentId } = parseWithSchema(
        attachmentIdParamSchema,
        req.params
      );
      const data = await service.removeAgenda(req.identity, id, attachmentId);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const addMinutes: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(addAttachmentsBodySchema, req.body);
      const data = await service.addMinutes(
        req.identity,
        id,
        body.attachments
      );
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const removeMinutes: RequestHandler = async (req, res, next) => {
    try {
      const { id, attachmentId } = parseWithSchema(
        attachmentIdParamSchema,
        req.params
      );
      const data = await service.removeMinutes(req.identity, id, attachmentId);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const addAttendee: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(addAttendeeBodySchema, req.body);
      const data = await service.addAttendee(
        req.identity,
        id,
        body.attendeeId
      );
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const removeAttendee: RequestHandler = async (req, res, next) => {
    try {
      const { id, attendeeId } = parseWithSchema(
        attendeeIdParamSchema,
        req.params
      );
      const data = await service.removeAttendee(req.identity, id, attendeeId);
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
    addAgenda,
    removeAgenda,
    addMinutes,
    removeMinutes,
    addAttendee,
    removeAttendee,
  };
}
