import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createForm,
  createFormElement,
  createFormSubmission,
  getForm,
  getFormSubmission,
  hardDeleteForm,
  hardDeleteFormElement,
  hardDeleteFormSubmission,
  listFormElements,
  listFormSubmissions,
  listForms,
  reorderFormElement,
  restoreForm,
  softDeleteForm,
  updateForm,
  updateFormElement,
  updateFormSubmission,
} from "../api/forms";
import type {
  CreateFormElementInput,
  CreateFormInput,
  CreateSubmissionInput,
  ListFormsParams,
  UpdateFormElementInput,
  UpdateFormInput,
} from "../types";

export const formKeys = {
  all: ["forms"] as const,
  lists: () => [...formKeys.all, "list"] as const,
  list: (params: ListFormsParams) => [...formKeys.lists(), params] as const,
  details: () => [...formKeys.all, "detail"] as const,
  detail: (id: string) => [...formKeys.details(), id] as const,
  elements: (formId: string) =>
    [...formKeys.all, "elements", formId] as const,
  submissions: (formId: string) =>
    [...formKeys.all, "submissions", formId] as const,
  submission: (formId: string, id: string) =>
    [...formKeys.all, "submission", formId, id] as const,
};

export function useFormsQuery(params: ListFormsParams) {
  return useQuery({
    queryKey: formKeys.list(params),
    queryFn: () => listForms(params),
  });
}

export function useFormQuery(id: string | undefined) {
  return useQuery({
    queryKey: formKeys.detail(id ?? ""),
    queryFn: () => getForm(id!),
    enabled: Boolean(id),
  });
}

export function useFormElementsQuery(formId: string | undefined) {
  return useQuery({
    queryKey: formKeys.elements(formId ?? ""),
    queryFn: () => listFormElements(formId!),
    enabled: Boolean(formId),
  });
}

export function useFormSubmissionsQuery(
  formId: string | undefined,
  params?: { page?: number; pageSize?: number }
) {
  return useQuery({
    queryKey: [...formKeys.submissions(formId ?? ""), params],
    queryFn: () => listFormSubmissions(formId!, params),
    enabled: Boolean(formId),
  });
}

export function useFormSubmissionQuery(
  formId: string | undefined,
  id: string | undefined
) {
  return useQuery({
    queryKey: formKeys.submission(formId ?? "", id ?? ""),
    queryFn: () => getFormSubmission(formId!, id!),
    enabled: Boolean(formId && id),
  });
}

export function useCreateFormMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateFormInput) => createForm(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: formKeys.lists() });
    },
  });
}

export function useUpdateFormMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateFormInput) => updateForm(id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: formKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: formKeys.detail(id) });
    },
  });
}

export function useSoftDeleteFormMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => softDeleteForm(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: formKeys.lists() });
    },
  });
}

export function useHardDeleteFormMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => hardDeleteForm(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: formKeys.lists() });
    },
  });
}

export function useRestoreFormMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restoreForm(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: formKeys.lists() });
    },
  });
}

export function useCreateFormElementMutation(formId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateFormElementInput) =>
      createFormElement(formId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: formKeys.elements(formId),
      });
    },
  });
}

export function useUpdateFormElementMutation(formId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateFormElementInput;
    }) => updateFormElement(formId, id, body),
    onSuccess: (updated) => {
      queryClient.setQueryData(
        formKeys.elements(formId),
        (current: Awaited<ReturnType<typeof listFormElements>> | undefined) => {
          if (!current) return current;
          return current.map((row) => (row.id === updated.id ? updated : row));
        }
      );
    },
  });
}

export function useReorderFormElementMutation(formId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      afterElementId,
      parentElementId,
    }: {
      id: string;
      afterElementId: string | null;
      parentElementId?: string | null;
      /** When true, skip cache invalidation (batch callers invalidate once). */
      skipInvalidate?: boolean;
    }) =>
      reorderFormElement(formId, id, afterElementId, parentElementId),
    onSuccess: async (_data, variables) => {
      if (variables.skipInvalidate) return;
      await queryClient.invalidateQueries({
        queryKey: formKeys.elements(formId),
      });
    },
  });
}

export function useHardDeleteFormElementMutation(formId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => hardDeleteFormElement(formId, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: formKeys.elements(formId),
      });
    },
  });
}

export function useCreateFormSubmissionMutation(formId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSubmissionInput) =>
      createFormSubmission(formId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: formKeys.submissions(formId),
      });
      await queryClient.invalidateQueries({ queryKey: formKeys.detail(formId) });
    },
  });
}

export function useUpdateFormSubmissionMutation(formId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: CreateSubmissionInput;
    }) => updateFormSubmission(formId, id, body),
    onSuccess: async (_data, vars) => {
      await queryClient.invalidateQueries({
        queryKey: formKeys.submissions(formId),
      });
      await queryClient.invalidateQueries({
        queryKey: formKeys.submission(formId, vars.id),
      });
    },
  });
}

export function useHardDeleteFormSubmissionMutation(formId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => hardDeleteFormSubmission(formId, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: formKeys.submissions(formId),
      });
    },
  });
}
