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

const PREVIEW_FIELD_SLOTS = 3;

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
 * Fixed-height mini themed preview for library cards so every card in a
 * grid row shares the same preview + chrome proportions.
 */
export function FormCardPreview({ form }: FormCardPreviewProps) {
  const theme = useMemo(
    () => normalizeFormTheme(form.theme),
    [form.theme]
  );
  const coverSrc = useThemeImageSrc(theme.coverImage);
  const logoAtTop = theme.logoVertical !== "bottom";
  const elementsQuery = useFormElementsQuery(form.id);
  const previewElements = (elementsQuery.data ?? []).slice(
    0,
    PREVIEW_FIELD_SLOTS
  );

  return (
    <div
      className="ims-form-surface flex h-44 flex-col overflow-hidden rounded-md border border-[var(--form-border)] shadow-sm"
      style={formThemeCssVars(theme)}
      aria-hidden
    >
      <div className="relative h-14 shrink-0 overflow-hidden">
        {coverSrc ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${coverSrc})` }}
          />
        ) : (
          <div
            className="absolute inset-x-0 top-0 h-1.5"
            style={{ backgroundColor: "var(--form-accent)" }}
          />
        )}
        {logoAtTop ? (
          <div className="absolute bottom-1.5 left-2 right-2">
            <FormLogo
              theme={theme}
              imageClassName="h-5 w-auto max-w-[88px] object-contain drop-shadow-sm"
            />
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-2.5">
        <div className="shrink-0">
          <p className="truncate text-[0.75rem] font-semibold leading-tight">
            {form.title}
          </p>
          <p className="mt-0.5 line-clamp-1 min-h-[0.95rem] text-[0.65rem] text-[var(--form-muted-fg)]">
            {form.description || "\u00A0"}
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-hidden">
          {elementsQuery.isLoading ? (
            <div className="flex items-center gap-1.5 py-1 text-[0.65rem] text-[var(--form-muted-fg)]">
              <Loader2 className="size-3 animate-spin" />
              Loading fields…
            </div>
          ) : previewElements.length === 0 ? (
            <p className="rounded border border-dashed border-[var(--form-border)] px-2 py-2 text-center text-[0.65rem] text-[var(--form-muted-fg)]">
              No fields yet
            </p>
          ) : (
            previewElements.map((element) => {
              const label = elementPreviewLabel(element);
              const isHeader =
                element.type === "Header" || element.type === "Paragraph";
              return (
                <div key={element.id} className="space-y-0.5">
                  <p
                    className={
                      isHeader
                        ? "truncate text-[0.7rem] font-semibold"
                        : "truncate text-[0.6rem] font-medium text-[var(--form-muted-fg)]"
                    }
                  >
                    {label}
                  </p>
                  {!isHeader ? (
                    <div className="h-3.5 rounded border border-[var(--form-border)] bg-[var(--form-muted)]" />
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        {!logoAtTop ? (
          <FormLogo
            theme={theme}
            imageClassName="mt-auto h-5 w-auto max-w-[88px] object-contain"
          />
        ) : null}
      </div>
    </div>
  );
}
