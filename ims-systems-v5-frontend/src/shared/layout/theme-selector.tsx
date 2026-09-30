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
import { isValidHexColor, normalizeHexColor, useTheme } from "@/shared/theme";

export function ThemeSelector() {
  const { themeId, customHex, setThemeId, setCustomHex, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const [hexInput, setHexInput] = useState(customHex);
  const [hexError, setHexError] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      setHexInput(customHex);
      setHexError(undefined);
    }
  }, [open, customHex]);

  function handlePresetSelect(id: (typeof themes)[number]["id"]) {
    setThemeId(id);
    setHexError(undefined);
  }

  function applyCustomFromInput(raw: string) {
    const normalized = normalizeHexColor(raw);
    if (!normalized) {
      setHexError("Enter a valid 6-digit hex color (e.g. #2563EB)");
      return false;
    }
    setHexError(undefined);
    setHexInput(normalized);
    return setCustomHex(normalized);
  }

  function handleColorPickerChange(value: string) {
    const normalized = normalizeHexColor(value);
    if (!normalized) return;
    setHexInput(normalized);
    setHexError(undefined);
    setCustomHex(normalized);
  }

  const pickerValue = normalizeHexColor(hexInput) ?? customHex;

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
          <DialogTitle>Color theme</DialogTitle>
          <DialogDescription>
            Choose a preset template or set a custom brand color. The
            application identity updates immediately.
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-3" aria-label="Theme presets">
          <h3 className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Presets
          </h3>
          <ul
            className="grid grid-cols-2 gap-2 sm:grid-cols-3"
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
                    className={cn(
                      "flex h-full w-full flex-col gap-2 rounded-md border px-3 py-2.5 text-left transition-[border-color,background-color,box-shadow]",
                      "hover:border-ring/40 hover:bg-accent/40",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected
                        ? "border-primary/50 bg-accent/60 ring-1 ring-primary/25"
                        : "border-border bg-surface"
                    )}
                    onClick={() => handlePresetSelect(theme.id)}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span
                        className="size-5 shrink-0 rounded-sm border border-border shadow-xs"
                        style={{ backgroundColor: theme.swatch }}
                        aria-hidden
                      />
                      {selected ? (
                        <Check
                          className="size-3.5 text-primary"
                          aria-hidden
                        />
                      ) : null}
                    </span>
                    <span>
                      <span className="block text-[0.8125rem] font-medium tracking-tight">
                        {theme.label}
                      </span>
                      <span className="mt-0.5 block text-[0.6875rem] leading-snug text-muted-foreground">
                        {theme.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="space-y-3" aria-label="Custom color">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Custom color
            </h3>
            {themeId === "custom" ? (
              <span className="inline-flex items-center gap-1 text-[0.6875rem] font-medium text-primary">
                <Check className="size-3" aria-hidden />
                Active
              </span>
            ) : null}
          </div>

          <div className="rounded-md border border-border bg-surface px-3 py-3">
            <div className="flex flex-wrap items-end gap-3">
              <FormField label="Color" className="w-auto">
                <input
                  type="color"
                  value={pickerValue.toLowerCase()}
                  aria-label="Pick brand color"
                  className="h-9 w-12 cursor-pointer rounded-sm border border-border bg-transparent p-0.5"
                  onChange={(event) =>
                    handleColorPickerChange(event.target.value)
                  }
                />
              </FormField>

              <FormField
                label="Hex"
                className="min-w-[9rem] flex-1"
                error={hexError}
              >
                <input
                  type="text"
                  inputMode="text"
                  spellCheck={false}
                  autoComplete="off"
                  placeholder="#2563EB"
                  aria-label="Brand color hex code"
                  className="ims-field font-mono uppercase"
                  value={hexInput}
                  onChange={(event) => {
                    setHexInput(event.target.value);
                    if (hexError) setHexError(undefined);
                  }}
                  onBlur={() => {
                    if (!hexInput.trim()) {
                      setHexInput(customHex);
                      return;
                    }
                    if (isValidHexColor(hexInput)) {
                      applyCustomFromInput(hexInput);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      applyCustomFromInput(hexInput);
                    }
                  }}
                />
              </FormField>

              <Button
                type="button"
                variant="outline"
                className="mb-0.5"
                onClick={() => applyCustomFromInput(hexInput)}
              >
                Apply
              </Button>
            </div>

            <p className="mt-2.5 text-[0.75rem] leading-relaxed text-muted-foreground">
              Uses your hex as the primary brand color and derives sidebar,
              accent, and focus tones from it.
            </p>
          </div>
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
