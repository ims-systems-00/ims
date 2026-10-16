import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthClient } from "@/security";
import { setActiveOrganisationContext } from "@/shared/lib/active-organisation";
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
  const authClient = useAuthClient();
  return useMutation({
    mutationFn: (body: CreateOrganisationInput) => createOrganisation(body),
    onSuccess: async (result) => {
      // Prefer switchOrganisation so Auth0 mode only persists after token success
      // when an Auth0 Organization id is already linked.
      try {
        await authClient.switchOrganisation({
          organizationId: result.organisation.id,
          auth0OrganizationId: result.organisation.auth0OrganizationId,
        });
      } catch {
        // Unlinked Auth0 org: still bind IMS id for local x-org-id (stub / pre-link).
        setActiveOrganisationContext({
          organizationId: result.organisation.id,
          auth0OrganizationId: result.organisation.auth0OrganizationId,
        });
      }
      await queryClient.invalidateQueries({ queryKey: organisationKeys.all });
    },
  });
}
