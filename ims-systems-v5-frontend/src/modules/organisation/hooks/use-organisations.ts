import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthClient } from "@/security";
import { setActiveOrganisationContext } from "@/shared/lib/active-organisation";
import {
  createBillingPortalSession,
  createCardPaymentSession,
  createOrganisation,
  getCurrentOrganisation,
  goLiveOrganisation,
  listLicenceRequests,
  listMyOrganisations,
  requestOrganisationLicence,
  updateDocumentReviewReminders,
  updateIncidentResolutionTargets,
  updateOrganisationLogo,
} from "../api/organisations";
import type {
  CreateOrganisationInput,
  DocumentReviewReminderOffset,
  GoLiveOrganisationInput,
  IncidentResolutionTargets,
  Organisation,
  RequestOrganisationLicenceInput,
} from "../types";
import { useFileViewUrlQuery } from "@/modules/files/hooks/use-files";

export const organisationKeys = {
  all: ["organisations"] as const,
  current: () => [...organisationKeys.all, "current"] as const,
  mine: () => [...organisationKeys.all, "mine"] as const,
  licenceRequests: () => [...organisationKeys.all, "licence-requests"] as const,
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

export function useGoLiveOrganisationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      organizationId: string;
      body: GoLiveOrganisationInput;
    }) => goLiveOrganisation(input.organizationId, input.body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: organisationKeys.all });
    },
    onError: async () => {
      // Go Live commits isCustomer before Stripe Checkout; refresh so a
      // failed Checkout shows the (resumable) already-live state.
      await queryClient.invalidateQueries({ queryKey: organisationKeys.all });
    },
  });
}

export function useRequestOrganisationLicenceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RequestOrganisationLicenceInput) =>
      requestOrganisationLicence(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: organisationKeys.all });
    },
  });
}

export function useLicenceRequestsQuery(enabled = true) {
  return useQuery({
    queryKey: organisationKeys.licenceRequests(),
    queryFn: () => listLicenceRequests(1, 10),
    enabled,
  });
}

export function useCardPaymentSessionMutation() {
  return useMutation({
    mutationFn: (organizationId: string) =>
      createCardPaymentSession(organizationId),
  });
}

export function useBillingPortalSessionMutation() {
  return useMutation({
    mutationFn: (organizationId: string) =>
      createBillingPortalSession(organizationId),
  });
}

/**
 * Display URL for an organisation logo: a fresh File Handler view URL
 * when bucket/key are known, otherwise the stored `logoSrc`.
 */
export function useOrganisationLogoUrl(
  organisation:
    | Pick<Organisation, "logoSrc" | "logoStorage">
    | null
    | undefined
): string | null {
  const storage = organisation?.logoStorage ?? null;
  const view = useFileViewUrlQuery(
    storage
      ? {
          Bucket: storage.bucket,
          Key: storage.key,
          key: storage.key,
          Name: storage.fileName ?? "logo",
        }
      : null,
    Boolean(storage)
  );
  if (view.data?.url) return view.data.url;
  return organisation?.logoSrc ?? null;
}

export function useUpdateOrganisationLogoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof updateOrganisationLogo>[0]) =>
      updateOrganisationLogo(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: organisationKeys.all });
    },
  });
}

export function useUpdateIncidentResolutionTargetsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targets: IncidentResolutionTargets) =>
      updateIncidentResolutionTargets(targets),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: organisationKeys.all });
    },
  });
}

export function useUpdateDocumentReviewRemindersMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (offsets: DocumentReviewReminderOffset[]) =>
      updateDocumentReviewReminders(offsets),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: organisationKeys.all });
    },
  });
}
