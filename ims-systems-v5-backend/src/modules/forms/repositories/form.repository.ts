import type {
  CreateFormInput,
  Form,
  FormTheme,
  ListFormsQuery,
  PaginatedForms,
  UpdateFormInput,
} from "../types";
import { getFormModel, type FormDocument } from "./form.model";

const DEFAULT_THEME: FormTheme = {
  foregroundColor: "#111827",
  backgroundColor: "#F9FAFB",
  accentColor: "#0F766E",
  logo: null,
  coverImage: null,
  logoVertical: "top",
  logoHorizontal: "left",
};

function normalizeLogoVertical(
  value: FormTheme["logoVertical"] | undefined
): FormTheme["logoVertical"] {
  return value === "bottom" ? "bottom" : "top";
}

function normalizeLogoHorizontal(
  value: FormTheme["logoHorizontal"] | undefined
): FormTheme["logoHorizontal"] {
  if (value === "center" || value === "right") return value;
  return "left";
}

function mapThemeImage(
  value: FormTheme["logo"] | undefined
): FormTheme["logo"] {
  if (!value || typeof value !== "object") return null;
  const src = typeof value.src === "string" ? value.src.trim() : "";
  if (!src) return null;
  const storage = value.storage;
  return {
    src,
    storage:
      storage && storage.bucket && storage.key
        ? {
            bucket: storage.bucket,
            key: storage.key,
            fileName: storage.fileName,
          }
        : null,
  };
}

