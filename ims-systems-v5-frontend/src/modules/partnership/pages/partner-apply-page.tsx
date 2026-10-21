import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Handshake, Loader2 } from "lucide-react";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { notify } from "@/shared/lib/toast";
import {
  OnboardCard,
  OnboardCardHeader,
  OnboardHeader,
} from "@/modules/organisation/components/onboarding-ui";
import { useCurrentOrganisationQuery } from "@/modules/organisation/hooks/use-organisations";
import { useApplyPartnershipMutation } from "../hooks/use-partnerships";

/**
 * Partnership application (step 3 alternative path from flow selection).
 * Applications are auto-accepted; the partner code is emailed and shown
 * on the partner dashboard.
 */
export function PartnerApplyPage() {
  const navigate = useNavigate();
  const orgQuery = useCurrentOrganisationQuery();
  const org = orgQuery.data;
  const mutation = useApplyPartnershipMutation();

  const [serviceProvision, setServiceProvision] = useState("");
  const [customerReach, setCustomerReach] = useState(0);
  const [website, setWebsite] = useState("");
  const [standards, setStandards] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const alreadyPartner = Boolean(org?.isPartner);

  async function handleSubmit() {
    if (
      !serviceProvision.trim() ||
      !website.trim() ||
      !standards.trim() ||
      !description.trim()
    ) {
      setError("Please complete all fields before applying.");
      return;
    }
    setError(null);
    try {
      const partnership = await mutation.mutateAsync({
        serviceProvision: serviceProvision.trim(),
        customerReach,
        website: website.trim(),
        standards: standards.trim(),
        description: description.trim(),
      });
      notify.success(
        `Welcome to the partner programme — your code is ${partnership.id}`
      );
      navigate("/partner/dashboard");
    } catch (submitError) {
      notify.fromError(submitError, "Unable to submit partnership application");
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <OnboardHeader
        eyebrow="Partner programme"
        title="Become an iMS partner"
        description="Refer and support iMS customers. Tell us about your organisation — your partner code activates immediately."
      />

      <OnboardCard>
        <OnboardCardHeader
          icon={<Handshake className="size-4" />}
          title="Partnership application"
          description={
            org
              ? `Applying for ${org.name}`
              : "Your organisation"
          }
        />
        <div className="space-y-4 px-5 py-5 md:px-6">
          {alreadyPartner ? (
            <div className="space-y-4">
              <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">
                This organisation is already an iMS partner. Your referral
                code, signup link, and referred organisations are on the
                partner dashboard.
              </p>
              <Button asChild>
                <Link to="/partner/dashboard">Open partner dashboard</Link>
              </Button>
            </div>
          ) : (
            <>
              <FormField label="Area of expertise / service provision" htmlFor="partner-service-provision">
                <Textarea
                  id="partner-service-provision"
                  rows={3}
                  value={serviceProvision}
                  placeholder="e.g. ISO consultancy for care providers"
                  onChange={(event) => setServiceProvision(event.target.value)}
                />
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Customer reach" htmlFor="partner-customer-reach">
                  <Input
                    id="partner-customer-reach"
                    type="number"
                    min={0}
                    value={customerReach}
                    onChange={(event) =>
                      setCustomerReach(
                        Math.max(0, Number(event.target.value) || 0)
                      )
                    }
                  />
                </FormField>
                <FormField label="Website" htmlFor="partner-website">
                  <Input
                    id="partner-website"
                    value={website}
                    placeholder="https://example.com"
                    onChange={(event) => setWebsite(event.target.value)}
                  />
                </FormField>
              </div>
              <FormField label="Standards you work with" htmlFor="partner-standards">
                <Input
                  id="partner-standards"
                  value={standards}
                  placeholder="e.g. ISO 9001, ISO 27001, CQC"
                  onChange={(event) => setStandards(event.target.value)}
                />
              </FormField>
              <FormField label="About your organisation" htmlFor="partner-description">
                <Textarea
                  id="partner-description"
                  rows={4}
                  value={description}
                  placeholder="Tell us about your organisation and the customers you serve"
                  onChange={(event) => setDescription(event.target.value)}
                />
              </FormField>

              {error ? (
                <p className="text-[0.8125rem] text-destructive">{error}</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  type="button"
                  disabled={mutation.isPending || orgQuery.isPending}
                  onClick={() => void handleSubmit()}
                >
                  {mutation.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : null}
                  Apply
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link to="/onboard/flow-selection">Back</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </OnboardCard>
    </div>
  );
}
