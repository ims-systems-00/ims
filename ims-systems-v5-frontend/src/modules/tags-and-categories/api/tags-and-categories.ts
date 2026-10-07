import { apiRequest } from "@/shared/lib/http";
import type {
  CreateTagAndCategoryInput,
  ListTagsAndCategoriesParams,
  PaginatedTagsAndCategories,
  TagAndCategory,
  UpdateTagAndCategoryInput,
} from "../types";

function toQuery(params: ListTagsAndCategoriesParams = {}): string {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.search) search.set("search", params.search);
  if (params.applicableModule) {
    search.set("applicableModule", params.applicableModule);
  }
  if (params.sort) search.set("sort", params.sort);
  if (params.sortDir) search.set("sortDir", params.sortDir);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function listTagsAndCategories(
  params?: ListTagsAndCategoriesParams
): Promise<PaginatedTagsAndCategories> {
  return apiRequest<PaginatedTagsAndCategories>(
    `/tags-and-categories${toQuery(params)}`
  );
}

export function getTagAndCategory(id: string): Promise<TagAndCategory> {
  return apiRequest<TagAndCategory>(`/tags-and-categories/${id}`);
}

export function createTagAndCategory(
  body: CreateTagAndCategoryInput
): Promise<TagAndCategory> {
  return apiRequest<TagAndCategory>("/tags-and-categories", {
    method: "POST",
    body,
  });
}

export function updateTagAndCategory(
  id: string,
  body: UpdateTagAndCategoryInput
): Promise<TagAndCategory> {
  return apiRequest<TagAndCategory>(`/tags-and-categories/${id}`, {
    method: "PATCH",
    body,
  });
}

export function deleteTagAndCategory(id: string): Promise<TagAndCategory> {
  return apiRequest<TagAndCategory>(`/tags-and-categories/${id}`, {
    method: "DELETE",
  });
}
