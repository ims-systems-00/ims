import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { FormLogo } from "./form-logo";
import { useFormElementsQuery } from "../hooks/use-forms";
import {
  formThemeCssVars,
  normalizeFormTheme,
  useThemeImageSrc,
} from "../lib/form-theme";
import { attrString } from "../build-form/element-types";
import { getElementDefinition } from "../build-form/registry";
import type { Form, FormElement } from "../types";

function elementPreviewLabel(element: FormElement): string {
  const fromLabel = attrString(element.attributes, "label");
  if (fromLabel) return fromLabel;
  const fromText = attrString(element.attributes, "text");
  if (fromText) return fromText;
  const fromTitle = attrString(element.attributes, "title");
  if (fromTitle) return fromTitle;
  return getElementDefinition(element.type)?.label ?? element.type;
}

type FormCardPreviewProps = {
  form: Form;
};

/**
 * Mini themed preview of a form for library cards — brand chrome plus a
 * few element labels so the card reflects what was built.
 */
export function FormCardPreview({ form }: FormCardPreviewProps) {
  const theme = useMemo(
    () => normalizeFormTheme(form.theme),
    [form.theme]
  );
  const coverSrc = useThemeImageSrc(theme.coverImage);
  const logoAtTop = theme.logoVertical !== "bottom";
  const elementsQuery = useFormElementsQuery(form.id);
  const previewElements = (elementsQuery.data ?? []).slice(0, 4);

  return (
    <div
      className="overflow-hidden rounded-md border border-black/10 shadow-sm"
      style={formThemeCssVars(theme)}
      aria-hidden
    >
      {coverSrc ? (
        <div
          className="h-16 w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${coverSrc})` }}
        />
      ) : (
        <div
          className="h-1.5 w-full"
          style={{ backgroundColor: "var(--form-accent)" }}
        />
      )}
      <div className="space-y-2 p-3">
        {logoAtTop ? (
          <FormLogo
            theme={theme}
            imageClassName="h-6 w-auto max-w-[100px] object-contain"
          />
        ) : null}
        <div>
          <p className="truncate text-[0.8125rem] font-semibold leading-tight">
            {form.title}
          </p>
          {form.description ? (
            <p className="mt-0.5 line-clamp-1 text-[0.7rem] opacity-70">
              {form.description}
            </p>
          ) : null}
        </div>

        {elementsQuery.isLoading ? (
          <div className="flex items-center gap-1.5 py-1 text-[0.7rem] opacity-60">
            <Loader2 className="size-3 animate-spin" />
            Loading fields…
          </div>
        ) : previewElements.length === 0 ? (
          <p className="rounded border border-dashed border-black/15 px-2 py-3 text-center text-[0.7rem] opacity-55">
            No fields yet
          </p>
        ) : (
          <div className="space-y-1.5">
            {previewElements.map((element) => {
              const label = elementPreviewLabel(element);
              const isHeader =
                element.type === "Header" || element.type === "Paragraph";
              return (
                <div key={element.id} className="space-y-1">
                  <p
                    className={
                      isHeader
                        ? "truncate text-[0.75rem] font-semibold"
                        : "truncate text-[0.65rem] font-medium opacity-80"
                    }
                  >
                    {label}
                  </p>
                  {!isHeader ? (
                    <div className="h-5 rounded border border-black/10 bg-black/[0.03]" />
                  ) : null}
                </div>
              );
            })}
            {(elementsQuery.data?.length ?? 0) > previewElements.length ? (
              <p className="text-[0.65rem] opacity-50">
                +{(elementsQuery.data?.length ?? 0) - previewElements.length}{" "}
                more
              </p>
            ) : null}
          </div>
        )}

        {!logoAtTop ? (
          <FormLogo
            theme={theme}
            imageClassName="h-6 w-auto max-w-[100px] object-contain"
          />
        ) : null}
      </div>
    </div>
  );
}
