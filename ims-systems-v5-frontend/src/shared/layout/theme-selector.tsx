import { useEffect, useState } from "react";
import { Check, Palette } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { FormField } from "@/shared/components/form-field";
import { cn } from "@/shared/lib/utils";
import {
  DEFAULT_THEME_COLORS,
  THEME_COLOR_FIELDS,
  deriveThemeFromPrimary,
  isValidHexColor,
  normalizeHexColor,
  useTheme,
  type ThemeColors,
} from "@/shared/theme";

export function ThemeSelector() {
  const {
    themeId,
    colors: activeColors,
    setThemeId,
    setCustomColors,
    themes,
  } = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ThemeColors>(activeColors);
  const [hexDrafts, setHexDrafts] = useState<ThemeColors>(activeColors);
  const [hexError, setHexError] = useState<string | undefined>();

  useEffect(() => {
    if (!open) return;
    setDraft(activeColors);
    setHexDrafts(activeColors);
    setHexError(undefined);
  }, [open, activeColors]);

  function previewColors(next: ThemeColors) {
    setDraft(next);
    setHexDrafts(next);
    setCustomColors(next);
  }

  function handlePresetSelect(id: (typeof themes)[number]["id"]) {
    setHexError(undefined);
    setThemeId(id);
  }

  function updateField(key: keyof ThemeColors, value: string) {
    const hex = normalizeHexColor(value);
    if (!hex) return;
    const next = { ...draft, [key]: hex };
    previewColors(next);
  }

  function handleHexInput(key: keyof ThemeColors, raw: string) {
    setHexDrafts((prev) => ({ ...prev, [key]: raw }));
    const hex = normalizeHexColor(raw);
    if (!hex) return;
    const next = { ...draft, [key]: hex };
    setDraft(next);
    setCustomColors(next);
    setHexError(undefined);
  }

  function handleHexBlur(key: keyof ThemeColors) {
    if (isValidHexColor(hexDrafts[key])) {
      updateField(key, hexDrafts[key]);
      return;
    }
    setHexDrafts((prev) => ({ ...prev, [key]: draft[key] }));
    setHexError("Enter a valid 6-digit hex color (e.g. #0040A3)");
  }

  function generateFromPrimary() {
    const next = deriveThemeFromPrimary(draft.primary);
    if (!next) {
      setHexError("Primary colour is invalid");
      return;
    }
    setHexError(undefined);
    previewColors(next);
  }

  function resetDefault() {
    setHexError(undefined);
    setThemeId("default-blue");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Choose color theme"
        >
          <Palette className="size-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg gap-5" showClose>
        <DialogHeader>
          <DialogTitle>Colour theme</DialogTitle>
          <DialogDescription>
            Choose a template or set the four brand colours — the same model as
            V4 organisation themes. Preview applies immediately.
          </DialogDescription>
        </DialogHeader>

        <div
          className="flex h-2.5 overflow-hidden rounded-full border border-border"
          aria-hidden
        >
          {THEME_COLOR_FIELDS.map(({ key }) => (
            <span
              key={key}
              className="flex-1"
              style={{ backgroundColor: draft[key] }}
            />
          ))}
        </div>

        <section className="space-y-3" aria-label="Theme presets">
          <h3 className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Templates
          </h3>
          <ul
            className="flex flex-wrap gap-2"
            role="listbox"
            aria-label="Theme presets"
          >
            {themes.map((theme) => {
              const selected = themeId === theme.id;
              return (
                <li key={theme.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    title={theme.label}
                    aria-label={theme.label}
                    className={cn(
                      "size-9 rounded-full border-2 shadow-xs transition-[transform,box-shadow,border-color]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      "hover:scale-105",
                      selected
                        ? "border-foreground ring-2 ring-ring/30"
                        : "border-white ring-1 ring-border"
                    )}
                    style={{ backgroundColor: theme.colors.primary }}
                    onClick={() => handlePresetSelect(theme.id)}
                  />
                </li>
              );
            })}
          </ul>
          <p className="text-[0.75rem] text-muted-foreground">
            {themeId === "custom"
              ? "Custom palette"
              : themes.find((theme) => theme.id === themeId)?.label}
            {" · "}
            <span className="font-mono uppercase">{draft.primary}</span>
          </p>
        </section>

        <section className="space-y-3" aria-label="Brand colours">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Brand colours
            </h3>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={generateFromPrimary}
              >
                Generate from primary
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={resetDefault}
              >
                Reset default
              </Button>
            </div>
          </div>

          <div className="space-y-3 rounded-md border border-border bg-surface px-3 py-3">
            {THEME_COLOR_FIELDS.map(({ key, label }) => (
              <div key={key} className="flex items-end gap-3">
                <FormField label={label} className="w-auto">
                  <input
                    type="color"
                    value={draft[key].toLowerCase()}
                    aria-label={`${label} colour picker`}
                    className="h-9 w-12 cursor-pointer rounded-sm border border-border bg-transparent p-0.5"
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
            <p className="text-[0.75rem] leading-relaxed text-muted-foreground">
              Primary drives buttons and active menu items. Primary dark is the
              sidebar. Light / extra-light soft surfaces match V4.
            </p>
          </div>

          {themeId === "custom" ? (
            <p className="inline-flex items-center gap-1 text-[0.6875rem] font-medium text-primary">
              <Check className="size-3" aria-hidden />
              Custom palette active
            </p>
          ) : null}
        </section>

        <DialogFooter>
          <Button type="button" onClick={() => setOpen(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
