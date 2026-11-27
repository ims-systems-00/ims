import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addCommonLegalDuties,
  addLegalEvidence,
  createLegalDuty,
  getLegalRegister,
  markLegalRegisterReviewed,
  removeLegalDuty,
  removeLegalEvidence,
  updateLegalRegisterSettings,
} from "../api/legal-register";
import type { CreateLegalDutyInput } from "../types";

export const legalRegisterKeys = { all: ["legal-register"] as const };

export function useLegalRegisterQuery() {
  return useQuery({ queryKey: legalRegisterKeys.all, queryFn: getLegalRegister });
}

/** Every change can move ISO 6.1.3 / 9.1.2 live health. */
function useInvalidate() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: legalRegisterKeys.all });
    await queryClient.invalidateQueries({ queryKey: ["live-compliance"] });
  };
}

export function useLegalRegisterMutations() {
  const invalidate = useInvalidate();
  return {
    createDuty: useMutation({
      mutationFn: (body: CreateLegalDutyInput) => createLegalDuty(body),
      onSuccess: invalidate,
    }),
    addCommon: useMutation({ mutationFn: addCommonLegalDuties, onSuccess: invalidate }),
    removeDuty: useMutation({ mutationFn: (id: string) => removeLegalDuty(id), onSuccess: invalidate }),
    addEvidence: useMutation({
      mutationFn: (input: { id: string; label: string; url?: string }) =>
        addLegalEvidence(input.id, { label: input.label, url: input.url }),
      onSuccess: invalidate,
    }),
    removeEvidence: useMutation({
      mutationFn: (input: { id: string; evidenceId: string }) =>
        removeLegalEvidence(input.id, input.evidenceId),
      onSuccess: invalidate,
    }),
    markReviewed: useMutation({ mutationFn: markLegalRegisterReviewed, onSuccess: invalidate }),
    updateSettings: useMutation({
      mutationFn: (months: number) => updateLegalRegisterSettings({ reviewIntervalMonths: months }),
      onSuccess: invalidate,
    }),
  };
}
