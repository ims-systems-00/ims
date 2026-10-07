import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  createTagAndCategoryBodySchema,
  idParamSchema,
  listTagsAndCategoriesQuerySchema,
  updateTagAndCategoryBodySchema,
} from "../schemas";
import type { TagsAndCategoriesService } from "../services/tags-and-categories.service";

export type TagsAndCategoriesController = {
  list: RequestHandler;
  getById: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  remove: RequestHandler;
};

export function createTagsAndCategoriesController(
  service: TagsAndCategoriesService
): TagsAndCategoriesController {
  const list: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(listTagsAndCategoriesQuerySchema, req.query);
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
      const body = parseWithSchema(createTagAndCategoryBodySchema, req.body);
      const data = await service.create(req.identity, {
        name: body.name,
        description: body.description ?? undefined,
        applicableModules: body.applicableModules,
      });
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const update: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updateTagAndCategoryBodySchema, req.body);
      // Spec: applicableModules on update is ignored even if clients send it.
      const data = await service.update(req.identity, id, {
        name: body.name,
        description: body.description,
      });
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const remove: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const data = await service.remove(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  return { list, getById, create, update, remove };
}
