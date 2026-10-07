import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  addEmbeddedEvidenceBodySchema,
  attachmentParamsSchema,
  controlEvidenceParamsSchema,
  createControlEvidenceBodySchema,
  idParamSchema,
  listControlEvidenceQuerySchema,
  listCatalogueControlsQuerySchema,
  listControlsQuerySchema,
  pickerQuerySchema,
  provisionToolkitBodySchema,
  toolkitNameParamSchema,
  updateControlRaciBodySchema,
  updateControlStatusBodySchema,
} from "../schemas";
import type { ComplianceService } from "../services/compliance.service";

export type ComplianceController = {
  listToolkits: RequestHandler;
  provisionToolkit: RequestHandler;
  deleteToolkit: RequestHandler;
  getOverview: RequestHandler;
  listControls: RequestHandler;
  listCatalogueControls: RequestHandler;
  getControl: RequestHandler;
  updateControlStatus: RequestHandler;
  updateControlRaci: RequestHandler;
  listControlEvidence: RequestHandler;
  addControlEvidence: RequestHandler;
  removeControlEvidence: RequestHandler;
  addEmbeddedEvidence: RequestHandler;
  removeEmbeddedEvidence: RequestHandler;
  picker: RequestHandler;
};

export function createComplianceController(
  service: ComplianceService
): ComplianceController {
  const listToolkits: RequestHandler = async (req, res, next) => {
    try {
      const data = await service.listToolkits(req.identity);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };

  const provisionToolkit: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(provisionToolkitBodySchema, req.body);
      const data = await service.provisionToolkit(req.identity, body);
      sendSuccess(res, data, 201);
    } catch (error) {
      next(error);
    }
  };

  const deleteToolkit: RequestHandler = async (req, res, next) => {
    try {
      const { name } = parseWithSchema(toolkitNameParamSchema, {
        name: decodeURIComponent(String(req.params.name ?? "")),
      });
      const data = await service.deleteToolkit(req.identity, name);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };

  const getOverview: RequestHandler = async (req, res, next) => {
    try {
      const { name } = parseWithSchema(toolkitNameParamSchema, {
        name: decodeURIComponent(String(req.params.name ?? "")),
      });
      const data = await service.getOverview(req.identity, name);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };

  const listControls: RequestHandler = async (req, res, next) => {
    try {
      const { name } = parseWithSchema(toolkitNameParamSchema, {
        name: decodeURIComponent(String(req.params.name ?? "")),
      });
      const query = parseWithSchema(listControlsQuerySchema, req.query);
      const data = await service.listControls(req.identity, name, query);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };

  const listCatalogueControls: RequestHandler = async (req, res, next) => {
    try {
      const { name } = parseWithSchema(toolkitNameParamSchema, {
        name: decodeURIComponent(String(req.params.name ?? "")),
      });
      const query = parseWithSchema(listCatalogueControlsQuerySchema, req.query);
      const data = await service.listCatalogueControls(
        req.identity,
        name,
        query
      );
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };

  const getControl: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const data = await service.getControl(req.identity, id);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };

  const updateControlStatus: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updateControlStatusBodySchema, req.body);
      const data = await service.updateControlStatus(req.identity, id, body);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };

  const updateControlRaci: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updateControlRaciBodySchema, req.body);
      const data = await service.updateControlRaci(req.identity, id, body);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };

  const listControlEvidence: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const query = parseWithSchema(listControlEvidenceQuerySchema, req.query);
      const data = await service.listControlEvidence(req.identity, id, query);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };

  const addControlEvidence: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(createControlEvidenceBodySchema, req.body);
      const data = await service.addControlEvidence(req.identity, id, body);
      sendSuccess(res, data, 201);
    } catch (error) {
      next(error);
    }
  };

  const removeControlEvidence: RequestHandler = async (req, res, next) => {
    try {
      const params = parseWithSchema(controlEvidenceParamsSchema, {
        id: req.params.id,
        evidenceId: req.params.evidenceId,
      });
      const data = await service.removeControlEvidence(
        req.identity,
        params.id,
        params.evidenceId
      );
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };

  const addEmbeddedEvidence: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(addEmbeddedEvidenceBodySchema, req.body);
      const data = await service.addEmbeddedEvidence(req.identity, id, body);
      sendSuccess(res, data, 201);
    } catch (error) {
      next(error);
    }
  };

  const removeEmbeddedEvidence: RequestHandler = async (req, res, next) => {
    try {
      const params = parseWithSchema(attachmentParamsSchema, {
        id: req.params.id,
        attachmentId: req.params.attachmentId,
      });
      const data = await service.removeEmbeddedEvidence(
        req.identity,
        params.id,
        params.attachmentId
      );
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };

  const picker: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(pickerQuerySchema, req.query);
      const data = await service.picker(req.identity, query);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };

  return {
    listToolkits,
    provisionToolkit,
    deleteToolkit,
    getOverview,
    listControls,
    listCatalogueControls,
    getControl,
    updateControlStatus,
    updateControlRaci,
    listControlEvidence,
    addControlEvidence,
    removeControlEvidence,
    addEmbeddedEvidence,
    removeEmbeddedEvidence,
    picker,
  };
}
