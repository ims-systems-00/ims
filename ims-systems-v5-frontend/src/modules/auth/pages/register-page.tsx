import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuthClient } from "@/security";
import { loadPublicEnv } from "@/shared/lib/env";
import { isApiClientError } from "@/shared/lib/http/errors";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { FormField } from "@/shared/components/form-field";
import { AuthEntryLayout } from "../components/auth-entry-layout";
import { registerSchema, type RegisterFormValues } from "../schemas";

/**
 * V5 register — self-signup via Auth0 BFF; then membership gate → onboard.
 */
export function RegisterPage() {
  const env = loadPublicEnv();
  const authClient = useAuthClient();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(
    env.VITE_SECURITY_PROVIDER === "auth0-openfga"
  );
  const [alreadyAuthed, setAlreadyAuthed] = useState(
    env.VITE_SECURITY_PROVIDER === "development-stub"
  );
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof RegisterFormValues, string>>
  >({});
  const [values, setValues] = useState<RegisterFormValues>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (env.VITE_SECURITY_PROVIDER === "development-stub") {
      setAlreadyAuthed(true);
      setChecking(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const ok = await authClient.isAuthenticated();
      if (cancelled) return;
      setAlreadyAuthed(ok);
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [authClient, env.VITE_SECURITY_PROVIDER]);

  if (checking) {
    return (
      <AuthEntryLayout title="Create account" description="Checking session…">
        <p className="text-sm text-muted-foreground">Please wait…</p>
      </AuthEntryLayout>
    );
  }

  if (alreadyAuthed) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const parsed = registerSchema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<keyof RegisterFormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !(key in next)) {
          next[key as keyof RegisterFormValues] = issue.message;
        }
      }
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});
    setPending(true);
    try {
      const { confirmPassword: _c, ...credentials } = parsed.data;
      void _c;
      await authClient.register(credentials);
      navigate("/", { replace: true });
    } catch (error) {
      setFormError(
        isApiClientError(error)
          ? error.message
          : "Unable to create account. Try again."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthEntryLayout
      title="Create account"
      description="Register as a person first. After Auth0 confirms your identity, you will set up your organisation in iMS."
    >
      <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="First name"
            htmlFor="register-first-name"
            required
            error={fieldErrors.firstName}
          >
            <Input
              id="register-first-name"
              autoComplete="given-name"
              value={values.firstName}
              disabled={pending}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  firstName: event.target.value,
                }))
              }
            />
          </FormField>
          <FormField
            label="Last name"
            htmlFor="register-last-name"
            required
            error={fieldErrors.lastName}
          >
            <Input
              id="register-last-name"
              autoComplete="family-name"
              value={values.lastName}
              disabled={pending}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  lastName: event.target.value,
                }))
              }
            />
          </FormField>
        </div>
        <FormField
          label="Email"
          htmlFor="register-email"
          required
          error={fieldErrors.email}
        >
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            value={values.email}
            disabled={pending}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                email: event.target.value,
              }))
            }
          />
        </FormField>
        <FormField
          label="Password"
          htmlFor="register-password"
          required
          error={fieldErrors.password}
        >
          <Input
            id="register-password"
            type="password"
            autoComplete="new-password"
            value={values.password}
            disabled={pending}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                password: event.target.value,
              }))
            }
          />
        </FormField>
        <FormField
          label="Confirm password"
          htmlFor="register-confirm-password"
          required
          error={fieldErrors.confirmPassword}
        >
          <Input
            id="register-confirm-password"
            type="password"
            autoComplete="new-password"
            value={values.confirmPassword}
            disabled={pending}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                confirmPassword: event.target.value,
              }))
            }
          />
        </FormField>
        {formError ? (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating account…" : "Sign up"}
        </Button>
        <p className="text-center text-[0.8125rem] text-muted-foreground">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthEntryLayout>
  );
}
