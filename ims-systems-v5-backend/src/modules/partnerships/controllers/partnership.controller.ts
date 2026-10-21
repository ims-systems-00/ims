import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  applyPartnershipBodySchema,
  partnershipIdParamSchema,
} from "../schemas";
import type { PartnershipService } from "../services/partnership.service";

export type PartnershipController = {
  apply: RequestHandler;
  listMine: RequestHandler;
  dashboard: RequestHandler;
  getById: RequestHandler;
};

export function createPartnershipController(
  service: PartnershipService
): PartnershipController {
  const apply: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(applyPartnershipBodySchema, req.body);
      const data = await service.apply(req.identity, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const listMine: RequestHandler = async (req, res, next) => {
    try {
      const data = await service.listMine(req.identity);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const dashboard: RequestHandler = async (req, res, next) => {
    try {
      const data = await service.dashboard(req.identity);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const getById: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(partnershipIdParamSchema, req.params);
      const data = await service.getById(id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  return { apply, listMine, dashboard, getById };
}
