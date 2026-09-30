import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  addAttachmentsBodySchema,
  addKpiObjectiveBodySchema,
  createSupplierBodySchema,
  fileIdParamSchema,
  idParamSchema,
  kpiIdParamSchema,
  listSuppliersQuerySchema,
  updateSupplierBodySchema,
} from "../schemas";
import type { SupplierService } from "../services/supplier.service";

export type SupplierController = {
  list: RequestHandler;
  stats: RequestHandler;
  getById: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  remove: RequestHandler;
  addSlaFiles: RequestHandler;
  removeSlaFile: RequestHandler;
  addContractFiles: RequestHandler;
  removeContractFile: RequestHandler;
  addOnboardingFiles: RequestHandler;
  removeOnboardingFile: RequestHandler;
  addKpiObjective: RequestHandler;
  removeKpiObjective: RequestHandler;
};

export function createSupplierController(
  service: SupplierService
): SupplierController {
  const list: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(listSuppliersQuerySchema, req.query);
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
      const body = parseWithSchema(createSupplierBodySchema, req.body);
      const data = await service.create(req.identity, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const update: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updateSupplierBodySchema, req.body);
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
        { message: "Supplier deleted successfully" },
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const addSlaFiles: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(addAttachmentsBodySchema, req.body);
      const data = await service.addSlaFiles(req.identity, id, body.files);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const removeSlaFile: RequestHandler = async (req, res, next) => {
    try {
      const { id, fileId } = parseWithSchema(fileIdParamSchema, req.params);
      const data = await service.removeSlaFile(req.identity, id, fileId);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const addContractFiles: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(addAttachmentsBodySchema, req.body);
      const data = await service.addContractFiles(
        req.identity,
        id,
        body.files
      );
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const removeContractFile: RequestHandler = async (req, res, next) => {
    try {
      const { id, fileId } = parseWithSchema(fileIdParamSchema, req.params);
      const data = await service.removeContractFile(
        req.identity,
        id,
        fileId
      );
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const addOnboardingFiles: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(addAttachmentsBodySchema, req.body);
      const data = await service.addOnboardingFiles(
        req.identity,
        id,
        body.files
      );
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const removeOnboardingFile: RequestHandler = async (req, res, next) => {
    try {
      const { id, fileId } = parseWithSchema(fileIdParamSchema, req.params);
      const data = await service.removeOnboardingFile(
        req.identity,
        id,
        fileId
      );
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const addKpiObjective: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(addKpiObjectiveBodySchema, req.body);
      const data = await service.addKpiObjective(req.identity, id, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const removeKpiObjective: RequestHandler = async (req, res, next) => {
    try {
      const { id, kpiId } = parseWithSchema(kpiIdParamSchema, req.params);
      const data = await service.removeKpiObjective(req.identity, id, kpiId);
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
    addSlaFiles,
    removeSlaFile,
    addContractFiles,
    removeContractFile,
    addOnboardingFiles,
    removeOnboardingFile,
    addKpiObjective,
    removeKpiObjective,
  };
}
