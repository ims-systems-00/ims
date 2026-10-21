import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  CreditCard,
  Loader2,
  ReceiptText,
  Rocket,
} from "lucide-react";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import {
  OnboardCard,
  OnboardCardHeader,
  OnboardHeader,
} from "../components/onboarding-ui";
import { COMPLIANCE_TOOLKIT_NAMES } from "@/modules/compliance/types";
import {
  useCardPaymentSessionMutation,
  useCurrentOrganisationQuery,
  useGoLiveOrganisationMutation,
} from "../hooks/use-organisations";
import { goLiveOrganisationSchema } from "../schemas";
import {
  ADDITIONAL_MODULE_OPTIONS,
  type OrganisationPaymentType,
} from "../types";

/**
 * Step 3 — Go Live: activate customer status, licences, and reporting period.
 * Card customers are redirected to Stripe Checkout; Monthly invoice
 * customers are activated immediately and invoiced afterwards.
 */
export function GoLivePage() {
  const navigate = useNavigate();
  const currentQuery = useCurrentOrganisationQuery();
  const mutation = useGoLiveOrganisationMutation();
  const cardPayment = useCardPaymentSessionMutation();

  const org = currentQuery.data;
  const minSuperUser = Math.max(1, org?.licences.superUser.used ?? 1);

  const [paymentType, setPaymentType] =
    useState<OrganisationPaymentType>("Monthly invoice");
  const [superUser, setSuperUser] = useState(String(minSuperUser));
  const [users, setUsers] = useState("5");
  const [groups, setGroups] = useState("1");
  const [toolkits, setToolkits] = useState<string[]>([]);
  const [additionalModules, setAdditionalModules] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const alreadyCustomer = Boolean(org?.isCustomer);
  const paymentPending =
    alreadyCustomer &&
    !org?.paymentSystem?.stripeSubscriptionId &&
    (org?.paymentSystem?.status === "Trial" ||
      org?.paymentSystem?.type === "Card");

  const summary = useMemo(() => {
    if (!org) return null;
    return `${org.name} · ${org.reference}`;
  }, [org]);

  function toggleToolkit(name: string) {
    setToolkits((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  }

  function toggleModule(name: string) {
    setAdditionalModules((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!org?.id) {
      notify.error("Organisation context is required");
      return;
    }
    if (alreadyCustomer) {
      notify.error("This organisation is already live");
      return;
    }

    const parsed = goLiveOrganisationSchema.safeParse({
      paymentType,
      superUser,
      users,
      groups,
      complianceTools: toolkits,
      additionalModules,
      carbocalc: false,
      imsforms: false,
      projectims: false,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    if (parsed.data.superUser < minSuperUser) {
      setErrors({
        superUser: `At least ${minSuperUser} Super Admin seat(s) required`,
      });
      return;
    }
    setErrors({});

    try {
      const result = await mutation.mutateAsync({
        organizationId: org.id,
        body: parsed.data,
      });
      notify.success(`${result.organisation.name} is now live`);
      if (result.paymentSession?.url) {
        window.location.assign(result.paymentSession.url);
        return;
      }
      if (parsed.data.paymentType === "Card") {
        notify.info(
          "Your organisation is live, but card payment hasn't started yet. Complete it from Organisation → Licenses → Card payment."
        );
      }
      navigate("/organisation", { replace: true });
    } catch (error) {
      notify.fromError(error, "Unable to complete Go Live");
    }
  }

  async function continueCardPayment() {
    if (!org?.id) return;
    try {
      const session = await cardPayment.mutateAsync(org.id);
      if (!session.url) {
        notify.error("Stripe checkout did not return a URL");
        return;
      }
      window.location.assign(session.url);
    } catch (error) {
      notify.fromError(error, "Unable to start card payment");
    }
  }

  if (currentQuery.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading organisation…
      </div>
    );
  }

  if (currentQuery.isError || !org) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <OnboardHeader
          eyebrow="Step 3 of 3"
          title="Go Live"
          description="Organisation context is missing. Create an organisation first."
        />
        <div className="text-center">
          <Button asChild>
            <Link to="/onboard/organisation">Create organisation</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <OnboardHeader
        eyebrow="Step 3 of 3"
        title={alreadyCustomer ? "You're already live" : "Activate your workspace"}
        description={
          alreadyCustomer
            ? `${summary} has already completed Go Live.`
            : `Activate ${summary} with your licence seats, toolkits, and a one-year reporting period.`
        }
      />

      {alreadyCustomer ? (
        <OnboardCard className="mx-auto max-w-2xl">
          <div className="space-y-4 px-5 py-6 text-center md:px-6">
            <span
              aria-hidden
              className="mx-auto flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              <Check className="size-5" />
            </span>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
              {paymentPending
                ? "This organisation is live, but card payment has not completed yet. Continue to Stripe to finish payment."
                : "This organisation already completed Go Live. Your workspace is ready."}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {paymentPending ? (
                <Button
                  type="button"
                  disabled={cardPayment.isPending}
                  onClick={() => void continueCardPayment()}
                >
                  {cardPayment.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <CreditCard className="size-4" aria-hidden />
                  )}
                  Continue card payment
                </Button>
              ) : null}
              <Button asChild variant={paymentPending ? "outline" : "default"}>
                <Link to="/organisation">Open workspace</Link>
              </Button>
            </div>
          </div>
        </OnboardCard>
      ) : (
        <form
          className="grid items-start gap-4 lg:grid-cols-[1fr_20rem]"
          onSubmit={(e) => void handleSubmit(e)}
        >
          <OnboardCard>
            <OnboardCardHeader
              icon={<Rocket className="size-4" aria-hidden />}
              title="Licence setup"
              description="Seats and toolkits your organisation will start with"
            />
            <div className="space-y-6 px-5 py-5 md:px-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  label="Super Admins"
                  htmlFor="go-live-super"
                  required
                  error={errors.superUser}
                >
                  <input
                    id="go-live-super"
                    type="number"
                    min={minSuperUser}
                    className="ims-field"
                    value={superUser}
                    disabled={mutation.isPending}
                    onChange={(e) => setSuperUser(e.target.value)}
                  />
                </FormField>
                <FormField label="Users" htmlFor="go-live-users" error={errors.users}>
                  <input
                    id="go-live-users"
                    type="number"
                    min={0}
                    className="ims-field"
                    value={users}
                    disabled={mutation.isPending}
                    onChange={(e) => setUsers(e.target.value)}
                  />
                </FormField>
                <FormField
                  label="Business units"
                  htmlFor="go-live-groups"
                  error={errors.groups}
                >
                  <input
                    id="go-live-groups"
                    type="number"
                    min={0}
                    className="ims-field"
                    value={groups}
                    disabled={mutation.isPending}
                    onChange={(e) => setGroups(e.target.value)}
                  />
                </FormField>
              </div>

              <fieldset className="space-y-2.5">
                <legend className="text-sm font-medium">Compliance toolkits</legend>
                <p className="text-[0.75rem] text-muted-foreground">
                  Optional — each selected standard is licensed and billed per
                  toolkit.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {COMPLIANCE_TOOLKIT_NAMES.map((name) => {
                    const selected = toolkits.includes(name);
                    return (
                      <button
                        key={name}
                        type="button"
                        disabled={mutation.isPending}
                        aria-pressed={selected}
                        onClick={() => toggleToolkit(name)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-[0.75rem] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
                          selected
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                        )}
                      >
                        {selected ? (
                          <Check className="mr-1 inline size-3" aria-hidden />
                        ) : null}
                        {name}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="space-y-2.5">
                <legend className="text-sm font-medium">Additional modules</legend>
                <p className="text-[0.75rem] text-muted-foreground">
                  Optional add-ons, billed per module.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ADDITIONAL_MODULE_OPTIONS.map((name) => {
                    const selected = additionalModules.includes(name);
                    return (
                      <button
                        key={name}
                        type="button"
                        disabled={mutation.isPending}
                        aria-pressed={selected}
                        onClick={() => toggleModule(name)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-[0.75rem] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
                          selected
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                        )}
                      >
                        {selected ? (
                          <Check className="mr-1 inline size-3" aria-hidden />
                        ) : null}
                        {name}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="space-y-2.5">
                <legend className="text-sm font-medium">
                  Payment method <span className="text-destructive">*</span>
                </legend>
                {errors.paymentType ? (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.paymentType}
                  </p>
                ) : null}
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={mutation.isPending}
                    aria-pressed={paymentType === "Card"}
                    onClick={() => setPaymentType("Card")}
                    className={cn(
                      "rounded-xl border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
                      paymentType === "Card"
                        ? "border-primary bg-primary/[0.04] ring-1 ring-primary/30"
                        : "border-border hover:bg-surface-muted/60"
                    )}
                  >
                    <span className="flex items-center justify-between">
                      <CreditCard className="size-4 text-muted-foreground" aria-hidden />
                      {paymentType === "Card" ? (
                        <Check className="size-4 text-primary" aria-hidden />
                      ) : null}
                    </span>
                    <span className="mt-2.5 block text-sm font-medium">Card</span>
                    <span className="mt-0.5 block text-[0.75rem] leading-relaxed text-muted-foreground">
                      Pay now via Stripe, then monthly automatically.
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={mutation.isPending}
                    aria-pressed={paymentType === "Monthly invoice"}
                    onClick={() => setPaymentType("Monthly invoice")}
                    className={cn(
                      "rounded-xl border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
                      paymentType === "Monthly invoice"
                        ? "border-primary bg-primary/[0.04] ring-1 ring-primary/30"
                        : "border-border hover:bg-surface-muted/60"
                    )}
                  >
                    <span className="flex items-center justify-between">
                      <ReceiptText className="size-4 text-muted-foreground" aria-hidden />
                      {paymentType === "Monthly invoice" ? (
                        <Check className="size-4 text-primary" aria-hidden />
                      ) : null}
                    </span>
                    <span className="mt-2.5 block text-sm font-medium">
                      Monthly invoice
                    </span>
                    <span className="mt-0.5 block text-[0.75rem] leading-relaxed text-muted-foreground">
                      Activate now, invoiced monthly afterwards.
                    </span>
                  </button>
                </div>
              </fieldset>
            </div>
          </OnboardCard>

          <OnboardCard className="lg:sticky lg:top-32">
            <div className="space-y-4 px-5 py-5">
              <h2 className="text-sm font-semibold tracking-tight">Summary</h2>
              <dl className="space-y-2.5 text-[0.8125rem]">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Organisation</dt>
                  <dd className="min-w-0 truncate font-medium">{org.name}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Super Admins</dt>
                  <dd className="font-medium tabular-nums">{superUser || "0"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Users</dt>
                  <dd className="font-medium tabular-nums">{users || "0"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Business units</dt>
                  <dd className="font-medium tabular-nums">{groups || "0"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Toolkits</dt>
                  <dd className="font-medium tabular-nums">{toolkits.length}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Add-on modules</dt>
                  <dd className="font-medium tabular-nums">
                    {additionalModules.length}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-border-subtle pt-2.5">
                  <dt className="text-muted-foreground">Payment</dt>
                  <dd className="font-medium">{paymentType}</dd>
                </div>
              </dl>

              <p className="rounded-lg bg-surface-muted/60 px-3 py-2.5 text-[0.75rem] leading-relaxed text-muted-foreground">
                {paymentType === "Card"
                  ? "Next, you'll complete payment securely in Stripe. Your subscription starts when payment succeeds."
                  : "Your workspace activates immediately. Our accounts team will invoice you monthly."}
              </p>

              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Activating…
                  </>
                ) : paymentType === "Card" ? (
                  "Go Live & pay"
                ) : (
                  "Go Live"
                )}
              </Button>
              <Button asChild type="button" variant="ghost" className="w-full">
                <Link to="/onboard/flow-selection">
                  <ArrowLeft className="size-4" aria-hidden />
                  Back
                </Link>
              </Button>
            </div>
          </OnboardCard>
        </form>
      )}
    </div>
  );
}
