import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthClient } from "@/security";
import { clearSessionCaches } from "@/security/clear-session-caches";
import { loadPublicEnv } from "@/shared/lib/env";
import { isApiClientError } from "@/shared/lib/http/errors";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { FormField } from "@/shared/components/form-field";
import {
  acceptInvitationPath,
  getPendingInvite,
  setPendingInvite,
} from "@/modules/invitations/lib/pending-invite";
import { AuthEntryLayout } from "../components/auth-entry-layout";
import { registerSchema, type RegisterFormValues } from "../schemas";
import { PageLoader } from "@/shared/components/ims-loader";

/**
 * V5 register — self-signup via Auth0 BFF.
 * When arriving from an organisation invitation, email is prefilled and the
 * user is returned to auto-accept instead of organisation setup.
 */
export function RegisterPage() {
  const env = loadPublicEnv();
  const authClient = useAuthClient();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pendingInvite = useMemo(() => {
    const token = searchParams.get("invite")?.trim();
    const email = searchParams.get("email")?.trim().toLowerCase();
    if (token) return { token, email: email || undefined };
    return getPendingInvite();
  }, [searchParams]);
  const inviteLockedEmail = Boolean(pendingInvite?.email);

  useEffect(() => {
    if (!pendingInvite?.token) return;
    setPendingInvite({
      token: pendingInvite.token,
      email: pendingInvite.email,
    });
  }, [pendingInvite?.token, pendingInvite?.email]);

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
    email: pendingInvite?.email ?? "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (pendingInvite?.email) {
      setValues((current) =>
        current.email === pendingInvite.email
          ? current
          : { ...current, email: pendingInvite.email ?? "" }
      );
    }
  }, [pendingInvite?.email]);

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
      <AuthEntryLayout title="Create your account" description="Checking session…">
        <PageLoader label="Please wait…" compact />
      </AuthEntryLayout>
    );
  }

  if (alreadyAuthed) {
    if (pendingInvite?.token) {
      return (
        <Navigate
          to={acceptInvitationPath(pendingInvite.token, true)}
          replace
        />
      );
    }
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
    if (
      pendingInvite?.email &&
      parsed.data.email.trim().toLowerCase() !== pendingInvite.email
    ) {
      setFormError(
        `Use the invited email address (${pendingInvite.email}) to join this organisation.`
      );
      return;
    }
    setFieldErrors({});
    setPending(true);
    try {
      const { confirmPassword: _c, ...credentials } = parsed.data;
      void _c;
      await authClient.register(credentials);
      clearSessionCaches(queryClient);
      if (pendingInvite?.token) {
        setPendingInvite({
          token: pendingInvite.token,
          email: credentials.email.trim().toLowerCase(),
        });
        navigate(acceptInvitationPath(pendingInvite.token, true), {
          replace: true,
        });
        return;
      }
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
      title="Create your account"
      description={
        pendingInvite
          ? "Register to join the organisation you were invited to. You will skip organisation setup."
          : "Register as a person first. Next you will set up your organisation and go live in iMS."
      }
    >
      <form
        className="space-y-5"
        onSubmit={(e) => void handleSubmit(e)}
        noValidate
      >
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
              placeholder="Ada"
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
              placeholder="Lovelace"
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
          description={
            inviteLockedEmail
              ? "This email is locked to your invitation."
              : undefined
          }
        >
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={values.email}
            disabled={pending || inviteLockedEmail}
            readOnly={inviteLockedEmail}
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
            placeholder="Create a strong password"
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
            placeholder="Repeat your password"
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
        <Button type="submit" className="h-10 w-full" disabled={pending}>
          {pending
            ? "Creating account…"
            : pendingInvite
              ? "Sign up & join organisation"
              : "Sign up"}
        </Button>
        <p className="text-center text-[0.8125rem] text-muted-foreground">
          Already have an account?{" "}
          <Link
            to="/login"
            state={
              pendingInvite?.token
                ? {
                    returnTo: acceptInvitationPath(pendingInvite.token, true),
                  }
                : undefined
            }
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthEntryLayout>
  );
}
