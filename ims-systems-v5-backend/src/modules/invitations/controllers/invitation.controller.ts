import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  acceptInvitationBodySchema,
  createInvitationBodySchema,
  invitationIdParamSchema,
  invitationTokenParamSchema,
  listInvitationsQuerySchema,
} from "../schemas";
import type { InvitationService } from "../services/invitation.service";

export type InvitationController = {
  create: RequestHandler;
  list: RequestHandler;
  listReceived: RequestHandler;
  getById: RequestHandler;
  resend: RequestHandler;
  remove: RequestHandler;
  preview: RequestHandler;
  accept: RequestHandler;
};

export function createInvitationController(
  service: InvitationService
): InvitationController {
  const create: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(createInvitationBodySchema, req.body ?? {});
      const data = await service.create(req.identity, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const list: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(listInvitationsQuerySchema, req.query);
      const data = await service.list(req.identity, query);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const listReceived: RequestHandler = async (req, res, next) => {
    try {
      const data = await service.listReceived(req.identity);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const getById: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(invitationIdParamSchema, req.params);
      const data = await service.getById(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const resend: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(invitationIdParamSchema, req.params);
      const data = await service.resend(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const remove: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(invitationIdParamSchema, req.params);
      const data = await service.remove(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const preview: RequestHandler = async (req, res, next) => {
    try {
      const { token } = parseWithSchema(invitationTokenParamSchema, req.params);
      const data = await service.preview(token);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const accept: RequestHandler = async (req, res, next) => {
    try {
      // Token may arrive in the body or the `x-invitation-token` header (spec).
      const headerToken = req.headers["x-invitation-token"];
      const body = parseWithSchema(acceptInvitationBodySchema, {
        token:
          (req.body as { token?: unknown } | undefined)?.token ??
          (Array.isArray(headerToken) ? headerToken[0] : headerToken) ??
          "",
      });
      const data = await service.accept(req.identity, body.token);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  return {
    create,
    list,
    listReceived,
    getById,
    resend,
    remove,
    preview,
    accept,
  };
}
