import {
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type DragEvent,
  type MouseEvent,
} from "react";
import {
  AlertTriangle,
  Calendar,
  CheckSquare,
  CircleDot,
  ClipboardList,
  Copy,
  FileUp,
  GripHorizontal,
  GripVertical,
  Heading,
  Image as ImageIcon,
  LayoutTemplate,
  List,
  Mail,
  MapPin,
  Minus,
  Pencil,
  Phone,
  Plus,
  Search,
  Square,
  Table2,
  TextCursorInput,
  Trash2,
  Type,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { cn } from "@/shared/lib/utils";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import { useFormBuilder } from "../build-form/form-builder-context";
import {
  groupFormRows,
  MAX_FORM_ROW_COLUMNS,
  type FormRow,
  type RowDropEdge,
} from "../build-form/group-rows";
import {
  PALETTE_SECTIONS,
  getElementDefinition,
} from "../build-form/registry";
import { FormElementsLayout } from "../components/form-elements-layout";
import { FormLogo } from "../components/form-logo";
import { formThemeCssVars, useThemeImageSrc } from "../lib/form-theme";
import type { FormElement, FormElementType } from "../types";

const PALETTE_ICONS: Partial<
  Record<FormElementType, ComponentType<{ className?: string }>>
> = {
  Header: Heading,
  TextInput: TextCursorInput,
  LongText: Type,
  Email: Mail,
  PhoneNumber: Phone,
  RadioSingleChoice: CircleDot,
  CheckBoxMultipleChoice: CheckSquare,
  DropDown: List,
  DateInput: Calendar,
  Location: MapPin,
  Consent: Square,
  FileDropzone: FileUp,
  Table: Table2,
  NC_OFI: ClipboardList,
  RichContent: Type,
  Divider: Minus,
  Alert: AlertTriangle,
  Cover: ImageIcon,
  Conclusion: LayoutTemplate,
};

const DND_ROW = "application/x-ims-form-row";
const DND_COLUMN = "application/x-ims-form-column";

function readDragPayload(event: DragEvent, mime: string, prefix: string) {
  const plain = event.dataTransfer.getData("text/plain");
  return (
    event.dataTransfer.getData(mime) ||
    (plain.startsWith(prefix) ? plain.slice(prefix.length) : "")
  );
}

function CanvasItem({
  element,
  selected,
  busy,
  columnDragActive,
  isColumnDragOver,
  onEdit,
  onDelete,
  onColumnDragStart,
  onColumnDragEnd,
  onColumnDragOver,
  onColumnDrop,
  onRowDragOver,
  onRowDrop,
}: {
  element: FormElement;
  selected: boolean;
  busy: boolean;
  columnDragActive: boolean;
  isColumnDragOver: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onColumnDragStart: (columnId: string) => void;
  onColumnDragEnd: () => void;
  onColumnDragOver: () => void;
  onColumnDrop: (sourceColumnId: string) => void;
  onRowDragOver: (event: DragEvent) => void;
  onRowDrop: (sourceRowId: string, event: DragEvent) => void;
}) {
  const def = getElementDefinition(element.type);

  function stop(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "move";
        // Prefer React drag state over dataTransfer.types (unreliable mid-drag).
        onRowDragOver(event);
        onColumnDragOver();
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const sourceRowId = readDragPayload(event, DND_ROW, "row:");
        if (sourceRowId) {
          onRowDrop(sourceRowId, event);
          return;
        }
        const sourceColumnId = readDragPayload(event, DND_COLUMN, "column:");
        if (sourceColumnId) onColumnDrop(sourceColumnId);
      }}
      className={cn(
        "group relative h-full rounded-lg border bg-[color-mix(in_srgb,var(--form-bg)_92%,white)] p-3 shadow-sm transition-shadow",
        selected
          ? "border-[var(--form-accent)] ring-2 ring-[color-mix(in_srgb,var(--form-accent)_35%,transparent)]"
          : "border-black/10 hover:border-black/20",
        columnDragActive && "opacity-55",
        isColumnDragOver &&
          "border-[var(--form-accent)] ring-2 ring-[color-mix(in_srgb,var(--form-accent)_40%,transparent)]"
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          draggable={!busy}
          className={cn(
            "cursor-grab rounded p-0.5 text-black/40 hover:bg-black/5 hover:text-black/65 active:cursor-grabbing",
            busy && "pointer-events-none opacity-40"
          )}
          title="Drag to reorder within this row"
          aria-label="Reorder column"
          onDragStart={(event) => {
            event.stopPropagation();
            event.dataTransfer.setData(DND_COLUMN, element.id);
            event.dataTransfer.setData("text/plain", `column:${element.id}`);
            event.dataTransfer.effectAllowed = "move";
            onColumnDragStart(element.id);
          }}
          onDragEnd={onColumnDragEnd}
        >
          <GripHorizontal className="size-4" />
        </span>
        <span className="min-w-0 flex-1 text-[11px] font-medium uppercase tracking-wide text-black/45">
          {def?.label ?? element.type}
        </span>
        <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={busy}
            aria-label={`Edit ${def?.label ?? element.type}`}
            onClick={(event) => {
              stop(event);
              onEdit();
            }}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            disabled={busy}
            aria-label={`Delete ${def?.label ?? element.type}`}
            onClick={(event) => {
              stop(event);
              onDelete();
            }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
      {def ? (
        <def.Designer attributes={element.attributes} selected={selected} />
      ) : (
        <p className="text-sm opacity-70">Unknown element type</p>
      )}
    </div>
  );
}

function RowAddElementPicker({
  disabled,
  onPick,
}: {
  disabled?: boolean;
  onPick: (type: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PALETTE_SECTIONS.map((section) => ({
      ...section,
      types: section.types.filter((type) => {
        if (!q) return true;
        const def = getElementDefinition(type);
        return (
          type.toLowerCase().includes(q) ||
          (def?.label.toLowerCase().includes(q) ?? false)
        );
      }),
    })).filter((section) => section.types.length > 0);
  }, [query]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 w-8 shrink-0 rounded-full p-0"
          disabled={disabled}
          aria-label="Add element to this row"
          title="Add another field in this row"
        >
          <Plus className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="right"
        className="w-64 p-0"
      >
        <div className="border-b border-border p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 size-3.5 text-muted-foreground" />
            <input
              className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-2 text-sm"
              placeholder="Search fields…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
        <div className="max-h-72 space-y-2 overflow-y-auto p-2">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {section.title}
              </p>
              <div className="grid grid-cols-2 gap-1">
                {section.types.map((type) => {
                  const def = getElementDefinition(type);
                  if (!def) return null;
                  const Icon = PALETTE_ICONS[type] ?? Plus;
                  return (
                    <button
                      key={type}
                      type="button"
                      className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                      onClick={() => {
                        onPick(type);
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{def.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SaveStatusBadge({
  status,
}: {
  status: "idle" | "saving" | "saved" | "error";
}) {
  if (status === "idle") return null;
  const label =
    status === "saving"
      ? "Saving…"
      : status === "saved"
        ? "Saved"
        : "Save failed";
  return (
    <span
      className={cn(
        "text-xs",
        status === "error" ? "text-destructive" : "text-muted-foreground"
      )}
    >
      {label}
    </span>
  );
}

export function BuildFormPage() {
  const {
    form,
    theme,
    elements,
    selectedId,
    setSelectedId,
    selectedAttributes,
    updateSelectedAttributes,
    flushSelectedAttributes,
    saveStatus,
    preview,
    addElement,
    deleteElement,
    cloneElement,
    reorderRowColumns,
    moveFormRow,
    busy,
  } = useFormBuilder();
  const [draggingRowId, setDraggingRowId] = useState<string | null>(null);
  const [rowDropTarget, setRowDropTarget] = useState<{
    rowId: string;
    edge: RowDropEdge;
  } | null>(null);
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null);
  const [columnDropTargetId, setColumnDropTargetId] = useState<string | null>(
    null
  );
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [paletteQuery, setPaletteQuery] = useState("");
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [previewValues, setPreviewValues] = useState<Record<string, unknown>>(
    {}
  );

  const selected = elements.find((el) => el.id === selectedId) ?? null;
  const selectedDef = selected ? getElementDefinition(selected.type) : null;
  const coverSrc = useThemeImageSrc(theme.coverImage);
  const logoAtTop = theme.logoVertical !== "bottom";
  const rows = useMemo(() => groupFormRows(elements), [elements]);

  const filteredSections = useMemo(() => {
    const q = paletteQuery.trim().toLowerCase();
    return PALETTE_SECTIONS.map((section) => ({
      ...section,
      types: section.types.filter((type) => {
        if (!q) return true;
        const def = getElementDefinition(type);
        return (
          type.toLowerCase().includes(q) ||
          (def?.label.toLowerCase().includes(q) ?? false)
        );
      }),
    })).filter((section) => section.types.length > 0);
  }, [paletteQuery]);

  async function addColumnToRow(row: FormRow, type: string) {
    if (row.columns.length >= MAX_FORM_ROW_COLUMNS) {
      notify.error(`A row can have at most ${MAX_FORM_ROW_COLUMNS} columns`);
      return;
    }
    const last = row.columns[row.columns.length - 1];
    try {
      await addElement(type, {
        afterElementId: last?.id ?? null,
        parentElementId: row.id,
      });
    } catch (error) {
      notify.error(
        isApiClientError(error)
          ? error.message
          : "Could not add element to row"
      );
    }
  }

  async function moveColumnInRow(row: FormRow, sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    const ids = row.columns.map((col) => col.id);
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    try {
      await reorderRowColumns(next);
    } catch (error) {
      notify.error(
        isApiClientError(error) ? error.message : "Could not reorder columns"
      );
    }
  }

  function edgeFromPointer(event: DragEvent, rowId: string): RowDropEdge {
    const node = rowRefs.current.get(rowId);
    if (!node) return "after";
    const rect = node.getBoundingClientRect();
    return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
  }

  function updateRowDropTarget(event: DragEvent, rowId: string) {
    if (!draggingRowId || draggingRowId === rowId) {
      setRowDropTarget(null);
      return;
    }
    const edge = edgeFromPointer(event, rowId);
    setRowDropTarget((current) =>
      current?.rowId === rowId && current.edge === edge
        ? current
        : { rowId, edge }
    );
  }

  async function handleRowDrop(
    sourceRowId: string,
    targetRowId: string,
    edge: RowDropEdge
  ) {
    setDraggingRowId(null);
    setRowDropTarget(null);
    try {
      await moveFormRow(sourceRowId, targetRowId, edge);
    } catch (error) {
      notify.error(
        isApiClientError(error) ? error.message : "Could not reorder row"
      );
    }
  }

  function openProperties(elementId: string) {
    setSelectedId(elementId);
    setPropertiesOpen(true);
  }

  async function closeProperties() {
    try {
      await flushSelectedAttributes();
    } catch (error) {
      notify.error(
        isApiClientError(error) ? error.message : "Could not update element"
      );
    } finally {
      setPropertiesOpen(false);
    }
  }

  const themedPaper = (
    <div
      className="mx-auto w-full max-w-5xl overflow-hidden rounded-xl border border-black/10 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)]"
      style={formThemeCssVars(theme)}
    >
      {coverSrc ? (
        <div
          className="h-36 w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${coverSrc})` }}
        />
      ) : (
        <div
          className="h-2 w-full"
          style={{ backgroundColor: "var(--form-accent)" }}
        />
      )}
      <div className="space-y-4 p-6 sm:p-8">
        {logoAtTop ? <FormLogo theme={theme} /> : null}
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {form?.title ?? "Untitled form"}
          </h2>
          {form?.description ? (
            <p className="mt-1 text-sm opacity-75">{form.description}</p>
          ) : null}
        </div>

        {preview ? (
          elements.length === 0 ? (
            <p className="text-sm opacity-70">No elements to preview yet.</p>
          ) : (
            <FormElementsLayout
              elements={elements}
              renderElement={(el) => {
                const def = getElementDefinition(el.type);
                if (!def) return null;
                return (
                  <def.Response
                    attributes={el.attributes}
                    value={previewValues[el.id]}
                    onChange={(value) =>
                      setPreviewValues((prev) => ({
                        ...prev,
                        [el.id]: value,
                      }))
                    }
                  />
                );
              }}
            />
          )
        ) : elements.length === 0 ? (
          <div className="rounded-lg border border-dashed border-black/20 px-6 py-12 text-center">
            <LayoutTemplate className="mx-auto size-8 opacity-40" />
            <p className="mt-3 text-sm font-medium">Start building your form</p>
            <p className="mt-1 text-xs opacity-70">
              Pick an item from the right panel to add your first block.
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-4"
              disabled={busy}
              style={{
                backgroundColor: "var(--form-accent)",
                color: "#fff",
                borderColor: "transparent",
              }}
              onClick={() => {
                void addElement("Header").catch((error) =>
                  notify.error(
                    isApiClientError(error)
                      ? error.message
                      : "Could not add element"
                  )
                );
              }}
            >
              <Plus className="size-4" />
              Add header
            </Button>
          </div>
        ) : (
          <div
            className="space-y-3"
            onDragLeave={(event) => {
              if (
                event.currentTarget.contains(event.relatedTarget as Node | null)
              ) {
                return;
              }
              setRowDropTarget(null);
              setColumnDropTargetId(null);
            }}
          >
            {rows.map((row) => {
              const showBefore =
                Boolean(draggingRowId) &&
                rowDropTarget?.rowId === row.id &&
                rowDropTarget.edge === "before";
              const showAfter =
                Boolean(draggingRowId) &&
                rowDropTarget?.rowId === row.id &&
                rowDropTarget.edge === "after";

              return (
                <div key={row.id} className="relative">
                  {showBefore ? (
                    <div
                      className="pointer-events-none absolute inset-x-8 -top-1.5 z-10 h-1 rounded-full bg-[var(--form-accent)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--form-accent)_25%,transparent)]"
                      aria-hidden
                    />
                  ) : null}
                  <div
                    ref={(node) => {
                      if (node) rowRefs.current.set(row.id, node);
                      else rowRefs.current.delete(row.id);
                    }}
                    className={cn(
                      "flex items-start gap-2 rounded-lg border border-transparent p-0.5 transition-[opacity,box-shadow] duration-150",
                      draggingRowId === row.id && "opacity-45",
                      draggingRowId &&
                        draggingRowId !== row.id &&
                        rowDropTarget?.rowId === row.id &&
                        "bg-[color-mix(in_srgb,var(--form-accent)_6%,transparent)]"
                    )}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      updateRowDropTarget(event, row.id);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const sourceRowId = readDragPayload(
                        event,
                        DND_ROW,
                        "row:"
                      );
                      if (!sourceRowId) return;
                      const edge =
                        rowDropTarget?.rowId === row.id
                          ? rowDropTarget.edge
                          : edgeFromPointer(event, row.id);
                      void handleRowDrop(sourceRowId, row.id, edge);
                    }}
                  >
                    <div className="flex flex-col items-center gap-1 pt-2">
                      <div
                        role="button"
                        tabIndex={0}
                        className={cn(
                          "cursor-grab rounded-md border border-transparent p-1 text-black/40 hover:border-black/10 hover:bg-black/5 hover:text-black/70 active:cursor-grabbing",
                          busy && "pointer-events-none opacity-50",
                          draggingRowId === row.id &&
                            "border-[var(--form-accent)] bg-[color-mix(in_srgb,var(--form-accent)_12%,transparent)] text-[var(--form-accent)]"
                        )}
                        title="Drag row to reorder"
                        draggable={!busy}
                        aria-label="Reorder row"
                        onDragStart={(event) => {
                          event.dataTransfer.setData(DND_ROW, row.id);
                          event.dataTransfer.setData(
                            "text/plain",
                            `row:${row.id}`
                          );
                          event.dataTransfer.effectAllowed = "move";
                          setDraggingRowId(row.id);
                          setRowDropTarget(null);
                          const rowNode = rowRefs.current.get(row.id);
                          if (rowNode) {
                            const rect = rowNode.getBoundingClientRect();
                            event.dataTransfer.setDragImage(
                              rowNode,
                              Math.min(24, rect.width / 4),
                              Math.min(24, rect.height / 2)
                            );
                          }
                        }}
                        onDragEnd={() => {
                          setDraggingRowId(null);
                          setRowDropTarget(null);
                        }}
                      >
                        <GripVertical className="size-4" />
                      </div>
                      <RowAddElementPicker
                        disabled={
                          busy || row.columns.length >= MAX_FORM_ROW_COLUMNS
                        }
                        onPick={(type) => {
                          void addColumnToRow(row, type);
                        }}
                      />
                    </div>
                    <div
                      className="grid min-w-0 flex-1 gap-3"
                      style={{
                        gridTemplateColumns: `repeat(${row.columns.length}, minmax(0, 1fr))`,
                      }}
                    >
                      {row.columns.map((el) => (
                        <CanvasItem
                          key={el.id}
                          element={
                            selectedId === el.id && selectedAttributes
                              ? { ...el, attributes: selectedAttributes }
                              : el
                          }
                          selected={selectedId === el.id && propertiesOpen}
                          busy={busy}
                          columnDragActive={draggingColumnId === el.id}
                          isColumnDragOver={
                            Boolean(draggingColumnId) &&
                            draggingColumnId !== el.id &&
                            columnDropTargetId === el.id &&
                            row.columns.some((col) => col.id === draggingColumnId)
                          }
                          onEdit={() => openProperties(el.id)}
                          onDelete={() => {
                            void deleteElement(el.id).catch((error) =>
                              notify.error(
                                isApiClientError(error)
                                  ? error.message
                                  : "Could not delete element"
                              )
                            );
                            if (selectedId === el.id) {
                              setPropertiesOpen(false);
                            }
                          }}
                          onColumnDragStart={(columnId) => {
                            setDraggingColumnId(columnId);
                            setColumnDropTargetId(null);
                            setDraggingRowId(null);
                            setRowDropTarget(null);
                          }}
                          onColumnDragEnd={() => {
                            setDraggingColumnId(null);
                            setColumnDropTargetId(null);
                          }}
                          onColumnDragOver={() => {
                            if (!draggingColumnId || draggingColumnId === el.id) {
                              return;
                            }
                            if (
                              !row.columns.some(
                                (col) => col.id === draggingColumnId
                              )
                            ) {
                              return;
                            }
                            setColumnDropTargetId(el.id);
                          }}
                          onColumnDrop={(sourceColumnId) => {
                            setDraggingColumnId(null);
                            setColumnDropTargetId(null);
                            void moveColumnInRow(row, sourceColumnId, el.id);
                          }}
                          onRowDragOver={(event) => {
                            if (!draggingRowId) return;
                            updateRowDropTarget(event, row.id);
                          }}
                          onRowDrop={(sourceRowId, event) => {
                            const edge =
                              rowDropTarget?.rowId === row.id
                                ? rowDropTarget.edge
                                : edgeFromPointer(event, row.id);
                            void handleRowDrop(sourceRowId, row.id, edge);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  {showAfter ? (
                    <div
                      className="pointer-events-none absolute inset-x-8 -bottom-1.5 z-10 h-1 rounded-full bg-[var(--form-accent)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--form-accent)_25%,transparent)]"
                      aria-hidden
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
        {!logoAtTop ? <FormLogo theme={theme} /> : null}
      </div>
    </div>
  );

  if (preview) {
    return (
      <div className="rounded-xl bg-muted/40 px-3 py-6 sm:px-6">
        <p className="mb-4 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Preview mode
        </p>
        {themedPaper}
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]">
        <div className="min-w-0 rounded-xl bg-muted/35 px-2 py-4 sm:px-3 lg:px-4">
          {themedPaper}
        </div>

        <aside className="rounded-xl border border-border bg-card lg:sticky lg:top-4 lg:self-start">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Add items</h2>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <input
                className="w-full rounded-md border border-border bg-background py-2 pl-8 pr-2 text-sm"
                placeholder="Search fields…"
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-[calc(100vh-16rem)] space-y-4 overflow-y-auto p-4">
            {filteredSections.map((section) => (
              <div key={section.title}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.title}
                </p>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                  {section.types.map((type) => {
                    const def = getElementDefinition(type);
                    if (!def) return null;
                    const Icon = PALETTE_ICONS[type] ?? Plus;
                    const isInputElements = section.title === "Input elements";
                    return (
                      <button
                        key={type}
                        type="button"
                        disabled={busy}
                        className={
                          isInputElements
                            ? "flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2 text-center transition-colors hover:border-primary/40 hover:bg-muted/50 disabled:opacity-50"
                            : "flex flex-col items-start gap-1.5 rounded-lg border border-border bg-background px-2.5 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-muted/50 disabled:opacity-50"
                        }
                        onClick={() => {
                          void addElement(type).catch((error) =>
                            notify.error(
                              isApiClientError(error)
                                ? error.message
                                : "Could not add element"
                            )
                          );
                        }}
                      >
                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                        <span
                          className={
                            isInputElements
                              ? "text-xs font-medium leading-tight text-balance"
                              : "text-xs font-medium leading-tight"
                          }
                        >
                          {def.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <Dialog
        open={propertiesOpen && Boolean(selected && selectedDef && selectedAttributes)}
        onOpenChange={(open) => {
          if (!open) {
            void closeProperties();
          }
        }}
      >
        <DialogContent className="max-h-[min(90vh,720px)] max-w-lg overflow-hidden p-0">
          {selected && selectedDef && selectedAttributes ? (
            <>
              <DialogHeader className="border-b border-border px-5 py-4">
                <DialogTitle>Edit {selectedDef.label}</DialogTitle>
                <DialogDescription>
                  Update this block&apos;s fields. Changes save automatically.
                </DialogDescription>
                <div className="flex items-center gap-2 pt-1">
                  <SaveStatusBadge status={saveStatus} />
                </div>
              </DialogHeader>
              <div
                key={selected.id}
                className="max-h-[min(55vh,480px)] space-y-3 overflow-y-auto px-5 py-4"
                onBlur={(event) => {
                  if (
                    !event.currentTarget.contains(event.relatedTarget as Node)
                  ) {
                    void flushSelectedAttributes().catch((error) =>
                      notify.error(
                        isApiClientError(error)
                          ? error.message
                          : "Could not update element"
                      )
                    );
                  }
                }}
              >
                <selectedDef.Properties
                  attributes={selectedAttributes}
                  onChange={updateSelectedAttributes}
                />
              </div>
              <DialogFooter className="border-t border-border px-5 py-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void cloneElement(selected.id)}
                >
                  <Copy className="size-3.5" />
                  Duplicate
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    void deleteElement(selected.id)
                      .then(() => setPropertiesOpen(false))
                      .catch((error) =>
                        notify.error(
                          isApiClientError(error)
                            ? error.message
                            : "Could not delete element"
                        )
                      );
                  }}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void closeProperties()}
                >
                  Done
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
