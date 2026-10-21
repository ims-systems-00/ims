import { useNavigate } from "react-router-dom";
import { Building2, ShieldCheck } from "lucide-react";
import { notify } from "@/shared/lib/toast";
import { CreateOrganisationWizard } from "../components/create-organisation-wizard";
import {
  OnboardCard,
  OnboardCardHeader,
  OnboardHeader,
} from "../components/onboarding-ui";
import { useCreateOrganisationMutation } from "../hooks/use-organisations";
import type { CreateOrganisationInput } from "../types";

/**
 * Step 1 — create the organisation. You become its Super Admin;
 * activation happens at Go Live (step 3).
 */
export function CreateOrganisationPage() {
  const navigate = useNavigate();
  const mutation = useCreateOrganisationMutation();

  async function handleSubmit(values: CreateOrganisationInput) {
    try {
      const result = await mutation.mutateAsync(values);
      notify.success(`${result.organisation.name} created`);
      navigate("/onboard/flow-selection", { replace: true });
    } catch (error) {
      notify.fromError(error, "Unable to create organisation");
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <OnboardHeader
        eyebrow="Step 1 of 3"
        title="Create your organisation"
        description="Tell us about your company. You'll be its Super Admin — activation and licensing come at Go Live."
      />

      <OnboardCard>
        <OnboardCardHeader
          icon={<Building2 className="size-4" aria-hidden />}
          title="Organisation details"
          description="Registered company information for your workspace"
        />
        <div className="px-5 py-5 md:px-6">
          <CreateOrganisationWizard
            pending={mutation.isPending}
            onSubmit={handleSubmit}
          />
        </div>
      </OnboardCard>

      <p className="flex items-center justify-center gap-1.5 text-center text-[0.75rem] text-muted-foreground">
        <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
        Your workspace stays locked until Go Live is complete.
      </p>
    </div>
  );
}
