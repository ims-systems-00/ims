import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  attachmentIdParamSchema,
  createCustomerBodySchema,
  idParamSchema,
  listCustomersQuerySchema,
  managerIdParamSchema,
  updateCustomerBodySchema,
} from "../schemas";
import type { CustomerService } from "../services/customer.service";

export type CustomerController = {
  list: RequestHandler;
  getById: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  remove: RequestHandler;
  removeAttachment: RequestHandler;
  overview: RequestHandler;
  managerOverview: RequestHandler;
};

export function createCustomerController(
  service: CustomerService
): CustomerController {
  const list: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(listCustomersQuerySchema, req.query);
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
      const body = parseWithSchema(createCustomerBodySchema, req.body);
      const data = await service.create(req.identity, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const update: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updateCustomerBodySchema, req.body);
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
        { message: "Customer deleted successfully" },
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

  const overview: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const data = await service.getOverview(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const managerOverview: RequestHandler = async (req, res, next) => {
    try {
      const { managerId } = parseWithSchema(managerIdParamSchema, req.params);
      const data = await service.getAccountManagerOverview(
        req.identity,
        managerId
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
    update,
    remove,
    removeAttachment,
    overview,
    managerOverview,
  };
}
