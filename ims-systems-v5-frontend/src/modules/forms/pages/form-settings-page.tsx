import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import { FormBrandPanel } from "../components/form-brand-panel";
import { useFormQuery, useUpdateFormMutation } from "../hooks/use-forms";

export function FormSettingsPage() {
  const { formId = "" } = useParams();
  const formQuery = useFormQuery(formId);
  const updateMutation = useUpdateFormMutation(formId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!formQuery.data) return;
    setTitle(formQuery.data.title);
    setDescription(formQuery.data.description ?? "");
  }, [formQuery.data]);

  async function save() {
    try {
      await updateMutation.mutateAsync({
        title: title.trim() || formQuery.data?.title,
        description: description.trim() || null,
      });
      notify.success("Settings saved");
    } catch (error) {
      notify.error(
        isApiClientError(error) ? error.message : "Could not save settings"
      );
    }
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-4 lg:grid-cols-2">
      <div className="space-y-4 rounded-lg border border-border bg-card p-5">
        <div>
          <h2 className="text-base font-semibold">Form settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Basic metadata for this form.
          </p>
        </div>
        <label className="block text-sm font-medium">
          Title
          <input
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium">
          Description
          <textarea
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <Button
          type="button"
          disabled={updateMutation.isPending}
          onClick={() => void save()}
        >
          Save
        </Button>
      </div>

      {formQuery.data ? (
        <div className="rounded-lg border border-border bg-card p-5">
          <FormBrandPanel formId={formId} form={formQuery.data} />
        </div>
      ) : null}
    </div>
  );
}
