import { useMemo, useState, type FormEvent } from "react";
import { Loader2, Plus } from "lucide-react";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import {
  useCreateTagAndCategoryMutation,
  useTagsAndCategoriesQuery,
} from "../hooks/use-tags-and-categories";
import { createTagAndCategoryFormSchema } from "../schemas";
import type { TagApplicableModule } from "../types";
import { APPLICABLE_MODULE_LABELS } from "../types";

type CategorySelectFieldProps = {
  /** Module context for filtering selectable labels. */
  applicableModule: TagApplicableModule;
  value?: string;
  onChange: (next: string | undefined) => void;
  disabled?: boolean;
  error?: string;
  label?: string;
  /** Pre-select this module when creating inline (UX improvement over V4). */
  preselectModuleOnCreate?: boolean;
  className?: string;
};

/**
 * Single-select category assignment + inline create popover.
 */
export function CategorySelectField({
  applicableModule,
  value,
  onChange,
  disabled,
  error,
  label = "Category",
  preselectModuleOnCreate = true,
  className,
}: CategorySelectFieldProps) {
  const [openCreate, setOpenCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();

  const listQuery = useTagsAndCategoriesQuery({
    page: 1,
    pageSize: 200,
    applicableModule,
    sort: "name",
    sortDir: "asc",
  });
  const createMutation = useCreateTagAndCategoryMutation();

  const options = useMemo(
    () => listQuery.data?.items ?? [],
    [listQuery.data]
  );

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    const parsed = createTagAndCategoryFormSchema.safeParse({
      name,
      description,
      applicableModules: preselectModuleOnCreate
        ? [applicableModule]
        : [applicableModule],
    });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Invalid category");
      return;
    }
    setFieldError(undefined);
    try {
      const created = await createMutation.mutateAsync({
        name: parsed.data.name,
        description: parsed.data.description,
        applicableModules: parsed.data.applicableModules,
      });
      notify.success("New tag added.");
      onChange(created.id);
      setName("");
      setDescription("");
      setOpenCreate(false);
    } catch (err) {
      notify.fromError(err, "Failed to add category");
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <FormField label={label} htmlFor={`category-${applicableModule}`} error={error}>
        <div className="flex gap-2">
          <select
            id={`category-${applicableModule}`}
            className="ims-select flex-1"
            value={value ?? ""}
            disabled={disabled || listQuery.isLoading}
            onChange={(event) =>
              onChange(event.target.value ? event.target.value : undefined)
            }
          >
            <option value="">Not selected</option>
            {options.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            aria-expanded={openCreate}
            aria-label="Create a new category"
            onClick={() => setOpenCreate((current) => !current)}
          >
            <Plus className="size-3.5" aria-hidden />
            Add
          </Button>
        </div>
      </FormField>

      {openCreate ? (
        <form
          className="space-y-3 rounded-md border border-border-subtle bg-surface-muted/40 p-3"
          onSubmit={(event) => void handleCreate(event)}
        >
          <p className="text-[0.75rem] text-muted-foreground">
            Missing a category? Create a new one for{" "}
            <span className="font-medium text-foreground">
              {APPLICABLE_MODULE_LABELS[applicableModule]}
            </span>
            .
          </p>
          <FormField label="Name" htmlFor="inline-cat-name" required error={fieldError}>
            <input
              id="inline-cat-name"
              className="ims-field"
              value={name}
              disabled={createMutation.isPending}
              onChange={(event) => setName(event.target.value)}
            />
          </FormField>
          <FormField label="Description" htmlFor="inline-cat-desc" required>
            <Textarea
              id="inline-cat-desc"
              rows={2}
              value={description}
              disabled={createMutation.isPending}
              onChange={(event) => setDescription(event.target.value)}
            />
          </FormField>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Adding…
                </>
              ) : (
                "Add category"
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={createMutation.isPending}
              onClick={() => setOpenCreate(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
