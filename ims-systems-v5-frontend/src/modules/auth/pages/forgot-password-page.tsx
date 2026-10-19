import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuthClient } from "@/security";
import { isApiClientError } from "@/shared/lib/http/errors";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { FormField } from "@/shared/components/form-field";
import { AuthEntryLayout } from "../components/auth-entry-layout";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "../schemas";

/**
 * V5 forgot password — triggers Auth0 change-password email via BFF.
 */
export function ForgotPasswordPage() {
  const authClient = useAuthClient();
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ForgotPasswordFormValues, string>>
  >({});
  const [values, setValues] = useState<ForgotPasswordFormValues>({
    email: "",
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const parsed = forgotPasswordSchema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<keyof ForgotPasswordFormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !(key in next)) {
          next[key as keyof ForgotPasswordFormValues] = issue.message;
        }
      }
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});
    setPending(true);
    try {
      await authClient.requestPasswordReset({ email: parsed.data.email });
      setDone(true);
    } catch (error) {
      setFormError(
        isApiClientError(error)
          ? error.message
          : "Unable to start password reset. Try again."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthEntryLayout
      title="Reset password"
      description="Enter your email and we will send reset instructions if an account exists."
    >
      {done ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            If an account exists for that email, password reset instructions
            have been sent.
          </p>
          <p className="text-center text-[0.8125rem] text-muted-foreground">
            <Link
              to="/login"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => void handleSubmit(e)}
          noValidate
        >
          <FormField
            label="Email"
            htmlFor="forgot-email"
            required
            error={fieldErrors.email}
          >
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              value={values.email}
              disabled={pending}
              onChange={(event) =>
                setValues({ email: event.target.value })
              }
            />
          </FormField>
          {formError ? (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Sending…" : "Send reset link"}
          </Button>
          <p className="text-center text-[0.8125rem] text-muted-foreground">
            <Link
              to="/login"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthEntryLayout>
  );
}
