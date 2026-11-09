import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  createFormBodySchema,
  createFormElementBodySchema,
  createSubmissionBodySchema,
  formElementParamsSchema,
  formIdParamSchema,
  formSubmissionParamsSchema,
  idParamSchema,
  listFormsQuerySchema,
  listSubmissionsQuerySchema,
  reorderFormElementBodySchema,
  updateFormBodySchema,
  updateFormElementBodySchema,
  updateSubmissionBodySchema,
} from "../schemas";
import type { FormService } from "../services/form.service";

export type FormController = {
  list: RequestHandler;
  getById: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  softDelete: RequestHandler;
  hardDelete: RequestHandler;
  restore: RequestHandler;
  listElements: RequestHandler;
  getElement: RequestHandler;
  createElement: RequestHandler;
  updateElement: RequestHandler;
  reorderElement: RequestHandler;
  hardDeleteElement: RequestHandler;
  listSubmissions: RequestHandler;
  getSubmission: RequestHandler;
  createSubmission: RequestHandler;
  updateSubmission: RequestHandler;
  hardDeleteSubmission: RequestHandler;
};

export function createFormController(service: FormService): FormController {
  const list: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(listFormsQuerySchema, req.query);
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
      const body = parseWithSchema(createFormBodySchema, req.body);
      const data = await service.create(req.identity, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const update: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updateFormBodySchema, req.body);
      const data = await service.update(req.identity, id, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const softDelete: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      await service.softDelete(req.identity, id);
      sendSuccess(
        res,
        { message: "Form moved to trash" },
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const hardDelete: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      await service.hardDelete(req.identity, id);
      sendSuccess(res, { message: "Form removed" }, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const restore: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const data = await service.restore(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const listElements: RequestHandler = async (req, res, next) => {
    try {
      const { formId } = parseWithSchema(formIdParamSchema, req.params);
      const data = await service.listElements(req.identity, formId);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const getElement: RequestHandler = async (req, res, next) => {
    try {
      const { formId, id } = parseWithSchema(
        formElementParamsSchema,
        req.params
      );
      const data = await service.getElement(req.identity, formId, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const createElement: RequestHandler = async (req, res, next) => {
    try {
      const { formId } = parseWithSchema(formIdParamSchema, req.params);
      const body = parseWithSchema(createFormElementBodySchema, req.body);
      const data = await service.createElement(req.identity, formId, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const updateElement: RequestHandler = async (req, res, next) => {
    try {
      const { formId, id } = parseWithSchema(
        formElementParamsSchema,
        req.params
      );
      const body = parseWithSchema(updateFormElementBodySchema, req.body);
      const data = await service.updateElement(req.identity, formId, id, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const reorderElement: RequestHandler = async (req, res, next) => {
    try {
      const { formId, id } = parseWithSchema(
        formElementParamsSchema,
        req.params
      );
      const body = parseWithSchema(reorderFormElementBodySchema, req.body);
      const data = await service.reorderElement(
        req.identity,
        formId,
        id,
        body
      );
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const hardDeleteElement: RequestHandler = async (req, res, next) => {
    try {
      const { formId, id } = parseWithSchema(
        formElementParamsSchema,
        req.params
      );
      await service.hardDeleteElement(req.identity, formId, id);
      sendSuccess(
        res,
        { message: "Form element removed" },
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const listSubmissions: RequestHandler = async (req, res, next) => {
    try {
      const { formId } = parseWithSchema(formIdParamSchema, req.params);
      const query = parseWithSchema(listSubmissionsQuerySchema, req.query);
      const data = await service.listSubmissions(req.identity, formId, query);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const getSubmission: RequestHandler = async (req, res, next) => {
    try {
      const { formId, id } = parseWithSchema(
        formSubmissionParamsSchema,
        req.params
      );
      const data = await service.getSubmission(req.identity, formId, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const createSubmission: RequestHandler = async (req, res, next) => {
    try {
      const { formId } = parseWithSchema(formIdParamSchema, req.params);
      const body = parseWithSchema(createSubmissionBodySchema, req.body);
      const data = await service.createSubmission(req.identity, formId, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const updateSubmission: RequestHandler = async (req, res, next) => {
    try {
      const { formId, id } = parseWithSchema(
        formSubmissionParamsSchema,
        req.params
      );
      const body = parseWithSchema(updateSubmissionBodySchema, req.body);
      const data = await service.updateSubmission(
        req.identity,
        formId,
        id,
        body
      );
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const hardDeleteSubmission: RequestHandler = async (req, res, next) => {
    try {
      const { formId, id } = parseWithSchema(
        formSubmissionParamsSchema,
        req.params
      );
      await service.hardDeleteSubmission(req.identity, formId, id);
      sendSuccess(
        res,
        { message: "Submission removed" },
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
    softDelete,
    hardDelete,
    restore,
    listElements,
    getElement,
    createElement,
    updateElement,
    reorderElement,
    hardDeleteElement,
    listSubmissions,
    getSubmission,
    createSubmission,
    updateSubmission,
    hardDeleteSubmission,
  };
}
