/**
 * IMS Forms application service.
 */

import type { Authorizer, SecurityIdentity } from "../../../security";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import {
  createUserRepository,
  type UserIdentitySummary,
  type UserRepository,
} from "../../users";
import type { FormElementRepository } from "../repositories/form-element.repository";
import type { FormRepository } from "../repositories/form.repository";
import type { FormResponseRepository } from "../repositories/form-response.repository";
import type { FormSubmissionRepository } from "../repositories/form-submission.repository";
import {
  FORMS_RESOURCE,
  type CreateFormElementInput,
  type CreateFormInput,
  type CreateFormSubmissionInput,
  type Form,
  type FormElement,
  type FormSubmission,
  type FormSubmissionDetail,
  type FormSubmissionSubmitter,
  type ListFormsQuery,
  type ListSubmissionsQuery,
  type PaginatedForms,
  type PaginatedSubmissions,
  type ReorderFormElementInput,
  type UpdateFormElementInput,
  type UpdateFormInput,
  type UpdateFormSubmissionInput,
} from "../types";

function requireOrgIdentity(identity: SecurityIdentity | null | undefined): {
  identity: SecurityIdentity;
  organizationId: string;
} {
  if (!identity?.subjectId) {
    throw new UnauthorizedError();
  }
  if (!identity.organizationId) {
    throw new ForbiddenError("Organisation context is required");
  }
  return { identity, organizationId: identity.organizationId };
}

export type FormServiceDeps = {
  forms: FormRepository;
  elements: FormElementRepository;
  submissions: FormSubmissionRepository;
  responses: FormResponseRepository;
  authorizer: Authorizer;
  users?: UserRepository;
};

export type FormService = ReturnType<typeof createFormService>;

function toSubmitter(
  summary: UserIdentitySummary | undefined,
  fallbackId: string
): FormSubmissionSubmitter {
  if (!summary) {
    return { id: fallbackId, name: "Unknown user", email: "" };
  }
  return {
    id: summary.id,
    name: summary.name || summary.email || "Unknown user",
    email: summary.email,
  };
}

