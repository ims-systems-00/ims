import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import { statsDateQuerySchema, statsRiskQuerySchema } from "../schemas";
import type { StatsService } from "../services/stats.service";

export type StatsController = {
  globalStats: RequestHandler;
  digitalMaturityStats: RequestHandler;
  complianceStats: RequestHandler;
  auditStats: RequestHandler;
  riskStats: RequestHandler;
  incidentStats: RequestHandler;
  inventoryStats: RequestHandler;
  supplierStats: RequestHandler;
  cipStats: RequestHandler;
  crmStats: RequestHandler;
};

export function createStatsController(service: StatsService): StatsController {
  const globalStats: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(statsDateQuerySchema, req.query);
      const data = await service.globalStats(req.identity, query);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const digitalMaturityStats: RequestHandler = async (req, res, next) => {
    try {
      const data = await service.digitalMaturityStats(req.identity);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const complianceStats: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(statsDateQuerySchema, req.query);
      const data = await service.complianceStats(req.identity, query);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const auditStats: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(statsDateQuerySchema, req.query);
      const data = await service.auditStats(req.identity, query);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const riskStats: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(statsRiskQuerySchema, req.query);
      const data = await service.riskStats(req.identity, query);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const incidentStats: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(statsDateQuerySchema, req.query);
      const data = await service.incidentStats(req.identity, query);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const inventoryStats: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(statsDateQuerySchema, req.query);
      const data = await service.inventoryStats(req.identity, query);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const supplierStats: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(statsDateQuerySchema, req.query);
      const data = await service.supplierStats(req.identity, query);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const cipStats: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(statsDateQuerySchema, req.query);
      const data = await service.cipStats(req.identity, query);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const crmStats: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(statsDateQuerySchema, req.query);
      const data = await service.crmStats(req.identity, query);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  return {
    globalStats,
    digitalMaturityStats,
    complianceStats,
    auditStats,
    riskStats,
    incidentStats,
    inventoryStats,
    supplierStats,
    cipStats,
    crmStats,
  };
}
