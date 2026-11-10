import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Mail } from "lucide-react";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { ImageUploadControl } from "@/modules/files/components/image-upload-control";
import { cn } from "@/shared/lib/utils";
import { notify } from "@/shared/lib/toast";
import {
  DEFAULT_THEME_COLORS,
  DEFAULT_THEME_ID,
  THEME_COLOR_FIELDS,
  deriveThemeFromPrimary,
  getThemePreset,
  isThemeId,
  isValidHexColor,
  normalizeHexColor,
  themeOptions,
  type ThemeColors,
  type ThemeId,
} from "@/shared/theme";
import { previewOrganisationEmailBranding } from "../api/organisations";
import {
  useUpdateOrganisationEmailBrandingMutation,
  useUpdateOrganisationLogoMutation,
} from "../hooks/use-organisations";
import type {
  EmailBrandingPreviewTemplateId,
  OrganisationProfile,
} from "../types";

type EmailCustomisePanelProps = {
  organisation: OrganisationProfile;
  logoUrl: string | null;
  canManage: boolean;
};

const PREVIEW_TABS: Array<{
  id: EmailBrandingPreviewTemplateId;
  label: string;
}> = [
  { id: "invitation", label: "Invitation" },
  { id: "document-shared", label: "Document" },
  { id: "campaign-wrap", label: "Campaign" },
];

