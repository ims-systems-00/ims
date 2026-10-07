import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { setActiveOrganisationId } from "@/shared/lib/active-organisation";
import {
  createOrganisation,
  getCurrentOrganisation,
  listMyOrganisations,
} from "../api/organisations";
import type { CreateOrganisationInput } from "../types";

export const organisationKeys = {
  all: ["organisations"] as const,
  current: () => [...organisationKeys.all, "current"] as const,
  mine: () => [...organisationKeys.all, "mine"] as const,
};

export function useCurrentOrganisationQuery(enabled = true) {
  return useQuery({
    queryKey: organisationKeys.current(),
    queryFn: getCurrentOrganisation,
    enabled,
  });
}

export function useMyOrganisationsQuery(enabled = true) {
  return useQuery({
    queryKey: organisationKeys.mine(),
    queryFn: listMyOrganisations,
    enabled,
  });
}

export function useCreateOrganisationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateOrganisationInput) => createOrganisation(body),
    onSuccess: async (result) => {
      setActiveOrganisationId(result.organisation.id);
      await queryClient.invalidateQueries({ queryKey: organisationKeys.all });
    },
  });
}
