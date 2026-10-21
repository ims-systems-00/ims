import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { organisationKeys } from "@/modules/organisation/hooks/use-organisations";
import {
  applyPartnership,
  getPartnershipByCode,
  getPartnershipDashboard,
  listMyPartnerships,
} from "../api/partnerships";
import type { ApplyPartnershipInput } from "../types";

export const partnershipKeys = {
  all: ["partnerships"] as const,
  mine: () => [...partnershipKeys.all, "mine"] as const,
  dashboard: () => [...partnershipKeys.all, "dashboard"] as const,
  byCode: (code: string) => [...partnershipKeys.all, "code", code] as const,
};

export function useApplyPartnershipMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ApplyPartnershipInput) => applyPartnership(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: partnershipKeys.all,
      });
      // isPartner changed on the organisation profile.
      await queryClient.invalidateQueries({ queryKey: organisationKeys.all });
    },
  });
}

export function useMyPartnershipsQuery(enabled = true) {
  return useQuery({
    queryKey: partnershipKeys.mine(),
    queryFn: listMyPartnerships,
    enabled,
  });
}

export function usePartnerDashboardQuery(enabled = true) {
  return useQuery({
    queryKey: partnershipKeys.dashboard(),
    queryFn: getPartnershipDashboard,
    enabled,
    retry: false,
  });
}

export function usePartnershipByCodeQuery(code: string | null) {
  return useQuery({
    queryKey: partnershipKeys.byCode(code ?? ""),
    queryFn: () => getPartnershipByCode(code as string),
    enabled: Boolean(code),
    retry: false,
  });
}
