import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Check } from "lucide-react";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";
import { usePartnershipByCodeQuery } from "@/modules/partnership/hooks/use-partnerships";
import {
  createOrganisationAddressSchema,
  createOrganisationBasicSchema,
} from "../schemas";
import { DEFAULT_COUNTRY, ORGANISATION_INDUSTRIES } from "../lib/industries";
import type { CreateOrganisationInput } from "../types";

type FieldErrors = Record<string, string>;

type StepId = "basic" | "address" | "confirm";

const STEPS: Array<{ id: StepId; label: string }> = [
  { id: "basic", label: "Organisation" },
  { id: "address", label: "Address" },
  { id: "confirm", label: "Create" },
];

type CreateOrganisationWizardProps = {
  pending?: boolean;
  onSubmit: (values: CreateOrganisationInput) => Promise<void> | void;
};

/**
 * Create-organisation wizard — Organisation → Address → Review.
 * Steps cannot be skipped ahead; earlier steps can be revisited.
 */
export function CreateOrganisationWizard({
  pending = false,
  onSubmit,
}: CreateOrganisationWizardProps) {
  const [step, setStep] = useState<StepId>("basic");
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [sizeOfOrganisation, setSizeOfOrganisation] = useState("1");
  const [officeEmail, setOfficeEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");

  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [county, setCounty] = useState("");
  const [postCode, setPostCode] = useState("");

  // Partner referral: prefilled from the signup link (?partnerCode=) or
  // the cached code, editable on the confirm step.
  const [searchParams] = useSearchParams();
  const [partnerCode, setPartnerCode] = useState<string>(() => {
    const fromUrl = searchParams.get("partnerCode")?.trim();
    if (fromUrl) {
      try {
        window.localStorage.setItem("ims.partnerCode", fromUrl);
      } catch {
        // storage unavailable — URL value still applies
      }
      return fromUrl;
    }
    try {
      return window.localStorage.getItem("ims.partnerCode") ?? "";
    } catch {
      return "";
    }
  });
  const partnerLookup = usePartnershipByCodeQuery(
    partnerCode.trim() ? partnerCode.trim() : null
  );

  const stepIndex = STEPS.findIndex((item) => item.id === step);

  function collectBasic() {
    return {
      name,
      industry: industry || undefined,
      sizeOfOrganisation,
      officeEmail,
      contactNumber,
    };
  }

  function collectAddress() {
    return {
      line1,
      line2,
      city,
      county,
      postCode,
      countryName: DEFAULT_COUNTRY.name,
      countryCode: DEFAULT_COUNTRY.code,
      countryCurrency: DEFAULT_COUNTRY.currency,
      countryPhoneCode: DEFAULT_COUNTRY.phoneCode,
    };
  }

  function goNext(event: FormEvent) {
    event.preventDefault();
    if (step === "basic") {
      const parsed = createOrganisationBasicSchema.safeParse(collectBasic());
      if (!parsed.success) {
        const next: FieldErrors = {};
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0] ?? "form");
          if (!next[key]) next[key] = issue.message;
        }
        setErrors(next);
        return;
      }
      setErrors({});
      setStep("address");
      return;
    }
    if (step === "address") {
      const parsed = createOrganisationAddressSchema.safeParse(collectAddress());
      if (!parsed.success) {
        const next: FieldErrors = {};
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0] ?? "form");
          if (!next[key]) next[key] = issue.message;
        }
        setErrors(next);
        return;
      }
      setErrors({});
      setStep("confirm");
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!accepted) {
      setErrors({ accepted: "Confirm before creating the organisation" });
      return;
    }
    const basic = createOrganisationBasicSchema.safeParse(collectBasic());
    const address = createOrganisationAddressSchema.safeParse(collectAddress());
    if (!basic.success || !address.success) {
      setErrors({ form: "Please complete Organisation and Address steps" });
      setStep(!basic.success ? "basic" : "address");
      return;
    }
    setErrors({});
    const payload: CreateOrganisationInput = {
      name: basic.data.name,
      industry: basic.data.industry,
      sizeOfOrganisation: basic.data.sizeOfOrganisation,
      officeEmail: basic.data.officeEmail,
      contactNumber: basic.data.contactNumber,
      address: {
        line1: address.data.line1,
        line2: address.data.line2,
        city: address.data.city,
        county: address.data.county,
        postCode: address.data.postCode,
      },
      country: {
        name: address.data.countryName,
        code: address.data.countryCode,
        currency: address.data.countryCurrency,
        phoneCode: address.data.countryPhoneCode,
      },
      referralSource:
        partnerCode.trim() && !partnerLookup.isError
          ? partnerCode.trim()
          : null,
    };
    await onSubmit(payload);
    try {
      window.localStorage.removeItem("ims.partnerCode");
    } catch {
      // storage unavailable — nothing to clear
    }
  }

  return (
    <div className="space-y-6">
      <ol className="flex items-center">
        {STEPS.map((item, index) => {
          const active = item.id === step;
          const done = index < stepIndex;
          const reachable = index <= stepIndex;
          return (
            <li
              key={item.id}
              className={cn("flex items-center", index < STEPS.length - 1 && "flex-1")}
            >
              <button
                type="button"
                className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full disabled:cursor-not-allowed"
                onClick={() => reachable && setStep(item.id)}
                disabled={pending || !reachable}
                aria-current={active ? "step" : undefined}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-[0.625rem] font-semibold",
                    done && "border-primary bg-primary text-primary-foreground",
                    active && "border-primary text-primary ring-4 ring-primary/10",
                    !done && !active && "border-border text-muted-foreground"
                  )}
                >
                  {done ? <Check className="size-3" /> : index + 1}
                </span>
                <span
                  className={cn(
                    "text-[0.75rem] font-medium",
                    active ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </button>
              {index < STEPS.length - 1 ? (
                <span
                  aria-hidden
                  className={cn("mx-3 h-px flex-1", done ? "bg-primary" : "bg-border")}
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      {step === "basic" ? (
        <form className="space-y-4" onSubmit={goNext}>
          <FormField label="Organisation name" htmlFor="org-name" required error={errors.name}>
            <input
              id="org-name"
              className="ims-field"
              value={name}
              disabled={pending}
              onChange={(e) => setName(e.target.value)}
            />
          </FormField>
          <FormField label="Industry" htmlFor="org-industry" required error={errors.industry}>
            <select
              id="org-industry"
              className="ims-select"
              value={industry}
              disabled={pending}
              onChange={(e) => setIndustry(e.target.value)}
            >
              <option value="">Select an industry</option>
              {ORGANISATION_INDUSTRIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Size of organisation"
              htmlFor="org-size"
              required
              error={errors.sizeOfOrganisation}
            >
              <input
                id="org-size"
                type="number"
                min={1}
                className="ims-field"
                value={sizeOfOrganisation}
                disabled={pending}
                onChange={(e) => setSizeOfOrganisation(e.target.value)}
              />
            </FormField>
            <FormField
              label="Contact number"
              htmlFor="org-phone"
              required
              error={errors.contactNumber}
            >
              <input
                id="org-phone"
                className="ims-field"
                value={contactNumber}
                disabled={pending}
                onChange={(e) => setContactNumber(e.target.value)}
              />
            </FormField>
          </div>
          <FormField
            label="Office email"
            htmlFor="org-email"
            required
            error={errors.officeEmail}
          >
            <input
              id="org-email"
              type="email"
              className="ims-field"
              value={officeEmail}
              disabled={pending}
              onChange={(e) => setOfficeEmail(e.target.value)}
            />
          </FormField>
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              Continue
            </Button>
          </div>
        </form>
      ) : null}

      {step === "address" ? (
        <form className="space-y-4" onSubmit={goNext}>
          <FormField label="Address line 1" htmlFor="org-line1" required error={errors.line1}>
            <input
              id="org-line1"
              className="ims-field"
              value={line1}
              disabled={pending}
              onChange={(e) => setLine1(e.target.value)}
            />
          </FormField>
          <FormField label="Address line 2" htmlFor="org-line2" error={errors.line2}>
            <input
              id="org-line2"
              className="ims-field"
              value={line2}
              disabled={pending}
              onChange={(e) => setLine2(e.target.value)}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="City" htmlFor="org-city" required error={errors.city}>
              <input
                id="org-city"
                className="ims-field"
                value={city}
                disabled={pending}
                onChange={(e) => setCity(e.target.value)}
              />
            </FormField>
            <FormField label="County" htmlFor="org-county" required error={errors.county}>
              <input
                id="org-county"
                className="ims-field"
                value={county}
                disabled={pending}
                onChange={(e) => setCounty(e.target.value)}
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Post code" htmlFor="org-post" required error={errors.postCode}>
              <input
                id="org-post"
                className="ims-field"
                value={postCode}
                disabled={pending}
                onChange={(e) => setPostCode(e.target.value)}
              />
            </FormField>
            <FormField label="Country" htmlFor="org-country">
              <input
                id="org-country"
                className="ims-field"
                value={DEFAULT_COUNTRY.name}
                disabled
              />
            </FormField>
          </div>
          <div className="flex justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setStep("basic")}
            >
              Back
            </Button>
            <Button type="submit" disabled={pending}>
              Continue
            </Button>
          </div>
        </form>
      ) : null}

      {step === "confirm" ? (
        <form className="space-y-4" onSubmit={(e) => void handleCreate(e)}>
          {errors.form ? (
            <p className="ims-alert ims-alert-error" role="alert">
              {errors.form}
            </p>
          ) : null}
          <dl className="ims-detail-grid rounded-xl border border-border-subtle bg-surface-muted/40 p-4">
            <div>
              <dt className="ims-detail-label">Name</dt>
              <dd className="ims-detail-value">{name || "—"}</dd>
            </div>
            <div>
              <dt className="ims-detail-label">Industry</dt>
              <dd className="ims-detail-value">{industry || "—"}</dd>
            </div>
            <div>
              <dt className="ims-detail-label">Office email</dt>
              <dd className="ims-detail-value">{officeEmail || "—"}</dd>
            </div>
            <div>
              <dt className="ims-detail-label">Contact</dt>
              <dd className="ims-detail-value">{contactNumber || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="ims-detail-label">Address</dt>
              <dd className="ims-detail-value">
                {[line1, line2, city, county, postCode, DEFAULT_COUNTRY.name]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </dd>
            </div>
          </dl>
          <FormField label="Partner code (optional)" htmlFor="partner-code">
            <Input
              id="partner-code"
              value={partnerCode}
              placeholder="Referred by an iMS partner? Enter their code"
              onChange={(event) => setPartnerCode(event.target.value)}
            />
            {partnerCode.trim() ? (
              <p className="mt-1 text-[0.75rem] text-muted-foreground">
                {partnerLookup.isPending
                  ? "Checking partner code…"
                  : partnerLookup.data?.organisationName
                    ? `Referred by ${partnerLookup.data.organisationName}`
                    : partnerLookup.isError
                      ? "This partner code was not recognised."
                      : "Referred over from one of our strategic partners? You should have received a code."}
              </p>
            ) : null}
          </FormField>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={accepted}
              disabled={pending}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span>
              I confirm these details are correct and I want to create this
              organisation.
            </span>
          </label>
          {errors.accepted ? (
            <p className="text-xs text-destructive" role="alert">
              {errors.accepted}
            </p>
          ) : null}
          <div className="flex justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setStep("address")}
            >
              Back
            </Button>
            <Button type="submit" disabled={pending || !accepted}>
              {pending ? "Creating…" : "Create organisation"}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
