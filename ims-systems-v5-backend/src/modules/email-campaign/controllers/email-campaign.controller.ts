import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  attachmentIdParamSchema,
  createEmailCampaignBodySchema,
  idParamSchema,
  listDeliveriesQuerySchema,
  listEmailCampaignsQuerySchema,
  updateEmailCampaignBodySchema,
} from "../schemas";
import type { EmailCampaignService } from "../services/email-campaign.service";

export type EmailCampaignController = {
  list: RequestHandler;
  getById: RequestHandler;
  create: RequestHandler;
  createAndLaunch: RequestHandler;
  update: RequestHandler;
  remove: RequestHandler;
  removeAttachment: RequestHandler;
  launch: RequestHandler;
  close: RequestHandler;
  overview: RequestHandler;
  listDeliveries: RequestHandler;
};

export function createEmailCampaignController(
  service: EmailCampaignService
): EmailCampaignController {
  const list: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(listEmailCampaignsQuerySchema, req.query);
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
      const body = parseWithSchema(createEmailCampaignBodySchema, req.body);
      const data = await service.create(req.identity, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const createAndLaunch: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(createEmailCampaignBodySchema, req.body);
      const data = await service.createAndLaunch(req.identity, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const update: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updateEmailCampaignBodySchema, req.body);
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
        { message: "Campaign deleted successfully" },
        200,
        req.correlationId
      );
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

  const launch: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const data = await service.launch(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const close: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const data = await service.close(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const overview: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const data = await service.getOverview(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const listDeliveries: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const query = parseWithSchema(listDeliveriesQuerySchema, req.query);
      const data = await service.listDeliveries(
        req.identity,
        id,
        query.page,
        query.pageSize
      );
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  return {
    list,
    getById,
    create,
    createAndLaunch,
    update,
    remove,
    removeAttachment,
    launch,
    close,
    overview,
    listDeliveries,
  };
}
