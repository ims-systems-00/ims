import type { ReactNode } from "react";
import { groupFormRows } from "../build-form/group-rows";
import type { FormElement } from "../types";

type FormElementsLayoutProps = {
  elements: FormElement[];
  renderElement: (element: FormElement) => ReactNode;
  className?: string;
};

/**
 * Renders form elements in multi-column rows based on parentElementId grouping.
 */
export function FormElementsLayout({
  elements,
  renderElement,
  className = "space-y-4",
}: FormElementsLayoutProps) {
  const rows = groupFormRows(elements);
  return (
    <div className={className}>
      {rows.map((row) => (
        <div
          key={row.id}
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${row.columns.length}, minmax(0, 1fr))`,
          }}
        >
          {row.columns.map((element) => (
            <div key={element.id} className="min-w-0">
              {renderElement(element)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
