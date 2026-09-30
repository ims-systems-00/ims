import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  addSoftwareDocumentBodySchema,
  addSoftwareKeyBodySchema,
  createHardwareBodySchema,
  createInformationBodySchema,
  createPeopleBodySchema,
  createPremiseBodySchema,
  createSoftwareBodySchema,
  documentIdParamSchema,
  idParamSchema,
  keyIdParamSchema,
  listAssetsQuerySchema,
  updateHardwareBodySchema,
  updateInformationBodySchema,
  updatePeopleBodySchema,
  updatePremiseBodySchema,
  updateSoftwareBodySchema,
} from "../schemas";
import type { AssetsService } from "../services/assets.service";

export type AssetsController = {
  stats: RequestHandler;
  listHardware: RequestHandler;
  getHardware: RequestHandler;
  createHardware: RequestHandler;
  updateHardware: RequestHandler;
  deleteHardware: RequestHandler;
  listSoftware: RequestHandler;
  getSoftware: RequestHandler;
  createSoftware: RequestHandler;
  updateSoftware: RequestHandler;
  deleteSoftware: RequestHandler;
  addSoftwareKey: RequestHandler;
  removeSoftwareKey: RequestHandler;
  addSoftwareDocument: RequestHandler;
  removeSoftwareDocument: RequestHandler;
  listPeople: RequestHandler;
  getPeople: RequestHandler;
  createPeople: RequestHandler;
  updatePeople: RequestHandler;
  deletePeople: RequestHandler;
  listPremise: RequestHandler;
  getPremise: RequestHandler;
  createPremise: RequestHandler;
  updatePremise: RequestHandler;
  deletePremise: RequestHandler;
  listInformation: RequestHandler;
  getInformation: RequestHandler;
  createInformation: RequestHandler;
  updateInformation: RequestHandler;
  deleteInformation: RequestHandler;
};

export function createAssetsController(
  service: AssetsService
): AssetsController {
  const stats: RequestHandler = async (req, res, next) => {
    try {
      const data = await service.getStats(req.identity);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const listHardware: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(listAssetsQuerySchema, req.query);
      const data = await service.listHardware(req.identity, query);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const getHardware: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const data = await service.getHardware(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const createHardware: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(createHardwareBodySchema, req.body);
      const data = await service.createHardware(req.identity, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const updateHardware: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updateHardwareBodySchema, req.body);
      const data = await service.updateHardware(req.identity, id, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const deleteHardware: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      await service.deleteHardware(req.identity, id);
      sendSuccess(
        res,
        { message: "Hardware asset deleted successfully" },
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const listSoftware: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(listAssetsQuerySchema, req.query);
      const data = await service.listSoftware(req.identity, query);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const getSoftware: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const data = await service.getSoftware(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const createSoftware: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(createSoftwareBodySchema, req.body);
      const data = await service.createSoftware(req.identity, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const updateSoftware: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updateSoftwareBodySchema, req.body);
      const data = await service.updateSoftware(req.identity, id, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const deleteSoftware: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      await service.deleteSoftware(req.identity, id);
      sendSuccess(
        res,
        { message: "Software asset deleted successfully" },
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const addSoftwareKey: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(addSoftwareKeyBodySchema, req.body);
      const data = await service.addSoftwareKey(req.identity, id, body.value);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const removeSoftwareKey: RequestHandler = async (req, res, next) => {
    try {
      const { id, keyId } = parseWithSchema(keyIdParamSchema, req.params);
      const data = await service.removeSoftwareKey(req.identity, id, keyId);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const addSoftwareDocument: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(addSoftwareDocumentBodySchema, req.body);
      const data = await service.addSoftwareDocument(req.identity, id, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const removeSoftwareDocument: RequestHandler = async (req, res, next) => {
    try {
      const { id, documentId } = parseWithSchema(
        documentIdParamSchema,
        req.params
      );
      const data = await service.removeSoftwareDocument(
        req.identity,
        id,
        documentId
      );
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const listPeople: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(listAssetsQuerySchema, req.query);
      const data = await service.listPeople(req.identity, query);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const getPeople: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const data = await service.getPeople(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const createPeople: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(createPeopleBodySchema, req.body);
      const data = await service.createPeople(req.identity, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const updatePeople: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updatePeopleBodySchema, req.body);
      const data = await service.updatePeople(req.identity, id, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const deletePeople: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      await service.deletePeople(req.identity, id);
      sendSuccess(
        res,
        { message: "People asset deleted successfully" },
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const listPremise: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(listAssetsQuerySchema, req.query);
      const data = await service.listPremise(req.identity, query);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const getPremise: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const data = await service.getPremise(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const createPremise: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(createPremiseBodySchema, req.body);
      const data = await service.createPremise(req.identity, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const updatePremise: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updatePremiseBodySchema, req.body);
      const data = await service.updatePremise(req.identity, id, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const deletePremise: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      await service.deletePremise(req.identity, id);
      sendSuccess(
        res,
        { message: "Premise asset deleted successfully" },
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const listInformation: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(listAssetsQuerySchema, req.query);
      const data = await service.listInformation(req.identity, query);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const getInformation: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const data = await service.getInformation(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const createInformation: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(createInformationBodySchema, req.body);
      const data = await service.createInformation(req.identity, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const updateInformation: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updateInformationBodySchema, req.body);
      const data = await service.updateInformation(req.identity, id, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const deleteInformation: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      await service.deleteInformation(req.identity, id);
      sendSuccess(
        res,
        { message: "Information asset deleted successfully" },
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  return {
    stats,
    listHardware,
    getHardware,
    createHardware,
    updateHardware,
    deleteHardware,
    listSoftware,
    getSoftware,
    createSoftware,
    updateSoftware,
    deleteSoftware,
    addSoftwareKey,
    removeSoftwareKey,
    addSoftwareDocument,
    removeSoftwareDocument,
    listPeople,
    getPeople,
    createPeople,
    updatePeople,
    deletePeople,
    listPremise,
    getPremise,
    createPremise,
    updatePremise,
    deletePremise,
    listInformation,
    getInformation,
    createInformation,
    updateInformation,
    deleteInformation,
  };
}
