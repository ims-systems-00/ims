import { useMemo } from "react";
import { FormField } from "@/shared/components/form-field";
import { useTagsAndCategoriesQuery } from "../hooks/use-tags-and-categories";
import type { TagApplicableModule } from "../types";

type CategoryMultiFilterProps = {
  applicableModule: TagApplicableModule;
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  label?: string;
  /** Toolbar-friendly single select (API still receives categoryIds[]). */
  variant?: "field" | "toolbar";
};

/**
 * Category filter for list pages. Assignment remains single-value on records;
 * list filters may pass one or more ids.
 */
export function CategoryMultiFilter({
  applicableModule,
  value,
  onChange,
  disabled,
  label = "Category",
  variant = "toolbar",
}: CategoryMultiFilterProps) {
  const listQuery = useTagsAndCategoriesQuery({
    page: 1,
    pageSize: 200,
    applicableModule,
    sort: "name",
    sortDir: "asc",
  });

  const options = useMemo(
    () => listQuery.data?.items ?? [],
    [listQuery.data]
  );

  const isDisabled = disabled || listQuery.isLoading;

  if (variant === "toolbar") {
    return (
      <select
        className="ims-select ims-field-sm w-auto min-w-[10rem]"
        value={value[0] ?? ""}
        disabled={isDisabled}
        aria-label={label}
        onChange={(event) => {
          const next = event.target.value;
          onChange(next ? [next] : []);
        }}
      >
        <option value="">All categories</option>
        {options.map((tag) => (
          <option key={tag.id} value={tag.id}>
            {tag.name}
          </option>
        ))}
      </select>
    );
  }

  return (
    <FormField label={label} htmlFor={`category-filter-${applicableModule}`}>
      <select
        id={`category-filter-${applicableModule}`}
        className="ims-select min-h-[2.5rem]"
        multiple
        disabled={isDisabled}
        value={value}
        onChange={(event) => {
          const selected = Array.from(event.target.selectedOptions).map(
            (option) => option.value
          );
          onChange(selected);
        }}
        aria-label={label}
      >
        {options.map((tag) => (
          <option key={tag.id} value={tag.id}>
            {tag.name}
          </option>
        ))}
      </select>
      <p className="ims-text-meta">
        Hold Ctrl/Cmd to select multiple. Leave empty for all.
      </p>
    </FormField>
  );
}
