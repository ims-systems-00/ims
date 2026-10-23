import { useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { notify } from "@/shared/lib/toast";
import { useRegisterPublicInterestMutation } from "../hooks/use-register-public-interest";
import { registerPublicInterestFormSchema } from "../schemas";
import { REGISTER_INTEREST_PRODUCTS } from "../types";

type FieldErrors = Record<string, string>;

/**
 * Public Register Interest page (`/register-interest`, no login).
 * One registration per email address.
 */
export function RegisterPublicInterestPage() {
  const mutation = useRegisterPublicInterestMutation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [product, setProduct] = useState<string>(
    REGISTER_INTEREST_PRODUCTS[0].value
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = registerPublicInterestFormSchema.safeParse({
      name,
      email,
      companyName,
      product,
    });
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
    try {
      const result = await mutation.mutateAsync(parsed.data);
      setSuccessMessage(result.message);
      notify.success(result.message);
    } catch (error) {
      notify.fromError(error, "Unable to register your interest");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-lg space-y-4 rounded-xl border border-border-subtle bg-card p-6 shadow-sm">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Register your interest
          </h1>
          <p className="text-sm text-muted-foreground">
            Tell us which iMS product you are interested in and we will keep you
            updated.
          </p>
        </div>

        {successMessage ? (
          <div className="flex items-start gap-2 rounded-md border border-border-subtle px-3 py-3 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" />
            <span>
              {successMessage}. Thank you — we will be in touch.
            </span>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => void handleSubmit(event)}
          >
            <FormField
              label="Name"
              htmlFor="register-interest-name"
              required
              error={errors.name}
            >
              <Input
                id="register-interest-name"
                value={name}
                maxLength={20}
                disabled={mutation.isPending}
                autoComplete="name"
                onChange={(event) => setName(event.target.value)}
              />
            </FormField>
            <FormField
              label="Email"
              htmlFor="register-interest-email"
              required
              error={errors.email}
            >
              <Input
                id="register-interest-email"
                type="email"
                value={email}
                maxLength={50}
                disabled={mutation.isPending}
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
              />
            </FormField>
            <FormField
              label="Company name"
              htmlFor="register-interest-company"
              required
              error={errors.companyName}
            >
              <Input
                id="register-interest-company"
                value={companyName}
                maxLength={30}
                disabled={mutation.isPending}
                autoComplete="organization"
                onChange={(event) => setCompanyName(event.target.value)}
              />
            </FormField>
            <FormField
              label="Product"
              htmlFor="register-interest-product"
              required
              error={errors.product}
            >
              <select
                id="register-interest-product"
                className="ims-select"
                value={product}
                disabled={mutation.isPending}
                onChange={(event) => setProduct(event.target.value)}
              >
                {REGISTER_INTEREST_PRODUCTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>
            <div className="flex justify-end pt-1">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Submitting…" : "Register interest"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
