import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import {
  useCreateFormSubmissionMutation,
  useFormElementsQuery,
  useFormQuery,
} from "../hooks/use-forms";
import { getElementDefinition } from "../build-form/registry";
import { formThemeCssVars, normalizeFormTheme, themeImageSrc } from "../lib/form-theme";

export function FormSubmissionPage() {
  const { formId = "" } = useParams();
  const navigate = useNavigate();
  const formQuery = useFormQuery(formId);
  const elementsQuery = useFormElementsQuery(formId);
  const submitMutation = useCreateFormSubmissionMutation(formId);
  const elements = elementsQuery.data ?? [];
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const theme = useMemo(
    () => normalizeFormTheme(formQuery.data?.theme),
    [formQuery.data?.theme]
  );
  const logoSrc = themeImageSrc(theme.logo);
  const coverSrc = themeImageSrc(theme.coverImage);

  async function submit() {
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
      navigate(`/documents/forms/${formId}/response`);
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
    return <p className="text-sm text-muted-foreground">Form not found.</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <Link
          to={`/documents/forms/${formId}/build-form`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to builder
        </Link>
      </div>
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
          {logoSrc ? (
            <img
              src={logoSrc}
              alt=""
              className="h-10 w-auto max-w-[180px] object-contain"
            />
          ) : null}
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
