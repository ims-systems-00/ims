import {
  useMemo,
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
import { cn } from "@/shared/lib/utils";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import { useFormBuilder } from "../build-form/form-builder-context";
import {
  PALETTE_SECTIONS,
  getElementDefinition,
} from "../build-form/registry";
import { FormLogo } from "../components/form-logo";
import { formThemeCssVars, themeImageSrc } from "../lib/form-theme";
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

function CanvasItem({
  element,
  selected,
  busy,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  element: FormElement;
  selected: boolean;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver: (event: DragEvent) => void;
  onDrop: () => void;
}) {
  const def = getElementDefinition(element.type);

  function stop(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
      className={cn(
        "group relative rounded-lg border bg-[color-mix(in_srgb,var(--form-bg)_92%,white)] p-3 shadow-sm transition-shadow",
        selected
          ? "border-[var(--form-accent)] ring-2 ring-[color-mix(in_srgb,var(--form-accent)_35%,transparent)]"
          : "border-black/10 hover:border-black/20"
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="cursor-grab text-black/40">
          <GripVertical className="size-4" />
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
    changeElementOrder,
    busy,
  } = useFormBuilder();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [previewValues, setPreviewValues] = useState<Record<string, unknown>>(
    {}
  );

  const selected = elements.find((el) => el.id === selectedId) ?? null;
  const selectedDef = selected ? getElementDefinition(selected.type) : null;
  const coverSrc = themeImageSrc(theme.coverImage);
  const logoAtTop = theme.logoVertical !== "bottom";

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

  async function moveToIndex(sourceId: string, targetIndex: number) {
    const currentIndex = elements.findIndex((el) => el.id === sourceId);
    if (currentIndex === targetIndex) return;
    let afterId: string | null;
    if (targetIndex > currentIndex) {
      afterId = elements[targetIndex]?.id ?? null;
    } else if (targetIndex === 0) {
      afterId = null;
    } else {
      afterId = elements[targetIndex - 1]?.id ?? null;
      if (afterId === sourceId) {
        afterId = elements[targetIndex - 2]?.id ?? null;
      }
    }
    try {
      await changeElementOrder(sourceId, afterId);
    } catch (error) {
      notify.error(
        isApiClientError(error) ? error.message : "Could not reorder element"
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
      className="mx-auto w-full max-w-2xl overflow-hidden rounded-xl border border-black/10 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)]"
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
          <div className="space-y-4">
            {elements.length === 0 ? (
              <p className="text-sm opacity-70">No elements to preview yet.</p>
            ) : (
              elements.map((el) => {
                const def = getElementDefinition(el.type);
                if (!def) return null;
                return (
                  <div key={el.id}>
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
                  </div>
                );
              })
            )}
          </div>
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
          <div className="space-y-3">
            {elements.map((el, index) => (
              <CanvasItem
                key={el.id}
                element={
                  selectedId === el.id && selectedAttributes
                    ? { ...el, attributes: selectedAttributes }
                    : el
                }
                selected={selectedId === el.id && propertiesOpen}
                busy={busy}
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
                onDragStart={() => setDraggingId(el.id)}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={() => {
                  if (!draggingId || draggingId === el.id) return;
                  void moveToIndex(draggingId, index);
                  setDraggingId(null);
                }}
              />
            ))}
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
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 rounded-xl bg-muted/35 px-2 py-4 sm:px-4">
          {themedPaper}
        </div>

        <aside className="rounded-xl border border-border bg-card lg:sticky lg:top-4 lg:self-start">
          <div className="border-b border-border px-3 py-3">
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
          <div className="max-h-[calc(100vh-16rem)] space-y-4 overflow-y-auto p-3">
            {filteredSections.map((section) => (
              <div key={section.title}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.title}
                </p>
                <div className="grid grid-cols-2 gap-2">
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
