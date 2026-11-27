import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveAliceDraft,
  discardAliceDraft,
  getJourney,
  listAliceDrafts,
  setJourneyStep,
} from "../api/alice";
import type { AliceDraftStatus } from "../types";
import { liveComplianceKeys } from "./use-live-compliance";

export const aliceKeys = {
  drafts: (status?: AliceDraftStatus) => [...liveComplianceKeys.all, "alice-drafts", status ?? "all"] as const,
  journey: () => [...liveComplianceKeys.all, "journey"] as const,
};

export function useAliceDraftsQuery(status?: AliceDraftStatus, enabled = true) {
  return useQuery({
    queryKey: aliceKeys.drafts(status),
    queryFn: () => listAliceDrafts(status),
    enabled,
  });
}

export function useApproveAliceDraftMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveAliceDraft(id),
    // Approval writes to another module (training, risks, incidents…).
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useDiscardAliceDraftMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => discardAliceDraft(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: liveComplianceKeys.all }),
  });
}

export function useJourneyQuery() {
  return useQuery({ queryKey: aliceKeys.journey(), queryFn: getJourney });
}

export function useSetJourneyStepMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { step: string; done: boolean }) => setJourneyStep(input.step, input.done),
    onSuccess: (data) => {
      queryClient.setQueryData(aliceKeys.journey(), data);
      void queryClient.invalidateQueries({ queryKey: liveComplianceKeys.all });
    },
  });
}
