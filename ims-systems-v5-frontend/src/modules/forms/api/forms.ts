import { apiRequest } from "@/shared/lib/http";
import type {
  CreateFormElementInput,
  CreateFormInput,
  CreateSubmissionInput,
  Form,
  FormElement,
  FormSubmissionDetail,
  ListFormsParams,
  PaginatedForms,
  PaginatedSubmissions,
  UpdateFormElementInput,
  UpdateFormInput,
} from "../types";

function toQuery(params: ListFormsParams = {}): string {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.search) search.set("search", params.search);
  if (params.status) search.set("status", params.status);
  if (params.sort) search.set("sort", params.sort);
  if (params.sortDir) search.set("sortDir", params.sortDir);
  if (params.includeDeleted) search.set("includeDeleted", "true");
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function listForms(params?: ListFormsParams): Promise<PaginatedForms> {
  return apiRequest<PaginatedForms>(`/forms${toQuery(params)}`);
}

export function getForm(id: string): Promise<Form> {
  return apiRequest<Form>(`/forms/${id}`);
}

export function createForm(
  body: CreateFormInput
): Promise<{ form: Form; elements: FormElement[] }> {
  return apiRequest<{ form: Form; elements: FormElement[] }>("/forms", {
    method: "POST",
    body,
  });
}

export function updateForm(id: string, body: UpdateFormInput): Promise<Form> {
  return apiRequest<Form>(`/forms/${id}`, { method: "PUT", body });
}

export function softDeleteForm(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/forms/${id}/soft`, {
    method: "DELETE",
  });
}

export function hardDeleteForm(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/forms/${id}/hard`, {
    method: "DELETE",
  });
}

export function restoreForm(id: string): Promise<Form> {
  return apiRequest<Form>(`/forms/${id}/restore`, { method: "PUT" });
}

export function listFormElements(formId: string): Promise<FormElement[]> {
  return apiRequest<FormElement[]>(`/forms/${formId}/elements`);
}

export function createFormElement(
  formId: string,
  body: CreateFormElementInput
): Promise<FormElement> {
  return apiRequest<FormElement>(`/forms/${formId}/elements`, {
    method: "POST",
    body,
  });
}

export function updateFormElement(
  formId: string,
  id: string,
  body: UpdateFormElementInput
): Promise<FormElement> {
  return apiRequest<FormElement>(`/forms/${formId}/elements/${id}`, {
    method: "PUT",
    body,
  });
}

export function reorderFormElement(
  formId: string,
  id: string,
  afterElementId: string | null,
  parentElementId?: string | null
): Promise<FormElement> {
  return apiRequest<FormElement>(`/forms/${formId}/elements/${id}/order`, {
    method: "PUT",
    body: {
      afterElementId,
      ...(parentElementId !== undefined ? { parentElementId } : {}),
    },
  });
}

export function hardDeleteFormElement(
  formId: string,
  id: string
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    `/forms/${formId}/elements/${id}/hard`,
    { method: "DELETE" }
  );
}

export function listFormSubmissions(
  formId: string,
  params?: { page?: number; pageSize?: number; sortDir?: "asc" | "desc" }
): Promise<PaginatedSubmissions> {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.pageSize) search.set("pageSize", String(params.pageSize));
  if (params?.sortDir) search.set("sortDir", params.sortDir);
  const qs = search.toString();
  return apiRequest<PaginatedSubmissions>(
    `/forms/${formId}/submissions${qs ? `?${qs}` : ""}`
  );
}

export function getFormSubmission(
  formId: string,
  id: string
): Promise<FormSubmissionDetail> {
  return apiRequest<FormSubmissionDetail>(
    `/forms/${formId}/submissions/${id}`
  );
}

export function createFormSubmission(
  formId: string,
  body: CreateSubmissionInput
): Promise<FormSubmissionDetail> {
  return apiRequest<FormSubmissionDetail>(`/forms/${formId}/submissions`, {
    method: "POST",
    body,
  });
}

export function updateFormSubmission(
  formId: string,
  id: string,
  body: CreateSubmissionInput
): Promise<FormSubmissionDetail> {
  return apiRequest<FormSubmissionDetail>(
    `/forms/${formId}/submissions/${id}`,
    { method: "PUT", body }
  );
}

export function hardDeleteFormSubmission(
  formId: string,
  id: string
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    `/forms/${formId}/submissions/${id}/hard`,
    { method: "DELETE" }
  );
}
