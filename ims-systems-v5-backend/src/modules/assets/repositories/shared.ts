import type { Model } from "mongoose";
import type { ListAssetsQuery, Paginated } from "../types";

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function nextAssetReference(prefix: string): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}${stamp}${rand}`;
}

export function buildOrgActiveFilter(
  organizationId: string,
  query: ListAssetsQuery,
  options: {
    searchFields: string[];
    supportsOwnerFilter?: boolean;
  }
): Record<string, unknown> {
  const filter: Record<string, unknown> = {
    organizationId,
    deletedAt: null,
  };

  if (query.businessUnitIds && query.businessUnitIds.length > 0) {
    filter.businessUnitId = { $in: query.businessUnitIds };
  }

  if (
    options.supportsOwnerFilter &&
    query.ownerIds &&
    query.ownerIds.length > 0
  ) {
    filter.ownerId = { $in: query.ownerIds };
  }

  if (query.categoryIds && query.categoryIds.length > 0) {
    filter.categoryId = { $in: query.categoryIds };
  }

  if (query.search && query.search.length > 0) {
    const regex = new RegExp(escapeRegex(query.search), "i");
    filter.$or = options.searchFields.map((field) => ({ [field]: regex }));
  }

  return filter;
}

export async function paginate<TDoc, TDomain>(
  model: Model<TDoc>,
  filter: Record<string, unknown>,
  query: ListAssetsQuery,
  toDomain: (doc: TDoc) => TDomain
): Promise<Paginated<TDomain>> {
  const skip = (query.page - 1) * query.pageSize;
  const [items, total] = await Promise.all([
    model
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.pageSize)
      .exec(),
    model.countDocuments(filter).exec(),
  ]);

  return {
    items: items.map(toDomain),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize) || 1),
  };
}
