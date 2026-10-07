import { Router } from "express";
import type { Authorizer } from "../../../security";
import { createTagAndCategoryRepository } from "../repositories/tag-and-category.repository";
import {
  createTagsAndCategoriesService,
  type TagsAndCategoriesApplicationPort,
  type TagsAndCategoriesService,
} from "../services/tags-and-categories.service";
import { createTagsAndCategoriesController } from "../controllers/tags-and-categories.controller";

export type TagsAndCategoriesRouterDeps = {
  authorizer: Authorizer;
};

/**
 * Compose Tags and Categories catalogue module.
 * Mounted at /api/v1/tags-and-categories
 */
export function createTagsAndCategoriesModule(
  deps: TagsAndCategoriesRouterDeps
): {
  service: TagsAndCategoriesService;
  application: TagsAndCategoriesApplicationPort;
  router: Router;
} {
  const repository = createTagAndCategoryRepository();
  const service = createTagsAndCategoriesService({
    repository,
    authorizer: deps.authorizer,
  });
  const controller = createTagsAndCategoriesController(service);
  const router = Router();

  router.get("/", controller.list);
  router.post("/", controller.create);
  router.get("/:id", controller.getById);
  router.patch("/:id", controller.update);
  router.delete("/:id", controller.remove);

  return {
    service,
    application: {
      getById: (organizationId, id) =>
        service.getByIdForOrganization(organizationId, id),
      listForModule: (organizationId, applicableModule, query = {}) =>
        service.listForOrganization(organizationId, {
          page: query.page ?? 1,
          pageSize: query.pageSize ?? 200,
          search: query.search,
          applicableModule,
          sort: query.sort ?? "name",
          sortDir: query.sortDir ?? "asc",
        }),
      listOptionsForModule: (organizationId, applicableModule) =>
        service.listOptionsForModule(organizationId, applicableModule),
    },
    router,
  };
}

export function createTagsAndCategoriesRouter(
  deps: TagsAndCategoriesRouterDeps
): Router {
  return createTagsAndCategoriesModule(deps).router;
}
