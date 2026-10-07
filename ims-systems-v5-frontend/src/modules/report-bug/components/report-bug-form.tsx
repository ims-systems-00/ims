import { useState, type FormEvent } from "react";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { reportBugFormSchema } from "../schemas";
import {
  REPORT_BUG_CATEGORIES,
  type ReportBugCategory,
  type SubmitReportBugInput,
} from "../types";

type FieldErrors = Record<string, string>;

type ReportBugFormProps = {
  pending?: boolean;
  onSubmit: (values: SubmitReportBugInput) => Promise<void> | void;
};

/**
 * Report an issue — category, title, description (V4 parity, email-backed).
 */
export function ReportBugForm({
  pending = false,
  onSubmit,
}: ReportBugFormProps) {
  const [category, setCategory] = useState<ReportBugCategory | "">("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = reportBugFormSchema.safeParse({
      category: category || undefined,
      title,
      description,
    });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});
    await onSubmit(parsed.data);
    setCategory("");
    setTitle("");
    setDescription("");
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <FormField
        label="Category"
        htmlFor="report-bug-category"
        required
        error={fieldErrors.category}
      >
        <select
          id="report-bug-category"
          className="ims-select"
          value={category}
          disabled={pending}
          onChange={(event) =>
            setCategory(event.target.value as ReportBugCategory | "")
          }
        >
          <option value="">Select a category</option>
          {REPORT_BUG_CATEGORIES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </FormField>

      <FormField
        label="Title"
        htmlFor="report-bug-title"
        required
        error={fieldErrors.title}
      >
        <input
          id="report-bug-title"
          className="ims-field"
          value={title}
          disabled={pending}
          placeholder="Short summary of the issue"
          onChange={(event) => setTitle(event.target.value)}
        />
      </FormField>

      <FormField
        label="Description"
        htmlFor="report-bug-description"
        required
        error={fieldErrors.description}
        description="Include steps to reproduce, expected behaviour, and what actually happened."
      >
        <Textarea
          id="report-bug-description"
          className="min-h-40"
          value={description}
          disabled={pending}
          placeholder="Describe what happened…"
          onChange={(event) => setDescription(event.target.value)}
        />
      </FormField>

      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit report"}
        </Button>
      </div>
    </form>
  );
}
