import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Rocket } from "lucide-react";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/layout";
import { notify } from "@/shared/lib/toast";
import {
  useCurrentOrganisationQuery,
  useGoLiveOrganisationMutation,
} from "../hooks/use-organisations";
import { goLiveOrganisationSchema } from "../schemas";
import type { OrganisationPaymentType } from "../types";

const TOOLKIT_OPTIONS = [
  "ISO 9001",
  "ISO 27001",
  "ISO 27001 (2022)",
  "ISO 14001",
  "ISO 45001",
  "DSPT",
] as const;

/**
 * Go Live — activate customer status, licences, and reporting period.
 * Spec: docs/module-specifications/organisation-onboarding.md
 */
export function GoLivePage() {
  const navigate = useNavigate();
  const currentQuery = useCurrentOrganisationQuery();
  const mutation = useGoLiveOrganisationMutation();

  const org = currentQuery.data;
  const minSuperUser = Math.max(1, org?.licences.superUser.used ?? 1);

  const [paymentType, setPaymentType] =
    useState<OrganisationPaymentType>("Monthly invoice");
  const [superUser, setSuperUser] = useState(String(minSuperUser));
  const [users, setUsers] = useState("5");
  const [groups, setGroups] = useState("1");
  const [toolkits, setToolkits] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const alreadyCustomer = Boolean(org?.isCustomer);

  const summary = useMemo(() => {
    if (!org) return null;
    return `${org.name} · ${org.reference}`;
  }, [org]);

  function toggleToolkit(name: string) {
    setToolkits((prev) =>
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
      additionalModules: [],
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
      navigate("/organisation", { replace: true });
    } catch (error) {
      notify.fromError(error, "Unable to complete Go Live");
    }
  }

  if (currentQuery.isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-muted-foreground">Loading organisation…</p>
      </div>
    );
  }

  if (currentQuery.isError || !org) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <PageHeader
          title="Go Live"
          description="Organisation context is missing. Create an organisation first."
        />
        <Button asChild>
          <Link to="/onboard/organisation">Create organisation</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        title="Go Live"
        description={
          alreadyCustomer
            ? `${summary} is already a customer.`
            : `Activate ${summary} with licences and a one-year reporting period.`
        }
      />

      {alreadyCustomer ? (
        <section className="ims-panel overflow-hidden px-4 py-5">
          <p className="text-sm text-muted-foreground">
            This organisation already completed Go Live.
          </p>
          <div className="mt-4">
            <Button asChild>
              <Link to="/organisation">Open organisation</Link>
            </Button>
          </div>
        </section>
      ) : (
        <section className="ims-panel overflow-hidden">
          <div className="ims-panel-header">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <Rocket className="size-4 text-muted-foreground" aria-hidden />
              Licence setup
            </h2>
          </div>
          <form className="space-y-4 px-4 py-4" onSubmit={(e) => void handleSubmit(e)}>
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

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Compliance toolkits</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {TOOLKIT_OPTIONS.map((name) => (
                  <label key={name} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={toolkits.includes(name)}
                      disabled={mutation.isPending}
                      onChange={() => toggleToolkit(name)}
                    />
                    <span>{name}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <FormField
              label="Payment method"
              htmlFor="go-live-payment"
              required
              error={errors.paymentType}
            >
              <select
                id="go-live-payment"
                className="ims-select"
                value={paymentType}
                disabled={mutation.isPending}
                onChange={(e) =>
                  setPaymentType(e.target.value as OrganisationPaymentType)
                }
              >
                <option value="Monthly invoice">Monthly invoice</option>
                <option value="Card">Card</option>
              </select>
            </FormField>

            <p className="text-[0.8125rem] text-muted-foreground">
              Card checkout requires a payment adapter (not wired in local
              stub). Invoice Go Live marks the organisation as Subscribed
              immediately.
            </p>

            <div className="flex flex-wrap justify-between gap-2">
              <Button asChild type="button" variant="outline">
                <Link to="/onboard/flow-selection">Back</Link>
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Activating…" : "Go Live"}
              </Button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
