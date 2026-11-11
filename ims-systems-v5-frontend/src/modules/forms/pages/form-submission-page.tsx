import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import {
  useCreateFormSubmissionMutation,
  useFormElementsQuery,
  useFormQuery,
} from "../hooks/use-forms";
import { getElementDefinition } from "../build-form/registry";
import { FormLogo } from "../components/form-logo";
import {
  formThemeCssVars,
  normalizeFormTheme,
  themeImageSrc,
} from "../lib/form-theme";

/**
 * Org-member fill page for shared form links.
 * Requires login + same-org membership (route sits under RequireAuth).
 * Only published forms accept submissions.
 */
export function FormSubmissionPage() {
  const { formId = "" } = useParams();
  const formQuery = useFormQuery(formId);
  const elementsQuery = useFormElementsQuery(formId);
  const submitMutation = useCreateFormSubmissionMutation(formId);
  const elements = elementsQuery.data ?? [];
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const theme = useMemo(
    () => normalizeFormTheme(formQuery.data?.theme),
    [formQuery.data?.theme]
  );
  const coverSrc = themeImageSrc(theme.coverImage);
  const logoAtTop = theme.logoVertical !== "bottom";
  const isPublished = formQuery.data?.status === "published";

  async function submit() {
    if (!isPublished) {
      notify.error("Only published forms can accept submissions");
      return;
    }
    const nextErrors: Record<string, string> = {};
    for (const el of elements) {
      const def = getElementDefinition(el.type);
      if (!def) continue;
      const message = def.validate(values[el.id], el.attributes);
      if (message) nextErrors[el.id] = message;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      notify.error("Please fix validation errors before submitting");
      return;
    }
    try {
      await submitMutation.mutateAsync({
        responses: elements.map((el) => ({
          formElementId: el.id,
          responseValue: values[el.id] ?? null,
        })),
      });
      notify.success("Form submitted");
      setSubmitted(true);
    } catch (error) {
      notify.error(
        isApiClientError(error) ? error.message : "Could not submit form"
      );
    }
  }

  if (formQuery.isLoading || elementsQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading form…
      </div>
    );
  }

  if (!formQuery.data) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-border p-6 text-sm text-muted-foreground">
        Form not found, or you do not have access in this organisation.
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-border bg-card p-8 text-center">
        <CheckCircle2 className="mx-auto size-10 text-emerald-600" aria-hidden />
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Thank you</h1>
          <p className="text-sm text-muted-foreground">
            Your response to <span className="font-medium text-foreground">{formQuery.data.title}</span>{" "}
            was submitted successfully.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/documents/forms">Back to forms</Link>
        </Button>
      </div>
    );
  }

  if (!isPublished) {
    return (
      <div className="mx-auto max-w-lg space-y-3 rounded-xl border border-border bg-card p-6">
        <h1 className="text-lg font-semibold">{formQuery.data.title}</h1>
        <p className="text-sm text-muted-foreground">
          This form is not published yet, so it cannot accept submissions.
          Ask a form owner to publish it, then open the share link again.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/documents/forms">Back to forms</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div
        className="overflow-hidden rounded-xl border border-black/10 shadow-sm"
        style={formThemeCssVars(theme)}
      >
        {coverSrc ? (
          <div
            className="h-36 w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${coverSrc})` }}
          />
        ) : (
          <div
            className="h-1.5 w-full"
            style={{ backgroundColor: "var(--form-accent)" }}
          />
        )}
        <div className="space-y-4 p-6">
          {logoAtTop ? <FormLogo theme={theme} /> : null}
          <div>
            <h1 className="text-xl font-semibold">{formQuery.data.title}</h1>
            {formQuery.data.description ? (
              <p className="mt-1 text-sm opacity-80">
                {formQuery.data.description}
              </p>
            ) : null}
          </div>
          {elements.map((el) => {
            const def = getElementDefinition(el.type);
            if (!def) return null;
            return (
              <div key={el.id} className="space-y-1">
                <def.Response
                  attributes={el.attributes}
                  value={values[el.id]}
                  onChange={(value) =>
                    setValues((prev) => ({ ...prev, [el.id]: value }))
                  }
                />
                {errors[el.id] ? (
                  <p className="text-xs text-destructive">{errors[el.id]}</p>
                ) : null}
              </div>
            );
          })}
          {!logoAtTop ? <FormLogo theme={theme} /> : null}
          <Button
            type="button"
            disabled={submitMutation.isPending}
            style={{
              backgroundColor: "var(--form-accent)",
              color: "#fff",
              borderColor: "transparent",
            }}
            onClick={() => void submit()}
          >
            {submitMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}
