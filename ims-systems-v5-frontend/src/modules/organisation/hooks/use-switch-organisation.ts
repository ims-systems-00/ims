import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthClient } from "@/security";
import { userKeys } from "@/modules/users/hooks/use-users";
import type { Organisation } from "../types";
import { organisationKeys } from "./use-organisations";

/**
 * Switch active organisation: Auth0 token first, then persist + invalidate caches.
 */
export function useSwitchOrganisationMutation() {
  const authClient = useAuthClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organisation: Organisation) => {
      await authClient.switchOrganisation({
        organizationId: organisation.id,
        auth0OrganizationId: organisation.auth0OrganizationId,
      });
      return organisation;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: organisationKeys.all });
      await queryClient.invalidateQueries({ queryKey: userKeys.all });
      await queryClient.invalidateQueries();
    },
  });
}
