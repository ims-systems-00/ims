import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  createOrganisationBodySchema,
  organisationIdParamSchema,
} from "../schemas";
import type { OrganisationService } from "../services/organisation.service";

export type OrganisationController = {
  create: RequestHandler;
  getCurrent: RequestHandler;
  getById: RequestHandler;
  listMine: RequestHandler;
};

export function createOrganisationController(
  service: OrganisationService
): OrganisationController {
  const create: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(createOrganisationBodySchema, req.body);
      const data = await service.create(req.identity, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const getCurrent: RequestHandler = async (req, res, next) => {
    try {
      const data = await service.getCurrent(req.identity);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const getById: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(organisationIdParamSchema, req.params);
      const data = await service.getById(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
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

  return { create, getCurrent, getById, listMine };
}
