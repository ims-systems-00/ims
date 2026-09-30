import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  functionalUnitIdParamSchema,
  liveDashboardQuerySchema,
} from "../schemas";
import type { DashboardService } from "../services/dashboard.service";

export type DashboardController = {
  getOrganisation: RequestHandler;
  getFunctionalUnit: RequestHandler;
};

export function createDashboardController(
  service: DashboardService
): DashboardController {
  const getOrganisation: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(liveDashboardQuerySchema, req.query);
      const data = await service.getOrganisationDashboard(req.identity, query);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const getFunctionalUnit: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(functionalUnitIdParamSchema, req.params);
      const query = parseWithSchema(liveDashboardQuerySchema, req.query);
      const data = await service.getFunctionalUnitDashboard(
        req.identity,
        id,
        query
      );
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  return { getOrganisation, getFunctionalUnit };
}