export function createFormService(deps: FormServiceDeps) {
  const {
    forms,
    elements,
    submissions,
    responses,
    authorizer,
    users = createUserRepository(),
  } = deps;

  async function attachSubmitters<T extends FormSubmission>(
    rows: T[]
  ): Promise<Array<T & { submittedByUser: FormSubmissionSubmitter }>> {
    const ids = rows.map((row) => row.submittedBy);
    const summaries = await users.findIdentitySummariesByIds(ids);
    const byId = new Map(summaries.map((row) => [row.id, row]));
    return rows.map((row) => ({
      ...row,
      submittedByUser: toSubmitter(byId.get(row.submittedBy), row.submittedBy),
    }));
  }

  async function assertAllowed(
    identity: SecurityIdentity,
    action: string,
    resourceId?: string
  ): Promise<void> {
    const allowed = await authorizer.allow({
      identity,
      action,
      resourceType: FORMS_RESOURCE,
      resourceId,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError(
        "User does not have permission to access forms"
      );
    }
  }


  async function requireForm(
    organizationId: string,
    id: string,
    options?: { includeDeleted?: boolean }
  ): Promise<Form> {
    const form = await forms.findById(organizationId, id, options);
    if (!form) {
      throw new NotFoundError("Form not found");
    }
    return form;
  }

  return {
    async list(
      identity: SecurityIdentity | null | undefined,
      query: ListFormsQuery
    ): Promise<PaginatedForms> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read");
      return forms.list(actor.organizationId, query);
    },

    async getById(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<Form> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read", id);
      return requireForm(actor.organizationId, id);
    },

    async create(
      identity: SecurityIdentity | null | undefined,
      input: CreateFormInput
    ): Promise<{ form: Form; elements: FormElement[] }> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create");
      if (!input.title?.trim()) {
        throw new ValidationAppError("Title is required");
      }
      const form = await forms.create(
        actor.organizationId,
        actor.identity.subjectId,
        input
      );
      let createdElements: FormElement[] = [];
      if (input.elements && input.elements.length > 0) {
        createdElements = await elements.createManySequential(
          actor.organizationId,
          form.id,
          input.elements
        );
      }
      return { form, elements: createdElements };
    },

    async update(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateFormInput
    ): Promise<Form> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "update", id);
      await requireForm(actor.organizationId, id);
      const updated = await forms.update(actor.organizationId, id, input);
      if (!updated) throw new NotFoundError("Form not found");
      return updated;
    },

    async softDelete(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<void> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", id);
      await requireForm(actor.organizationId, id);
      const ok = await forms.softDelete(actor.organizationId, id);
      if (!ok) throw new NotFoundError("Form not found");
    },

    async restore(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<Form> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "update", id);
      const restored = await forms.restore(actor.organizationId, id);
      if (!restored) throw new NotFoundError("Form not found");
      return restored;
    },

    async hardDelete(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<void> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", id);
      await requireForm(actor.organizationId, id, { includeDeleted: true });
      await responses.hardDeleteByForm(actor.organizationId, id);
      await submissions.hardDeleteByForm(actor.organizationId, id);
      await elements.hardDeleteByForm(actor.organizationId, id);
      const ok = await forms.hardDelete(actor.organizationId, id);
      if (!ok) throw new NotFoundError("Form not found");
    },

    async listElements(
      identity: SecurityIdentity | null | undefined,
      formId: string
    ): Promise<FormElement[]> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read", formId);
      await requireForm(actor.organizationId, formId);
      return elements.listOrdered(actor.organizationId, formId);
    },

    async getElement(
      identity: SecurityIdentity | null | undefined,
      formId: string,
      id: string
    ): Promise<FormElement> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read", formId);
      await requireForm(actor.organizationId, formId);
      const el = await elements.findById(actor.organizationId, formId, id);
      if (!el) throw new NotFoundError("Form element not found");
      return el;
    },

    async createElement(
      identity: SecurityIdentity | null | undefined,
      formId: string,
      input: CreateFormElementInput
    ): Promise<FormElement> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "update", formId);
      await requireForm(actor.organizationId, formId);
      try {
        return await elements.create(actor.organizationId, formId, input);
      } catch (error) {
        throw new ValidationAppError(
          error instanceof Error ? error.message : "Failed to create element"
        );
      }
    },

    async updateElement(
      identity: SecurityIdentity | null | undefined,
      formId: string,
      id: string,
      input: UpdateFormElementInput
    ): Promise<FormElement> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "update", formId);
      await requireForm(actor.organizationId, formId);
      const updated = await elements.update(
        actor.organizationId,
        formId,
        id,
        input
      );
      if (!updated) throw new NotFoundError("Form element not found");
      return updated;
    },

    async reorderElement(
      identity: SecurityIdentity | null | undefined,
      formId: string,
      id: string,
      input: ReorderFormElementInput
    ): Promise<FormElement> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "update", formId);
      await requireForm(actor.organizationId, formId);
      try {
        const updated = await elements.reorder(
          actor.organizationId,
          formId,
          id,
          input.afterElementId
        );
        if (!updated) throw new NotFoundError("Form element not found");
        return updated;
      } catch (error) {
        if (error instanceof NotFoundError) throw error;
        throw new ValidationAppError(
          error instanceof Error ? error.message : "Failed to reorder element"
        );
      }
    },

    async hardDeleteElement(
      identity: SecurityIdentity | null | undefined,
      formId: string,
      id: string
    ): Promise<void> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "update", formId);
      await requireForm(actor.organizationId, formId);
      const ok = await elements.hardDelete(actor.organizationId, formId, id);
      if (!ok) throw new NotFoundError("Form element not found");
    },

    async listSubmissions(
      identity: SecurityIdentity | null | undefined,
      formId: string,
      query: ListSubmissionsQuery
    ): Promise<PaginatedSubmissions> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read", formId);
      await requireForm(actor.organizationId, formId);
      const page = await submissions.list(actor.organizationId, formId, query);
      const items = await attachSubmitters(page.items);
      return { ...page, items };
    },

    async getSubmission(
      identity: SecurityIdentity | null | undefined,
      formId: string,
      id: string
    ): Promise<FormSubmissionDetail> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read", formId);
      await requireForm(actor.organizationId, formId);
      const submission = await submissions.findById(
        actor.organizationId,
        formId,
        id
      );
      if (!submission) throw new NotFoundError("Submission not found");
      const [responseRows, orderedElements, enrichedRows] = await Promise.all([
        responses.listBySubmission(actor.organizationId, id),
        elements.listOrdered(actor.organizationId, formId),
        attachSubmitters([submission]),
      ]);
      const enriched = enrichedRows[0] ?? {
        ...submission,
        submittedByUser: toSubmitter(undefined, submission.submittedBy),
      };
      const elementById = new Map(orderedElements.map((el) => [el.id, el]));
      return {
        ...enriched,
        responses: responseRows.map((row) => {
          const el = elementById.get(row.formElementId);
          return {
            ...row,
            element: el
              ? { id: el.id, type: el.type, attributes: el.attributes }
              : null,
          };
        }),
      };
    },

    async createSubmission(
      identity: SecurityIdentity | null | undefined,
      formId: string,
      input: CreateFormSubmissionInput
    ): Promise<FormSubmissionDetail> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", formId);
      await requireForm(actor.organizationId, formId);
      const ordered = await elements.listOrdered(actor.organizationId, formId);
      const validIds = new Set(ordered.map((el) => el.id));
      for (const row of input.responses) {
        if (!validIds.has(row.formElementId)) {
          throw new ValidationAppError(
            `Unknown form element: ${row.formElementId}`
          );
        }
      }
      const submission = await submissions.create(
        actor.organizationId,
        formId,
        actor.identity.subjectId,
        input
      );
      const responseRows = await responses.createMany(
        actor.organizationId,
        formId,
        submission.id,
        input.responses
      );
      await forms.incrementSubmissionCount(actor.organizationId, formId);
      const elementById = new Map(ordered.map((el) => [el.id, el]));
      const enrichedRows = await attachSubmitters([submission]);
      const enriched = enrichedRows[0] ?? {
        ...submission,
        submittedByUser: toSubmitter(undefined, submission.submittedBy),
      };
      return {
        ...enriched,
        responses: responseRows.map((row) => {
          const el = elementById.get(row.formElementId);
          return {
            ...row,
            element: el
              ? { id: el.id, type: el.type, attributes: el.attributes }
              : null,
          };
        }),
      };
    },

    async updateSubmission(
      identity: SecurityIdentity | null | undefined,
      formId: string,
      id: string,
      input: UpdateFormSubmissionInput
    ): Promise<FormSubmissionDetail> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "update", formId);
      await requireForm(actor.organizationId, formId);
      const existing = await submissions.findById(
        actor.organizationId,
        formId,
        id
      );
      if (!existing) throw new NotFoundError("Submission not found");
      await submissions.update(actor.organizationId, formId, id, input);
      if (input.responses) {
        const ordered = await elements.listOrdered(
          actor.organizationId,
          formId
        );
        const validIds = new Set(ordered.map((el) => el.id));
        for (const row of input.responses) {
          if (!validIds.has(row.formElementId)) {
            throw new ValidationAppError(
              `Unknown form element: ${row.formElementId}`
            );
          }
        }
        await responses.replaceForSubmission(
          actor.organizationId,
          formId,
          id,
          input.responses
        );
      }
      return this.getSubmission(identity, formId, id);
    },

    async hardDeleteSubmission(
      identity: SecurityIdentity | null | undefined,
      formId: string,
      id: string
    ): Promise<void> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", formId);
      await requireForm(actor.organizationId, formId);
      const existing = await submissions.findById(
        actor.organizationId,
        formId,
        id
      );
      if (!existing) throw new NotFoundError("Submission not found");
      await responses.hardDeleteBySubmission(actor.organizationId, id);
      await submissions.hardDelete(actor.organizationId, formId, id);
    },
  };
}
