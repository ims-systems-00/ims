import type { FormResponse, SubmissionResponseInput } from "../types";
import {
  getFormResponseModel,
  type FormResponseDocument,
} from "./form-response.model";

function mapResponse(doc: FormResponseDocument): FormResponse {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    formId: doc.formId,
    formElementId: doc.formElementId,
    formSubmissionId: doc.formSubmissionId,
    responseValue: doc.responseValue ?? null,
    deletedAt: doc.deletedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type FormResponseRepository = ReturnType<
  typeof createFormResponseRepository
>;

export function createFormResponseRepository() {
  return {
    async createMany(
      organizationId: string,
      formId: string,
      formSubmissionId: string,
      responses: SubmissionResponseInput[]
    ): Promise<FormResponse[]> {
      if (responses.length === 0) return [];
      const Model = getFormResponseModel();
      const docs = await Model.insertMany(
        responses.map((row) => ({
          organizationId,
          formId,
          formSubmissionId,
          formElementId: row.formElementId,
          responseValue: row.responseValue ?? null,
          deletedAt: null,
        }))
      );
      return docs.map((doc) =>
        mapResponse(doc.toObject() as FormResponseDocument)
      );
    },

    async listBySubmission(
      organizationId: string,
      formSubmissionId: string
    ): Promise<FormResponse[]> {
      const Model = getFormResponseModel();
      const docs = await Model.find({
        organizationId,
        formSubmissionId,
        deletedAt: null,
      }).lean();
      return (docs as FormResponseDocument[]).map(mapResponse);
    },

    async replaceForSubmission(
      organizationId: string,
      formId: string,
      formSubmissionId: string,
      responses: SubmissionResponseInput[]
    ): Promise<FormResponse[]> {
      const Model = getFormResponseModel();
      await Model.deleteMany({ organizationId, formSubmissionId });
      return this.createMany(
        organizationId,
        formId,
        formSubmissionId,
        responses
      );
    },

    async hardDeleteBySubmission(
      organizationId: string,
      formSubmissionId: string
    ): Promise<number> {
      const Model = getFormResponseModel();
      const result = await Model.deleteMany({
        organizationId,
        formSubmissionId,
      });
      return result.deletedCount ?? 0;
    },

    async hardDeleteByForm(
      organizationId: string,
      formId: string
    ): Promise<number> {
      const Model = getFormResponseModel();
      const result = await Model.deleteMany({ organizationId, formId });
      return result.deletedCount ?? 0;
    },
  };
}
