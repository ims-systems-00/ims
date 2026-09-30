import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  addMembersBodySchema,
  attachPolicyBodySchema,
  assignToolkitsBodySchema,
  createFunctionalUnitBodySchema,
  eligibleMembersQuerySchema,
  idParamSchema,
  listFunctionalUnitsQuerySchema,
  memberIdParamSchema,
  updateFunctionalUnitBodySchema,
} from "../schemas";
import type { FunctionalUnitService } from "../services/functional-unit.service";

export type FunctionalUnitController = {
  list: RequestHandler;
  getById: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  remove: RequestHandler;
  attachPolicy: RequestHandler;
  assignToolkits: RequestHandler;
  listMembers: RequestHandler;
  listEligibleMembers: RequestHandler;
  addMembers: RequestHandler;
  removeMember: RequestHandler;
};

export function createFunctionalUnitController(
  service: FunctionalUnitService
): FunctionalUnitController {
  const list: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(listFunctionalUnitsQuerySchema, req.query);
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
      const body = parseWithSchema(createFunctionalUnitBodySchema, req.body);
      const data = await service.create(req.identity, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const update: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updateFunctionalUnitBodySchema, req.body);
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
        { message: "Functional unit deleted successfully" },
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const attachPolicy: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(attachPolicyBodySchema, req.body);
      const data = await service.attachPolicy(req.identity, id, body.policyId);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const assignToolkits: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(assignToolkitsBodySchema, req.body);
      const data = await service.assignComplianceToolkits(
        req.identity,
        id,
        body.complianceToolkits
      );
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const listMembers: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const data = await service.listMembers(req.identity, id);
      sendSuccess(res, { items: data }, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const listEligibleMembers: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const query = parseWithSchema(eligibleMembersQuerySchema, req.query);
      const data = await service.listEligibleMembers(
        req.identity,
        id,
        query.search
      );
      sendSuccess(res, { items: data }, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const addMembers: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(addMembersBodySchema, req.body);
      const data = await service.addMembers(req.identity, id, body.userIds);
      sendSuccess(
        res,
        { message: "User added successfully", ...data },
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const removeMember: RequestHandler = async (req, res, next) => {
    try {
      const { id, userId } = parseWithSchema(memberIdParamSchema, req.params);
      const data = await service.removeMember(req.identity, id, userId);
      sendSuccess(
        res,
        { message: "Member removed successfully", ...data },
        200,
        req.correlationId
      );
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
    attachPolicy,
    assignToolkits,
    listMembers,
    listEligibleMembers,
    addMembers,
    removeMember,
  };
}
