import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  emitBatchBodySchema,
  emitEvidenceBodySchema,
  listEvidenceQuerySchema,
  updateScopeBodySchema,
  updateSettingsBodySchema,
} from "../schemas";
import type { RelyableService } from "../services/relyable.service";

export type RelyableController = {
  getSettings: RequestHandler;
  updateSettings: RequestHandler;
  updateScope: RequestHandler;
  getDashboard: RequestHandler;
  getRating: RequestHandler;
  listEvidence: RequestHandler;
  emitEvidence: RequestHandler;
  emitBatch: RequestHandler;
  sync: RequestHandler;
  getStandard: RequestHandler;
};

export function createRelyableController(
  service: RelyableService
): RelyableController {
  const getSettings: RequestHandler = async (req, res, next) => {
    try {
      sendSuccess(
        res,
        await service.getSettings(req.identity),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const updateSettings: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(updateSettingsBodySchema, req.body);
      sendSuccess(
        res,
        await service.updateSettings(req.identity, body),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const updateScope: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(updateScopeBodySchema, req.body);
      sendSuccess(
        res,
        await service.updateScope(req.identity, body),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const getDashboard: RequestHandler = async (req, res, next) => {
    try {
      sendSuccess(
        res,
        await service.getDashboard(req.identity),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const getRating: RequestHandler = async (req, res, next) => {
    try {
      sendSuccess(
        res,
        await service.getRating(req.identity),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const listEvidence: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(listEvidenceQuerySchema, req.query);
      sendSuccess(
        res,
        await service.listEvidence(req.identity, query.limit),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const emitEvidence: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(emitEvidenceBodySchema, req.body);
      sendSuccess(
        res,
        await service.emitEvidence(req.identity, {
          ...body,
          source: body.source ?? "api",
        }),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const emitBatch: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(emitBatchBodySchema, req.body);
      sendSuccess(
        res,
        await service.emitBatch(
          req.identity,
          body.items.map((i) => ({ ...i, source: i.source ?? "api" }))
        ),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const sync: RequestHandler = async (req, res, next) => {
    try {
      sendSuccess(
        res,
        await service.sync(req.identity),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const getStandard: RequestHandler = async (req, res, next) => {
    try {
      sendSuccess(
        res,
        await service.getStandard(req.identity),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  return {
    getSettings,
    updateSettings,
    updateScope,
    getDashboard,
    getRating,
    listEvidence,
    emitEvidence,
    emitBatch,
    sync,
    getStandard,
  };
}