function mapForm(doc: FormDocument): Form {
  const theme = (doc.theme ?? {}) as Partial<FormTheme>;
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    title: doc.title,
    description: doc.description ?? null,
    status: doc.status as Form["status"],
    theme: {
      foregroundColor: theme.foregroundColor ?? DEFAULT_THEME.foregroundColor,
      backgroundColor: theme.backgroundColor ?? DEFAULT_THEME.backgroundColor,
      accentColor: theme.accentColor ?? DEFAULT_THEME.accentColor,
      logo: mapThemeImage(theme.logo),
      coverImage: mapThemeImage(theme.coverImage),
      logoVertical: normalizeLogoVertical(theme.logoVertical),
      logoHorizontal: normalizeLogoHorizontal(theme.logoHorizontal),
    },
    usagesType: doc.usagesType ?? null,
    availableForStandards: [...(doc.availableForStandards ?? [])],
    createdBy: doc.createdBy,
    submissionCount: doc.submissionCount ?? 0,
    collaboration: [...(doc.collaboration ?? [])],
    deletedAt: doc.deletedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type FormRepository = ReturnType<typeof createFormRepository>;

export function createFormRepository() {
  return {
    async create(
      organizationId: string,
      createdBy: string,
      input: CreateFormInput
    ): Promise<Form> {
      const Model = getFormModel();
      const doc = await Model.create({
        organizationId,
        createdBy,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        status: input.status ?? "draft",
        theme: {
          foregroundColor:
            input.theme?.foregroundColor ?? DEFAULT_THEME.foregroundColor,
          backgroundColor:
            input.theme?.backgroundColor ?? DEFAULT_THEME.backgroundColor,
          accentColor: input.theme?.accentColor ?? DEFAULT_THEME.accentColor,
          logo: input.theme?.logo ?? null,
          coverImage: input.theme?.coverImage ?? null,
          logoVertical: normalizeLogoVertical(input.theme?.logoVertical),
          logoHorizontal: normalizeLogoHorizontal(input.theme?.logoHorizontal),
        },
        usagesType: input.usagesType ?? null,
        availableForStandards: input.availableForStandards ?? [],
        collaboration: input.collaboration ?? [],
        submissionCount: 0,
        deletedAt: null,
      });
      return mapForm(doc.toObject() as FormDocument);
    },

    async findById(
      organizationId: string,
      id: string,
      options?: { includeDeleted?: boolean }
    ): Promise<Form | null> {
      const Model = getFormModel();
      const filter: Record<string, unknown> = { _id: id, organizationId };
      if (!options?.includeDeleted) filter.deletedAt = null;
      const doc = await Model.findOne(filter).lean();
      return doc ? mapForm(doc as FormDocument) : null;
    },

    async list(
      organizationId: string,
      query: ListFormsQuery
    ): Promise<PaginatedForms> {
      const Model = getFormModel();
      const filter: Record<string, unknown> = { organizationId };
      if (!query.includeDeleted) filter.deletedAt = null;
      else filter.deletedAt = { $ne: null };
      if (query.status) filter.status = query.status;
      if (query.search?.trim()) {
        filter.title = { $regex: query.search.trim(), $options: "i" };
      }
      const sortDir = query.sortDir === "asc" ? 1 : -1;
      const sort: Record<string, 1 | -1> = { [query.sort]: sortDir };
      const skip = (query.page - 1) * query.pageSize;
      const [items, total] = await Promise.all([
        Model.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(query.pageSize)
          .lean(),
        Model.countDocuments(filter),
      ]);
      return {
        items: (items as FormDocument[]).map(mapForm),
        total,
        page: query.page,
        pageSize: query.pageSize,
      };
    },

    async update(
      organizationId: string,
      id: string,
      input: UpdateFormInput
    ): Promise<Form | null> {
      const Model = getFormModel();
      const $set: Record<string, unknown> = {};
      if (input.title !== undefined) $set.title = input.title.trim();
      if (input.description !== undefined) {
        $set.description = input.description?.trim() || null;
      }
      if (input.status !== undefined) $set.status = input.status;
      if (input.usagesType !== undefined) $set.usagesType = input.usagesType;
      if (input.availableForStandards !== undefined) {
        $set.availableForStandards = input.availableForStandards;
      }
      if (input.collaboration !== undefined) {
        $set.collaboration = input.collaboration;
      }
      if (input.theme) {
        if (input.theme.foregroundColor !== undefined) {
          $set["theme.foregroundColor"] = input.theme.foregroundColor;
        }
        if (input.theme.backgroundColor !== undefined) {
          $set["theme.backgroundColor"] = input.theme.backgroundColor;
        }
        if (input.theme.accentColor !== undefined) {
          $set["theme.accentColor"] = input.theme.accentColor;
        }
        if (input.theme.logo !== undefined) {
          $set["theme.logo"] = input.theme.logo;
        }
        if (input.theme.coverImage !== undefined) {
          $set["theme.coverImage"] = input.theme.coverImage;
        }
        if (input.theme.logoVertical !== undefined) {
          $set["theme.logoVertical"] = normalizeLogoVertical(
            input.theme.logoVertical
          );
        }
        if (input.theme.logoHorizontal !== undefined) {
          $set["theme.logoHorizontal"] = normalizeLogoHorizontal(
            input.theme.logoHorizontal
          );
        }
      }
      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId, deletedAt: null },
        { $set },
        { new: true }
      ).lean();
      return doc ? mapForm(doc as FormDocument) : null;
    },

    async softDelete(organizationId: string, id: string): Promise<boolean> {
      const Model = getFormModel();
      const result = await Model.updateOne(
        { _id: id, organizationId, deletedAt: null },
        { $set: { deletedAt: new Date() } }
      );
      return result.modifiedCount > 0;
    },

    async restore(organizationId: string, id: string): Promise<Form | null> {
      const Model = getFormModel();
      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId, deletedAt: { $ne: null } },
        { $set: { deletedAt: null } },
        { new: true }
      ).lean();
      return doc ? mapForm(doc as FormDocument) : null;
    },

    async hardDelete(organizationId: string, id: string): Promise<boolean> {
      const Model = getFormModel();
      const result = await Model.deleteOne({ _id: id, organizationId });
      return result.deletedCount > 0;
    },

    async incrementSubmissionCount(
      organizationId: string,
      id: string
    ): Promise<void> {
      const Model = getFormModel();
      await Model.updateOne(
        { _id: id, organizationId, deletedAt: null },
        { $inc: { submissionCount: 1 } }
      );
    },
  };
}