function LiveEmailPreview({
  brandName,
  logoUrl,
  colors,
  enabled,
  active,
}: {
  brandName: string;
  logoUrl: string | null;
  colors: ThemeColors;
  enabled: boolean;
  active: boolean;
}) {
  const [templateId, setTemplateId] =
    useState<EmailBrandingPreviewTemplateId>("invitation");

  const previewQuery = useQuery({
    queryKey: [
      "organisations",
      "email-branding-preview",
      templateId,
      enabled,
      colors.primary,
      colors.primaryDark,
      colors.primaryLight,
      colors.primaryExtraLight,
      logoUrl,
      brandName,
    ],
    queryFn: () =>
      previewOrganisationEmailBranding({
        templateId,
        enabled,
        themeId: "custom",
        colors: enabled ? colors : null,
        logoUrl: logoUrl || null,
      }),
    staleTime: 15_000,
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {active ? "Active on org emails" : "Draft preview (save to apply)"}
        </p>
        <div className="flex flex-wrap gap-1">
          {PREVIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTemplateId(tab.id)}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-semibold transition-colors",
                templateId === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {previewQuery.isLoading ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-border bg-surface-muted/40">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : previewQuery.isError ? (
        <p className="rounded-xl border border-border bg-surface-muted/40 p-4 text-xs text-muted-foreground">
          Live preview unavailable. Your colour draft still applies after save.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-[#e8edf5]">
          <div className="border-b border-border/60 bg-white/80 px-3 py-2">
            <p className="truncate text-[11px] font-medium text-foreground">
              {previewQuery.data?.subject}
            </p>
          </div>
          <iframe
            title={`${templateId} email preview`}
            sandbox=""
            srcDoc={previewQuery.data?.html ?? ""}
            className="h-[420px] w-full bg-transparent"
          />
        </div>
      )}
    </div>
  );
}

/**
 * My Organisation → Customise Email.
 * Saved logo + colours here are the source of truth for org transactional mail.
 */
export function EmailCustomisePanel({
  organisation,
  logoUrl,
  canManage,
}: EmailCustomisePanelProps) {
  const brandingMutation = useUpdateOrganisationEmailBrandingMutation();
  const logoMutation = useUpdateOrganisationLogoMutation();

  const saved = organisation.emailBranding;
  const savedActive = Boolean(saved?.enabled && saved.colors);
  const [themeId, setThemeId] = useState<ThemeId | "custom">(
    isThemeId(saved?.themeId) ? saved!.themeId! : DEFAULT_THEME_ID
  );
  const [colors, setColors] = useState<ThemeColors>(
    saved?.colors ?? { ...DEFAULT_THEME_COLORS }
  );
  const [hexDrafts, setHexDrafts] = useState<ThemeColors>(
    saved?.colors ?? { ...DEFAULT_THEME_COLORS }
  );
  const [hexError, setHexError] = useState<string | undefined>();

  useEffect(() => {
    if (saved?.enabled && saved.colors) {
      setColors(saved.colors);
      setHexDrafts(saved.colors);
      setThemeId(isThemeId(saved.themeId) ? saved.themeId : "custom");
    } else {
      setColors({ ...DEFAULT_THEME_COLORS });
      setHexDrafts({ ...DEFAULT_THEME_COLORS });
      setThemeId(DEFAULT_THEME_ID);
    }
    setHexError(undefined);
  }, [saved?.enabled, saved?.themeId, saved?.colors]);

  const previewColors = useMemo(() => colors, [colors]);
  const busy = brandingMutation.isPending || logoMutation.isPending;

  function applyColors(next: ThemeColors, nextThemeId: ThemeId | "custom") {
    setColors(next);
    setHexDrafts(next);
    setThemeId(nextThemeId);
    setHexError(undefined);
  }

  function selectPreset(id: ThemeId) {
    applyColors({ ...getThemePreset(id).colors }, id);
  }

  function updateField(key: keyof ThemeColors, value: string) {
    const hex = normalizeHexColor(value);
    if (!hex) return;
    applyColors({ ...colors, [key]: hex }, "custom");
  }

  function handleHexInput(key: keyof ThemeColors, raw: string) {
    setHexDrafts((prev) => ({ ...prev, [key]: raw }));
    const hex = normalizeHexColor(raw);
    if (!hex) return;
    applyColors({ ...colors, [key]: hex }, "custom");
  }

  function handleHexBlur(key: keyof ThemeColors) {
    if (isValidHexColor(hexDrafts[key])) {
      updateField(key, hexDrafts[key]);
      return;
    }
    setHexDrafts((prev) => ({ ...prev, [key]: colors[key] }));
    setHexError("Enter a valid 6-digit hex colour (e.g. #0040A3)");
  }

  function generateFromPrimary() {
    const next = deriveThemeFromPrimary(colors.primary);
    if (!next) {
      setHexError("Primary colour is invalid");
      return;
    }
    applyColors(next, "custom");
  }

  async function persistBranding(next: {
    enabled: boolean;
    themeId?: string | null;
    colors?: ThemeColors | null;
  }) {
    await brandingMutation.mutateAsync(
      next.enabled
        ? {
            enabled: true,
            themeId: next.themeId ?? themeId,
            colors: next.colors ?? colors,
          }
        : {
            enabled: false,
            themeId: null,
            colors: null,
          }
    );
  }

  async function handleSave() {
    try {
      await persistBranding({
        enabled: true,
        themeId,
        colors,
      });
      notify.success(
        "Email branding saved — invitations, documents, reports and other org emails will use these colours and logo"
      );
    } catch (error) {
      notify.fromError(error, "Unable to save email branding");
    }
  }

  async function handleRevertToIms() {
    try {
      await persistBranding({ enabled: false });
      notify.success("Emails will use default iMS Systems branding");
    } catch (error) {
      notify.fromError(error, "Unable to revert email branding");
    }
  }

  return (
    <section className="ims-panel overflow-hidden">
      <div className="ims-panel-header">
        <div className="flex flex-wrap items-center gap-2">
          <Mail className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold tracking-tight">
            Customise email
          </h3>
          {savedActive ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.6875rem] font-semibold text-primary">
              Active on emails
            </span>
          ) : (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground">
              Using iMS default
            </span>
          )}
        </div>
      </div>
      <div className="grid gap-5 px-4 py-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Upload a logo and choose colours, then click{" "}
            <strong>Save email branding</strong>. That save is required —
            changing the preview alone does not update sent mail.
          </p>

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Email logo</p>
            <p className="text-xs text-muted-foreground">
              Prefer a wide PNG/JPG. After upload we also activate branding with
              your current colours so the logo appears on the next email.
            </p>
            {canManage ? (
              <ImageUploadControl
                shape="rounded"
                tileClassName="size-16 text-base"
                imageUrl={logoUrl}
                alt={`${organisation.name} email logo`}
                fallbackLabel={organisation.name.slice(0, 2).toUpperCase()}
                uploadPath="general"
                uploadLabel="Upload logo"
                changeLabel="Change logo"
                disabled={busy}
                onUploaded={async (meta, viewUrl) => {
                  await logoMutation.mutateAsync({
                    logoSrc: viewUrl,
                    logoStorage: {
                      bucket: meta.Bucket,
                      key: meta.Key || meta.key,
                      fileName: meta.Name,
                    },
                  });
                  await persistBranding({
                    enabled: true,
                    themeId,
                    colors,
                  });
                  notify.success("Logo uploaded and email branding activated");
                }}
                onRemove={async () => {
                  await logoMutation.mutateAsync({
                    logoSrc: null,
                    logoStorage: null,
                  });
                  notify.success("Email logo removed");
                }}
              />
            ) : logoUrl ? (
              <img
                src={logoUrl}
                alt={`${organisation.name} email logo`}
                className="size-16 rounded-md border border-border object-cover"
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                No logo uploaded yet — emails show a monogram + organisation
                name when branding is active.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                Colour presets
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canManage || busy}
                onClick={() => selectPreset(DEFAULT_THEME_ID)}
              >
                Reset draft to iMS blue
              </Button>
            </div>
            <ul
              className="flex flex-wrap gap-2"
              role="listbox"
              aria-label="Email colour presets"
            >
              {themeOptions.map((preset) => {
                const selected = themeId === preset.id;
                return (
                  <li key={preset.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      title={preset.label}
                      disabled={!canManage || busy}
                      onClick={() => selectPreset(preset.id)}
                      className={cn(
                        "size-9 rounded-full border-2 shadow-xs transition-[transform,box-shadow,border-color]",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        "hover:scale-105 disabled:opacity-50",
                        selected
                          ? "border-foreground ring-2 ring-ring/30"
                          : "border-white ring-1 ring-border"
                      )}
                      style={{ backgroundColor: preset.colors.primary }}
                    />
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-muted-foreground">
              {themeId === "custom"
                ? "Custom palette"
                : themeOptions.find((theme) => theme.id === themeId)?.label}
              {" · "}
              <span className="font-mono uppercase">{colors.primary}</span>
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                Brand hex colours
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!canManage || busy}
                onClick={generateFromPrimary}
              >
                Generate from primary
              </Button>
            </div>
            <div className="space-y-3 rounded-md border border-border bg-surface px-3 py-3">
              {THEME_COLOR_FIELDS.map(({ key, label }) => (
                <div key={key} className="flex items-end gap-3">
                  <FormField label={label} className="w-auto">
                    <input
                      type="color"
                      value={colors[key].toLowerCase()}
                      disabled={!canManage || busy}
                      aria-label={`${label} colour picker`}
                      className="h-9 w-12 cursor-pointer rounded-sm border border-border bg-transparent p-0.5 disabled:opacity-50"
                      onChange={(event) => updateField(key, event.target.value)}
                    />
                  </FormField>
                  <FormField
                    label="Hex"
                    className="min-w-0 flex-1"
                    error={key === "primary" ? hexError : undefined}
                  >
                    <input
                      type="text"
                      inputMode="text"
                      spellCheck={false}
                      autoComplete="off"
                      maxLength={7}
                      placeholder="#0040A3"
                      disabled={!canManage || busy}
                      aria-label={`${label} hex code`}
                      className="ims-field font-mono uppercase"
                      value={hexDrafts[key]}
                      onChange={(event) =>
                        handleHexInput(key, event.target.value)
                      }
                      onBlur={() => handleHexBlur(key)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleHexBlur(key);
                        }
                      }}
                    />
                  </FormField>
                </div>
              ))}
            </div>
          </div>

          {canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => void handleSave()}
              >
                {brandingMutation.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save email branding"
                )}
              </Button>
              {savedActive ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void handleRevertToIms()}
                >
                  Revert to iMS default
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Only Super Admin or Head of Service can change email branding.
            </p>
          )}
        </div>

        <LiveEmailPreview
          brandName={organisation.name}
          logoUrl={logoUrl}
          colors={previewColors}
          enabled={true}
          active={savedActive}
        />
      </div>
    </section>
  );
}
