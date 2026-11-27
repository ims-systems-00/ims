import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { complianceKeys } from "@/modules/compliance/hooks/use-compliance";
import {
  getActionCentre,
  getLiveHealth,
  getModuleHealth,
  listAdvice,
  listLiveActivity,
  runAdviceAction,
  snoozeAdvice,
} from "../api/live-compliance";
import { isLiveStreamConnected } from "../lib/live-stream";
import type { LiveModule, LiveStandard } from "../types";

/** Poll every minute without the live stream; every 5 minutes with it. */
export const LIVE_REFETCH_MS = 60_000;
export const LIVE_STREAM_FALLBACK_MS = 5 * 60_000;

/** Refetch interval: a slow safety net while the stream pushes updates. */
function liveRefetchInterval(): number {
  return isLiveStreamConnected() ? LIVE_STREAM_FALLBACK_MS : LIVE_REFETCH_MS;
}

export const liveComplianceKeys = {
  all: ["live-compliance"] as const,
  health: (standard?: LiveStandard) =>
    [...liveComplianceKeys.all, "health", standard ?? "all"] as const,
  module: (module: LiveModule) => [...liveComplianceKeys.all, "module", module] as const,
  advice: (module: LiveModule | undefined, limit: number) =>
    [...liveComplianceKeys.all, "advice", module ?? "all", limit] as const,
  activity: (limit: number) => [...liveComplianceKeys.all, "activity", limit] as const,
  actionCentre: (scope: "mine" | "all") =>
    [...liveComplianceKeys.all, "action-centre", scope] as const,
};

/** Everything the signed-in user should act on, grouped by urgency. */
export function useActionCentreQuery(scope: "mine" | "all" = "mine", enabled = true) {
  return useQuery({
    queryKey: liveComplianceKeys.actionCentre(scope),
    queryFn: () => getActionCentre(scope),
    enabled,
    refetchInterval: liveRefetchInterval,
  });
}

export function useLiveHealthQuery(standard?: LiveStandard, enabled = true) {
  return useQuery({
    queryKey: liveComplianceKeys.health(standard),
    queryFn: () => getLiveHealth(standard),
    enabled,
    refetchInterval: liveRefetchInterval,
  });
}

export function useModuleHealthQuery(module: LiveModule, enabled = true) {
  return useQuery({
    queryKey: liveComplianceKeys.module(module),
    queryFn: () => getModuleHealth(module),
    enabled,
    refetchInterval: liveRefetchInterval,
  });
}

export function useAdviceQuery(module?: LiveModule, limit = 3, enabled = true) {
  return useQuery({
    queryKey: liveComplianceKeys.advice(module, limit),
    queryFn: () => listAdvice({ module, limit }),
    enabled,
    refetchInterval: liveRefetchInterval,
  });
}

export function useLiveActivityQuery(limit = 6) {
  return useQuery({
    queryKey: liveComplianceKeys.activity(limit),
    queryFn: () => listLiveActivity(limit),
    refetchInterval: liveRefetchInterval,
  });
}

async function invalidateLive(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: liveComplianceKeys.all }),
    // Clause health is also shown on the toolkit pages.
    queryClient.invalidateQueries({ queryKey: complianceKeys.all }),
  ]);
}

export function useSnoozeAdviceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; days?: number }) => snoozeAdvice(input.id, input.days),
    onSuccess: () => invalidateLive(queryClient),
  });
}

export function useRunAdviceActionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => runAdviceAction(id),
    onSuccess: () => invalidateLive(queryClient),
  });
}
