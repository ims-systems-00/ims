/**
 * Tags and Categories application service.
 * Spec: docs/module-specifications/tags-and-categories.md
 *
 * Organisation-scoped classification catalogue.
 * Update persists name/description only (applicableModules immutable after create).
 * Hard delete with no cascade to linked business records.
 */

import type { Authorizer, SecurityIdentity } from "../../../security";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import type { TagAndCategoryRepository } from "../repositories/tag-and-category.repository";
import {
  TAGS_AND_CATEGORIES_RESOURCE,
  type CreateTagAndCategoryInput,
  type ListTagsAndCategoriesQuery,
  type PaginatedTagsAndCategories,
  type TagAndCategory,
  type TagAndCategoryOption,
  type TagApplicableModule,
  type UpdateTagAndCategoryInput,
} from "../types";

function requireOrgIdentity(identity: SecurityIdentity | null | undefined): {
  identity: SecurityIdentity;
  organizationId: string;
  subjectId: string;
} {
  if (!identity?.subjectId) throw new UnauthorizedError();
  if (!identity.organizationId) {
    throw new ForbiddenError("Organisation context is required");
  }
  return {
    identity,
    organizationId: identity.organizationId,
    subjectId: identity.subjectId,
  };
}

function toOption(tag: TagAndCategory): TagAndCategoryOption {
  return {
    id: tag.id,
    name: tag.name,
    description: tag.description,
    applicableModules: [...tag.applicableModules],
  };
}

export type TagsAndCategoriesServiceDeps = {
  repository: TagAndCategoryRepository;
  authorizer: Authorizer;
};

export type TagsAndCategoriesService = ReturnType<
  typeof createTagsAndCategoriesService
>;

/**
 * Narrow public surface for Risk / Incident / Inventory / CRM consumers.
 * Do not import the repository or Mongoose model from outside this module.
 */
export type TagsAndCategoriesApplicationPort = {
  getById(
    organizationId: string,
    id: string
  ): Promise<TagAndCategory | null>;
  listForModule(
    organizationId: string,
    applicableModule: TagApplicableModule,
    query?: Partial<ListTagsAndCategoriesQuery>
  ): Promise<PaginatedTagsAndCategories>;
  listOptionsForModule(
    organizationId: string,
    applicableModule: TagApplicableModule
  ): Promise<TagAndCategoryOption[]>;
};

export function createTagsAndCategoriesService(
  deps: TagsAndCategoriesServiceDeps
) {
  const { repository, authorizer } = deps;

  async function assertAllowed(
    identity: SecurityIdentity,
    action: "read" | "create" | "update" | "delete"
  ): Promise<void> {
    const allowed = await authorizer.allow({
      identity,
      action,
      resourceType: TAGS_AND_CATEGORIES_RESOURCE,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError(
        "User does not have permission to access Tags and Categories"
      );
    }
  }

  return {
    async create(
      identity: SecurityIdentity | null | undefined,
      input: CreateTagAndCategoryInput
    ): Promise<TagAndCategory> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");

      const name = input.name?.trim() ?? "";
      if (!name) throw new ValidationAppError("Name is required");

      const description = (input.description ?? "").trim();
      const applicableModules = [...new Set(input.applicableModules ?? [])];

      return repository.create(organizationId, {
        name,
        description,
        applicableModules,
        createdBy: subjectId,
        createdOn: new Date(),
      });
    },

    async list(
      identity: SecurityIdentity | null | undefined,
      query: ListTagsAndCategoriesQuery
    ): Promise<PaginatedTagsAndCategories> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      return repository.list(organizationId, query);
    },

    async getById(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<TagAndCategory> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const tag = await repository.findById(organizationId, id);
      if (!tag) throw new NotFoundError("TagAndCategory not found");
      return tag;
    },

    async update(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateTagAndCategoryInput
    ): Promise<TagAndCategory> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "update");

      const existing = await repository.findById(organizationId, id);
      if (!existing) throw new NotFoundError("TagAndCategory not found");

      if (input.name === undefined && input.description === undefined) {
        throw new ValidationAppError("At least one field must be provided");
      }

      const name =
        input.name !== undefined ? input.name.trim() : undefined;
      if (name !== undefined && !name) {
        throw new ValidationAppError("Name is required");
      }

      const updated = await repository.update(organizationId, id, {
        name,
        description:
          input.description === undefined
            ? undefined
            : input.description === null
              ? ""
              : input.description.trim(),
        updatedBy: subjectId,
        updatedOn: new Date(),
      });
      if (!updated) throw new NotFoundError("TagAndCategory not found");
      return updated;
    },

    async remove(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<TagAndCategory> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "delete");

      const existing = await repository.findById(organizationId, id);
      if (!existing) throw new NotFoundError("TagAndCategory not found");

      const deleted = await repository.hardDelete(organizationId, id);
      if (!deleted) throw new NotFoundError("TagAndCategory not found");
      return existing;
    },

    async getByIdForOrganization(
      organizationId: string,
      id: string
    ): Promise<TagAndCategory | null> {
      return repository.findById(organizationId, id);
    },

    async listForOrganization(
      organizationId: string,
      query: ListTagsAndCategoriesQuery
    ): Promise<PaginatedTagsAndCategories> {
      return repository.list(organizationId, query);
    },

    async listOptionsForModule(
      organizationId: string,
      applicableModule: TagApplicableModule
    ): Promise<TagAndCategoryOption[]> {
      const page = await repository.list(organizationId, {
        page: 1,
        pageSize: 200,
        applicableModule,
        sort: "name",
        sortDir: "asc",
      });
      return page.items.map(toOption);
    },
  };
}
