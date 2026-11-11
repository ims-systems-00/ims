import { useEffect, useState } from "react";
import { ImageUploadControl } from "@/modules/files/components/image-upload-control";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import { useUpdateFormMutation } from "../hooks/use-forms";
import { normalizeFormTheme } from "../lib/form-theme";
import type {
  Form,
  FormLogoHorizontal,
  FormLogoVertical,
  FormTheme,
  FormThemeImage,
} from "../types";

type FormBrandPanelProps = {
  formId: string;
  form: Form;
  compact?: boolean;
};

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          className="h-9 w-10 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-2.5 py-2 font-mono text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </label>
  );
}

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (next: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div
        className={cn(
          "grid gap-1 rounded-md border border-border bg-muted/40 p-1",
          options.length === 2 ? "grid-cols-2" : "grid-cols-3"
        )}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={cn(
              "rounded px-2 py-1.5 text-xs font-medium transition-colors",
              value === option.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function toThemeImage(
  viewUrl: string,
  meta: { Bucket: string; Key: string; Name?: string }
): FormThemeImage {
  return {
    src: viewUrl,
    storage: {
      bucket: meta.Bucket,
      key: meta.Key,
      fileName: meta.Name,
    },
  };
}

export function FormBrandPanel({
  formId,
  form,
  compact = false,
}: FormBrandPanelProps) {
  const updateMutation = useUpdateFormMutation(formId);
  const [theme, setTheme] = useState<FormTheme>(() =>
    normalizeFormTheme(form.theme)
  );

  useEffect(() => {
    setTheme(normalizeFormTheme(form.theme));
  }, [form.theme]);

  async function save(next: FormTheme = theme) {
    try {
      await updateMutation.mutateAsync({ theme: next });
      notify.success("Brand settings saved");
    } catch (error) {
      notify.error(
        isApiClientError(error) ? error.message : "Could not save brand settings"
      );
    }
  }

  function patch(partial: Partial<FormTheme>) {
    setTheme((current) => ({ ...current, ...partial }));
  }

  return (
    <div className={cn("space-y-5", compact && "space-y-4")}>
      {!compact ? (
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">Brand</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Colors, logo, and cover image applied across the builder, preview,
            and submission pages.
          </p>
        </div>
      ) : null}

      <div className="space-y-4">
        <ColorField
          label="Foreground"
          value={theme.foregroundColor}
          onChange={(foregroundColor) => patch({ foregroundColor })}
        />
        <ColorField
          label="Background"
          value={theme.backgroundColor}
          onChange={(backgroundColor) => patch({ backgroundColor })}
        />
        <ColorField
          label="Accent"
          value={theme.accentColor}
          onChange={(accentColor) => patch({ accentColor })}
        />
      </div>

      <div className="space-y-3 border-t border-border pt-5">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Logo</p>
          <p className="text-xs text-muted-foreground">
            Upload a logo and choose where it sits on the form.
          </p>
        </div>
        <ImageUploadControl
          imageUrl={theme.logo?.src}
          alt="Form logo"
          shape="rounded"
          tileClassName="size-16 text-sm"
          uploadPath="forms"
          uploadLabel="Upload logo"
          changeLabel="Change logo"
          disabled={updateMutation.isPending}
          onUploaded={async (meta, viewUrl) => {
            const logo = toThemeImage(viewUrl, meta);
            const next = { ...theme, logo };
            setTheme(next);
            await save(next);
          }}
          onRemove={async () => {
            const next = { ...theme, logo: null };
            setTheme(next);
            await save(next);
          }}
        />
        <SegmentedControl<FormLogoVertical>
          label="Logo vertical"
          value={theme.logoVertical ?? "top"}
          options={[
            { value: "top", label: "Top" },
            { value: "bottom", label: "Bottom" },
          ]}
          onChange={(logoVertical) => {
            const next = { ...theme, logoVertical };
            setTheme(next);
            void save(next);
          }}
        />
        <SegmentedControl<FormLogoHorizontal>
          label="Logo horizontal"
          value={theme.logoHorizontal ?? "left"}
          options={[
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
            { value: "right", label: "Right" },
          ]}
          onChange={(logoHorizontal) => {
            const next = { ...theme, logoHorizontal };
            setTheme(next);
            void save(next);
          }}
        />
      </div>

      <div className="space-y-3 border-t border-border pt-5">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Cover image</p>
          <p className="text-xs text-muted-foreground">
            Optional banner shown above the form content.
          </p>
        </div>
        <ImageUploadControl
          imageUrl={theme.coverImage?.src}
          alt="Form cover"
          shape="rounded"
          tileClassName="h-20 w-full max-w-full text-sm"
          uploadPath="forms"
          uploadLabel="Upload cover"
          changeLabel="Change cover"
          disabled={updateMutation.isPending}
          onUploaded={async (meta, viewUrl) => {
            const coverImage = toThemeImage(viewUrl, meta);
            const next = { ...theme, coverImage };
            setTheme(next);
            await save(next);
          }}
          onRemove={async () => {
            const next = { ...theme, coverImage: null };
            setTheme(next);
            await save(next);
          }}
        />
      </div>

      <div className="border-t border-border pt-5">
        <Button
          type="button"
          size="sm"
          className="w-full sm:w-auto"
          disabled={updateMutation.isPending}
          onClick={() => void save()}
        >
          Save brand settings
        </Button>
      </div>
    </div>
  );
}
