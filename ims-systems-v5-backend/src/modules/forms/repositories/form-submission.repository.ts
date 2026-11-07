import type {
  CreateFormSubmissionInput,
  FormSubmission,
  ListSubmissionsQuery,
  PaginatedSubmissions,
  UpdateFormSubmissionInput,
} from "../types";
import {
  getFormSubmissionModel,
  type FormSubmissionDocument,
} from "./form-submission.model";

function mapSubmission(doc: FormSubmissionDocument): FormSubmission {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    formId: doc.formId,
    submittedBy: doc.submittedBy,
    collectionName: doc.collectionName ?? null,
    collectionDocument: doc.collectionDocument ?? null,
    deletedAt: doc.deletedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type FormSubmissionRepository = ReturnType<
  typeof createFormSubmissionRepository
>;

export function createFormSubmissionRepository() {
  return {
    async create(
      organizationId: string,
      formId: string,
      submittedBy: string,
      input: CreateFormSubmissionInput
    ): Promise<FormSubmission> {
      const Model = getFormSubmissionModel();
      const doc = await Model.create({
        organizationId,
        formId,
        submittedBy,
        collectionName: input.collectionName ?? null,
        collectionDocument: input.collectionDocument ?? null,
        deletedAt: null,
      });
      return mapSubmission(doc.toObject() as FormSubmissionDocument);
    },

    async findById(
      organizationId: string,
      formId: string,
      id: string
    ): Promise<FormSubmission | null> {
      const Model = getFormSubmissionModel();
      const doc = await Model.findOne({
        _id: id,
        organizationId,
        formId,
        deletedAt: null,
      }).lean();
      return doc ? mapSubmission(doc as FormSubmissionDocument) : null;
    },

    async list(
      organizationId: string,
      formId: string,
      query: ListSubmissionsQuery
    ): Promise<PaginatedSubmissions> {
      const Model = getFormSubmissionModel();
      const filter = { organizationId, formId, deletedAt: null };
      const sortDir = query.sortDir === "asc" ? 1 : -1;
      const skip = (query.page - 1) * query.pageSize;
      const [items, total] = await Promise.all([
        Model.find(filter)
          .sort({ createdAt: sortDir })
          .skip(skip)
          .limit(query.pageSize)
          .lean(),
        Model.countDocuments(filter),
      ]);
      return {
        items: (items as FormSubmissionDocument[]).map(mapSubmission),
        total,
        page: query.page,
        pageSize: query.pageSize,
      };
    },

    async update(
      organizationId: string,
      formId: string,
      id: string,
      input: UpdateFormSubmissionInput
    ): Promise<FormSubmission | null> {
      const Model = getFormSubmissionModel();
      const $set: Record<string, unknown> = {};
      if (input.collectionName !== undefined) {
        $set.collectionName = input.collectionName;
      }
      if (input.collectionDocument !== undefined) {
        $set.collectionDocument = input.collectionDocument;
      }
      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId, formId, deletedAt: null },
        { $set },
        { new: true }
      ).lean();
      return doc ? mapSubmission(doc as FormSubmissionDocument) : null;
    },

    async hardDelete(
      organizationId: string,
      formId: string,
      id: string
    ): Promise<boolean> {
      const Model = getFormSubmissionModel();
      const result = await Model.deleteOne({
        _id: id,
        organizationId,
        formId,
      });
      return result.deletedCount > 0;
    },

    async hardDeleteByForm(
      organizationId: string,
      formId: string
    ): Promise<number> {
      const Model = getFormSubmissionModel();
      const result = await Model.deleteMany({ organizationId, formId });
      return result.deletedCount ?? 0;
    },
  };
}
