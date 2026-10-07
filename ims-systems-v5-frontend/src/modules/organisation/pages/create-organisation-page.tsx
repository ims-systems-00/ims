import { useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";
import { PageHeader } from "@/shared/layout";
import { notify } from "@/shared/lib/toast";
import { CreateOrganisationWizard } from "../components/create-organisation-wizard";
import { useCreateOrganisationMutation } from "../hooks/use-organisations";
import type { CreateOrganisationInput } from "../types";

/**
 * Onboarding-style create organisation wizard.
 * Spec: docs/module-specifications/organisation.md § Create a new organisation
 * (logo upload, partner code, and go-live deferred).
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
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        title="Create organisation"
        description="Register a new tenant. You become Super Admin. Go-live, licences, and branding come later."
      />
      <section className="ims-panel overflow-hidden">
        <div className="ims-panel-header">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Building2 className="size-4 text-muted-foreground" aria-hidden />
            Organisation details
          </h2>
        </div>
        <div className="px-4 py-4">
          <CreateOrganisationWizard
            pending={mutation.isPending}
            onSubmit={handleSubmit}
          />
        </div>
      </section>
    </div>
  );
}
