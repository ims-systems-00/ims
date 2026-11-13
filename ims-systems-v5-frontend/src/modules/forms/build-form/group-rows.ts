import type { FormElement } from "../types";

export const MAX_FORM_ROW_COLUMNS = 4;

export type FormRow = {
  /** Leader (first column) element id. */
  id: string;
  columns: FormElement[];
};

/**
 * Group a document-ordered element list into layout rows.
 * Leader = parentElementId null (or orphaned parent). Following siblings
 * with parentElementId === leader.id are extra columns in the same row.
 */
export function groupFormRows(elements: FormElement[]): FormRow[] {
  const ids = new Set(elements.map((el) => el.id));
  const rows: FormRow[] = [];
  let index = 0;

  while (index < elements.length) {
    const leader = elements[index]!;
    const parentId = leader.parentElementId;
    const isLeader = !parentId || !ids.has(parentId);

    if (!isLeader) {
      // Orphaned child mid-list — treat as its own row so nothing is lost.
      rows.push({ id: leader.id, columns: [leader] });
      index += 1;
      continue;
    }

    const columns: FormElement[] = [leader];
    let cursor = index + 1;
    while (
      cursor < elements.length &&
      elements[cursor]!.parentElementId === leader.id
    ) {
      columns.push(elements[cursor]!);
      cursor += 1;
    }
    rows.push({ id: leader.id, columns });
    index = cursor;
  }

  return rows;
}

export function flatIndexOfElement(
  elements: FormElement[],
  elementId: string
): number {
  return elements.findIndex((el) => el.id === elementId);
}

export type RowDropEdge = "before" | "after";

/**
 * Return a new document-ordered element list with `sourceRowId` moved
 * before/after `targetRowId`. Returns the original array when the move
 * is a no-op.
 */
export function reorderFormRows(
  elements: FormElement[],
  sourceRowId: string,
  targetRowId: string,
  edge: RowDropEdge
): FormElement[] {
  if (sourceRowId === targetRowId) return elements;
  const rows = groupFormRows(elements);
  const source = rows.find((row) => row.id === sourceRowId);
  if (!source) return elements;

  const without = rows.filter((row) => row.id !== sourceRowId);
  let insertAt = without.findIndex((row) => row.id === targetRowId);
  if (insertAt < 0) return elements;
  if (edge === "after") insertAt += 1;

  without.splice(insertAt, 0, source);
  const next = without.flatMap((row) => row.columns);
  if (
    next.length === elements.length &&
    next.every((el, index) => el.id === elements[index]?.id)
  ) {
    return elements;
  }
  return next;
}

/** Reorder column ids within a single row; returns new flat element list. */
export function reorderColumnsInElements(
  elements: FormElement[],
  orderedColumnIds: string[]
): FormElement[] {
  if (orderedColumnIds.length === 0) return elements;
  const idSet = new Set(orderedColumnIds);
  const byId = new Map(elements.map((el) => [el.id, el]));
  const orderedColumns = orderedColumnIds
    .map((id) => byId.get(id))
    .filter((el): el is FormElement => Boolean(el));
  if (orderedColumns.length !== orderedColumnIds.length) return elements;

  const leaderId = orderedColumnIds[0]!;
  const remapped = orderedColumns.map((el, index) => ({
    ...el,
    parentElementId: index === 0 ? null : leaderId,
  }));

  const result: FormElement[] = [];
  let inserted = false;
  for (const el of elements) {
    if (!idSet.has(el.id)) {
      result.push(el);
      continue;
    }
    if (!inserted) {
      result.push(...remapped);
      inserted = true;
    }
  }
  return result;
}
