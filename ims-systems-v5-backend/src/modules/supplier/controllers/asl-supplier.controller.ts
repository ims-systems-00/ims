import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  auditorPackQuerySchema,
  createAslEvaluationBodySchema,
  createAslSupplierBodySchema,
  docIdParamSchema,
  idParamSchema,
  listAslSuppliersQuerySchema,
  notifyAslBodySchema,
  preparePublicUploadBodySchema,
  publicUploadBodySchema,
  shareAslBodySchema,
  tokenParamSchema,
  updateAslSettingsBodySchema,
  updateAslSupplierBodySchema,
  upsertAslDocumentBodySchema,
} from "../schemas";
import type { AslSupplierService } from "../services/asl-supplier.service";

export type AslSupplierController = {
  getSettings: RequestHandler;
  updateSettings: RequestHandler;
  overview: RequestHandler;
  list: RequestHandler;
  create: RequestHandler;
  getById: RequestHandler;
  update: RequestHandler;
  addDocument: RequestHandler;
  updateDocument: RequestHandler;
  deleteDocument: RequestHandler;
  addEvaluation: RequestHandler;
  notify: RequestHandler;
  auditorPack: RequestHandler;
  exportCsv: RequestHandler;
  share: RequestHandler;
  publicSnapshot: RequestHandler;
  uploadContext: RequestHandler;
  preparePublicUpload: RequestHandler;
  publicUpload: RequestHandler;
};

export function createAslSupplierController(
  service: AslSupplierService
): AslSupplierController {
  const getSettings: RequestHandler = async (req, res, next) => {
    try {
      const data = await service.getSettings(req.identity);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const updateSettings: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(updateAslSettingsBodySchema, req.body);
      const data = await service.updateSettings(req.identity, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const overview: RequestHandler = async (req, res, next) => {
    try {
      const data = await service.overview(req.identity);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const list: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(listAslSuppliersQuerySchema, req.query);
      const data = await service.list(req.identity, query);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const create: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(createAslSupplierBodySchema, req.body);
      const data = await service.create(req.identity, {
        ...body,
        email: body.email || "",
      });
      sendSuccess(res, data, 201, req.correlationId);
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

  const update: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updateAslSupplierBodySchema, req.body);
      const data = await service.update(req.identity, id, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const addDocument: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(upsertAslDocumentBodySchema, req.body);
      const data = await service.addDocument(req.identity, id, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const updateDocument: RequestHandler = async (req, res, next) => {
    try {
      const { id, docId } = parseWithSchema(docIdParamSchema, req.params);
      const body = parseWithSchema(upsertAslDocumentBodySchema, req.body);
      const data = await service.updateDocument(req.identity, id, docId, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const deleteDocument: RequestHandler = async (req, res, next) => {
    try {
      const { id, docId } = parseWithSchema(docIdParamSchema, req.params);
      const data = await service.deleteDocument(req.identity, id, docId);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const addEvaluation: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(createAslEvaluationBodySchema, req.body);
      const data = await service.addEvaluation(req.identity, id, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const notify: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(notifyAslBodySchema, req.body);
      const data = await service.notify(req.identity, body.ids);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const auditorPack: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(auditorPackQuerySchema, req.query);
      const pack = await service.auditorPack(req.identity, query.format);
      res.setHeader("Content-Type", pack.contentType);
      res.setHeader(
        "Content-Disposition",
        `${query.format === "pdf" ? "attachment" : "inline"}; filename="${pack.filename}"`
      );
      res.status(200).send(pack.body);
    } catch (error) {
      next(error);
    }
  };

  const exportCsv: RequestHandler = async (req, res, next) => {
    try {
      const csv = await service.exportCsv(req.identity);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="approved-supplier-list.csv"'
      );
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  };

  const share: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(shareAslBodySchema, req.body ?? {});
      const data = await service.share(req.identity, body.expiresInDays);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const publicSnapshot: RequestHandler = async (req, res, next) => {
    try {
      const { token } = parseWithSchema(tokenParamSchema, req.params);
      const data = await service.getPublicSnapshot(token);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const uploadContext: RequestHandler = async (req, res, next) => {
    try {
      const { token } = parseWithSchema(tokenParamSchema, req.params);
      const data = await service.getUploadContext(token);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const preparePublicUpload: RequestHandler = async (req, res, next) => {
    try {
      const { token } = parseWithSchema(tokenParamSchema, req.params);
      const body = parseWithSchema(preparePublicUploadBodySchema, req.body);
      const data = await service.preparePublicUpload(token, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const publicUpload: RequestHandler = async (req, res, next) => {
    try {
      const { token } = parseWithSchema(tokenParamSchema, req.params);
      const body = parseWithSchema(publicUploadBodySchema, req.body);
      const data = await service.publicUpload(token, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  return {
    getSettings,
    updateSettings,
    overview,
    list,
    create,
    getById,
    update,
    addDocument,
    updateDocument,
    deleteDocument,
    addEvaluation,
    notify,
    auditorPack,
    exportCsv,
    share,
    publicSnapshot,
    uploadContext,
    preparePublicUpload,
    publicUpload,
  };
}
