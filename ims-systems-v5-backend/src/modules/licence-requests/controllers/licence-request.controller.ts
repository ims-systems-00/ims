import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  createLicenceRequestBodySchema,
  licenceRequestIdParamSchema,
  listLicenceRequestsQuerySchema,
} from "../schemas";
import type { LicenceRequestService } from "../services/licence-request.service";

export type LicenceRequestController = {
  create: RequestHandler;
  list: RequestHandler;
  getById: RequestHandler;
};

export function createLicenceRequestController(
  service: LicenceRequestService
): LicenceRequestController {
  const create: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(createLicenceRequestBodySchema, req.body);
      const data = await service.create(req.identity, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const list: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(
        listLicenceRequestsQuerySchema,
        req.query
      );
      const data = await service.list(req.identity, query);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const getById: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(licenceRequestIdParamSchema, req.params);
      const data = await service.getById(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  return { create, list, getById };
}
