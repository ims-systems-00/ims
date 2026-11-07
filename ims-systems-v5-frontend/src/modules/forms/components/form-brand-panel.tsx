import { useEffect, useState } from "react";
import { ImageUploadControl } from "@/modules/files/components/image-upload-control";
import { Button } from "@/shared/components/ui/button";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import { useUpdateFormMutation } from "../hooks/use-forms";
import { normalizeFormTheme } from "../lib/form-theme";
import type { Form, FormTheme, FormThemeImage } from "../types";

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
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="color"
          className="h-9 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          className="w-full rounded-md border border-border px-2 py-1.5 font-mono text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </label>
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
    <div className={compact ? "space-y-4" : "space-y-5"}>
      {!compact ? (
        <div>
          <h3 className="text-sm font-semibold">Brand</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Colors, logo, and cover image applied across the builder, preview,
            and submission pages.
          </p>
        </div>
      ) : null}

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

      <div className="space-y-2">
        <p className="text-sm font-medium">Logo</p>
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
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Cover image</p>
        <ImageUploadControl
          imageUrl={theme.coverImage?.src}
          alt="Form cover"
          shape="rounded"
          tileClassName="h-20 w-full max-w-xs text-sm"
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

      <Button
        type="button"
        size="sm"
        disabled={updateMutation.isPending}
        onClick={() => void save()}
      >
        Save brand colors
      </Button>
    </div>
  );
}
