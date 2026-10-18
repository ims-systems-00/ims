import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuthClient } from "@/security";
import { loadPublicEnv } from "@/shared/lib/env";
import { isApiClientError } from "@/shared/lib/http/errors";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { FormField } from "@/shared/components/form-field";
import { AuthEntryLayout } from "../components/auth-entry-layout";
import { loginSchema, type LoginFormValues } from "../schemas";

/**
 * V5 login — email/password via Auth0 BFF (embedded form).
 */
export function LoginPage() {
  const env = loadPublicEnv();
  const authClient = useAuthClient();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo =
    (location.state as { returnTo?: string } | null)?.returnTo ?? "/";
  const [checking, setChecking] = useState(
    env.VITE_SECURITY_PROVIDER === "auth0-openfga"
  );
  const [alreadyAuthed, setAlreadyAuthed] = useState(
    env.VITE_SECURITY_PROVIDER === "development-stub"
  );
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof LoginFormValues, string>>
  >({});
  const [values, setValues] = useState<LoginFormValues>({
    email: "",
    password: "",
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
      <AuthEntryLayout title="Sign in" description="Checking session…">
        <p className="text-sm text-muted-foreground">Please wait…</p>
      </AuthEntryLayout>
    );
  }

  if (alreadyAuthed) {
    return <Navigate to={returnTo || "/"} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<keyof LoginFormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !(key in next)) {
          next[key as keyof LoginFormValues] = issue.message;
        }
      }
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});
    setPending(true);
    try {
      await authClient.loginWithPassword(parsed.data);
      navigate(returnTo || "/", { replace: true });
    } catch (error) {
      setFormError(
        isApiClientError(error)
          ? error.message
          : "Unable to sign in. Check your email and password."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthEntryLayout
      title="Sign in"
      description="Use your iMS account. Passwords are verified by Auth0; this page stays on your product URL."
    >
      <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)} noValidate>
        <FormField
          label="Email"
          htmlFor="login-email"
          required
          error={fieldErrors.email}
        >
          <Input
            id="login-email"
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
          htmlFor="login-password"
          required
          error={fieldErrors.password}
        >
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
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
        {formError ? (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
        <p className="text-center text-[0.8125rem] text-muted-foreground">
          <Link
            to="/forgot-password"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </p>
        <p className="text-center text-[0.8125rem] text-muted-foreground">
          New here?{" "}
          <Link
            to="/register"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </form>
    </AuthEntryLayout>
  );
}
