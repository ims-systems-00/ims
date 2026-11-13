import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import {
  useFormElementsQuery,
  useFormQuery,
  useFormSubmissionQuery,
  useFormSubmissionsQuery,
} from "../hooks/use-forms";
import { getElementDefinition } from "../build-form/registry";
import { FormElementsLayout } from "../components/form-elements-layout";
import { FormLogo } from "../components/form-logo";
import {
  formThemeCssVars,
  normalizeFormTheme,
  useThemeImageSrc,
} from "../lib/form-theme";

export function FormResponsePage() {
  const { formId = "" } = useParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const formQuery = useFormQuery(formId);
  const elementsQuery = useFormElementsQuery(formId);
  const listQuery = useFormSubmissionsQuery(formId, { page: 1, pageSize: 50 });
  const detailQuery = useFormSubmissionQuery(
    formId,
    selectedId ?? undefined
  );
  const theme = useMemo(
    () => normalizeFormTheme(formQuery.data?.theme),
    [formQuery.data?.theme]
  );
  const coverSrc = useThemeImageSrc(theme.coverImage);
  const logoAtTop = theme.logoVertical !== "bottom";

  const items = listQuery.data?.items ?? [];

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-lg border border-border bg-card p-3">
        <h2 className="mb-2 text-sm font-semibold">Submissions</h2>
        {listQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No submissions yet.</p>
        ) : (
          <ul className="space-y-1">
            {items.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className={`w-full rounded-md px-2 py-2 text-left text-sm ${
                    selectedId === row.id
                      ? "bg-primary/10 text-foreground"
                      : "hover:bg-muted/60"
                  }`}
                  onClick={() => setSelectedId(row.id)}
                >
                  <div className="font-medium">
                    {new Date(row.createdAt).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    by{" "}
                    {row.submittedByUser?.name?.trim() ||
                      row.submittedByUser?.email?.trim() ||
                      "Unknown user"}
                    {row.submittedByUser?.email
                      ? ` · ${row.submittedByUser.email}`
                      : ""}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="rounded-lg border border-border bg-card p-4">
        {!selectedId ? (
          <EmptyState
            title="Select a submission"
            description="Choose a submission on the left to review answers."
          />
        ) : detailQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading responses…
          </div>
        ) : !detailQuery.data ? (
          <EmptyState title="Submission not found" />
        ) : (
          <div
            className="overflow-hidden rounded-lg border border-black/10"
            style={formThemeCssVars(theme)}
          >
            {coverSrc ? (
              <div
                className="h-24 w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${coverSrc})` }}
              />
            ) : null}
            <div className="space-y-4 p-4">
              {logoAtTop ? (
                <FormLogo
                  theme={theme}
                  imageClassName="h-8 w-auto max-w-[140px] object-contain"
                />
              ) : null}
              <div className="rounded-md bg-black/5 px-3 py-2 text-sm">
                <p className="font-medium">
                  {detailQuery.data.submittedByUser?.name?.trim() ||
                    detailQuery.data.submittedByUser?.email?.trim() ||
                    "Unknown user"}
                </p>
                {detailQuery.data.submittedByUser?.email ? (
                  <p className="text-xs opacity-70">
                    {detailQuery.data.submittedByUser.email}
                  </p>
                ) : null}
                <p className="mt-1 text-xs opacity-70">
                  Submitted {new Date(detailQuery.data.createdAt).toLocaleString()}
                </p>
              </div>
              {(elementsQuery.data?.length ?? 0) > 0 ? (
                <FormElementsLayout
                  elements={elementsQuery.data ?? []}
                  renderElement={(el) => {
                    const response = detailQuery.data.responses.find(
                      (row) => row.formElementId === el.id
                    );
                    const def = getElementDefinition(el.type);
                    if (!def) {
                      return (
                        <pre className="overflow-x-auto rounded bg-black/5 p-2 text-xs">
                          {JSON.stringify(
                            response?.responseValue ?? null,
                            null,
                            2
                          )}
                        </pre>
                      );
                    }
                    return (
                      <def.Response
                        attributes={el.attributes}
                        value={response?.responseValue}
                        onChange={() => undefined}
                        disabled
                      />
                    );
                  }}
                />
              ) : (
                detailQuery.data.responses.map((row) => {
                  const type = row.element?.type ?? "TextInput";
                  const def = getElementDefinition(type);
                  if (!def) {
                    return (
                      <pre
                        key={row.id}
                        className="overflow-x-auto rounded bg-black/5 p-2 text-xs"
                      >
                        {JSON.stringify(row.responseValue, null, 2)}
                      </pre>
                    );
                  }
                  return (
                    <div key={row.id}>
                      <def.Response
                        attributes={row.element?.attributes ?? {}}
                        value={row.responseValue}
                        onChange={() => undefined}
                        disabled
                      />
                    </div>
                  );
                })
              )}
              {!logoAtTop ? (
                <FormLogo
                  theme={theme}
                  imageClassName="h-8 w-auto max-w-[140px] object-contain"
                />
              ) : null}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
