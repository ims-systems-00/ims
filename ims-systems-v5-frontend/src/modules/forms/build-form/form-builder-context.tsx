import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Form, FormElement, FormTheme } from "../types";
import {
  useCreateFormElementMutation,
  useHardDeleteFormElementMutation,
  useReorderFormElementMutation,
  useUpdateFormElementMutation,
} from "../hooks/use-forms";
import { normalizeFormTheme } from "../lib/form-theme";
import { getElementDefinition } from "./registry";

export type AttributeSaveStatus = "idle" | "saving" | "saved" | "error";

type FormBuilderContextValue = {
  formId: string;
  form: Form | null;
  theme: FormTheme;
  elements: FormElement[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  selectedAttributes: Record<string, unknown> | null;
  updateSelectedAttributes: (next: Record<string, unknown>) => void;
  flushSelectedAttributes: () => Promise<void>;
  saveStatus: AttributeSaveStatus;
  preview: boolean;
  setPreview: (value: boolean) => void;
  brandOpen: boolean;
  setBrandOpen: (value: boolean) => void;
  addElement: (type: string, afterElementId?: string | null) => Promise<void>;
  updateElement: (
    id: string,
    attributes: Record<string, unknown>
  ) => Promise<void>;
  deleteElement: (id: string) => Promise<void>;
  cloneElement: (id: string) => Promise<void>;
  changeElementOrder: (
    id: string,
    afterElementId: string | null
  ) => Promise<void>;
  busy: boolean;
};

const FormBuilderContext = createContext<FormBuilderContextValue | null>(null);

const DEBOUNCE_MS = 400;

export function FormBuilderProvider({
  formId,
  form,
  elements,
  children,
}: {
  formId: string;
  form: Form | null;
  elements: FormElement[];
  children: ReactNode;
}) {
  const [selectedId, setSelectedIdState] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [draftAttributes, setDraftAttributes] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [saveStatus, setSaveStatus] = useState<AttributeSaveStatus>("idle");
  const draftElementIdRef = useRef<string | null>(null);
  const draftRef = useRef<Record<string, unknown> | null>(null);
  const dirtyRef = useRef(false);
  const saveGenerationRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const createMutation = useCreateFormElementMutation(formId);
  const updateMutation = useUpdateFormElementMutation(formId);
  const deleteMutation = useHardDeleteFormElementMutation(formId);
  const reorderMutation = useReorderFormElementMutation(formId);

  const theme = useMemo(
    () => normalizeFormTheme(form?.theme),
    [form?.theme]
  );

  const clearDebounce = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const persistAttributes = useCallback(
    async (
      id: string,
      attributes: Record<string, unknown>,
      generation: number
    ) => {
      setSaveStatus("saving");
      try {
        await updateMutation.mutateAsync({ id, body: { attributes } });
        // Ignore stale responses if the user kept typing.
        if (generation !== saveGenerationRef.current) return;
        dirtyRef.current = false;
        setSaveStatus("saved");
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => {
          setSaveStatus((current) => (current === "saved" ? "idle" : current));
        }, 1200);
      } catch {
        if (generation === saveGenerationRef.current) {
          setSaveStatus("error");
        }
        throw new Error("Could not update element");
      }
    },
    [updateMutation]
  );

  const flushSelectedAttributes = useCallback(async () => {
    clearDebounce();
    const id = draftElementIdRef.current;
    const attributes = draftRef.current;
    if (!id || !attributes || !dirtyRef.current) return;
    const generation = saveGenerationRef.current;
    await persistAttributes(id, attributes, generation);
  }, [clearDebounce, persistAttributes]);

  const setSelectedId = useCallback(
    (id: string | null) => {
      void (async () => {
        if (draftElementIdRef.current && dirtyRef.current) {
          try {
            await flushSelectedAttributes();
          } catch {
            // Keep selection change usable even if save failed.
          }
        }
        setSelectedIdState(id);
      })();
    },
    [flushSelectedAttributes]
  );

  useEffect(() => {
    if (!selectedId) {
      draftElementIdRef.current = null;
      draftRef.current = null;
      dirtyRef.current = false;
      setDraftAttributes(null);
      setSaveStatus("idle");
      return;
    }

    const el = elements.find((row) => row.id === selectedId);
    if (!el) {
      draftElementIdRef.current = null;
      draftRef.current = null;
      dirtyRef.current = false;
      setDraftAttributes(null);
      setSelectedIdState(null);
      return;
    }

    if (draftElementIdRef.current !== selectedId) {
      draftElementIdRef.current = selectedId;
      dirtyRef.current = false;
      draftRef.current = { ...el.attributes };
      setDraftAttributes({ ...el.attributes });
      setSaveStatus("idle");
      return;
    }

    // After a successful save, keep draft aligned with server when not dirty.
    if (!dirtyRef.current) {
      draftRef.current = { ...el.attributes };
      setDraftAttributes({ ...el.attributes });
    }
  }, [selectedId, elements]);

  useEffect(
    () => () => {
      clearDebounce();
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    },
    [clearDebounce]
  );

  const updateSelectedAttributes = useCallback(
    (next: Record<string, unknown>) => {
      if (!selectedId) return;
      dirtyRef.current = true;
      draftElementIdRef.current = selectedId;
      draftRef.current = next;
      setDraftAttributes(next);
      setSaveStatus("idle");
      clearDebounce();
      saveGenerationRef.current += 1;
      const generation = saveGenerationRef.current;
      debounceRef.current = setTimeout(() => {
        void persistAttributes(selectedId, next, generation).catch(
          () => undefined
        );
      }, DEBOUNCE_MS);
    },
    [selectedId, clearDebounce, persistAttributes]
  );

  const value = useMemo<FormBuilderContextValue>(
    () => ({
      formId,
      form,
      theme,
      elements,
      selectedId,
      setSelectedId,
      selectedAttributes: draftAttributes,
      updateSelectedAttributes,
      flushSelectedAttributes,
      saveStatus,
      preview,
      setPreview,
      brandOpen,
      setBrandOpen,
      busy:
        createMutation.isPending ||
        updateMutation.isPending ||
        deleteMutation.isPending ||
        reorderMutation.isPending,
      async addElement(type, afterElementId) {
        const def = getElementDefinition(type);
        // Default: append after the last element. Explicit null still means prepend.
        const resolvedAfterId =
          afterElementId === undefined
            ? (elements[elements.length - 1]?.id ?? null)
            : afterElementId;
        await createMutation.mutateAsync({
          type,
          attributes: def?.defaultAttributes ?? { label: type },
          afterElementId: resolvedAfterId,
        });
      },
      async updateElement(id, attributes) {
        await updateMutation.mutateAsync({ id, body: { attributes } });
      },
      async deleteElement(id) {
        clearDebounce();
        dirtyRef.current = false;
        await deleteMutation.mutateAsync(id);
        if (selectedId === id) {
          setSelectedIdState(null);
          draftElementIdRef.current = null;
          draftRef.current = null;
          setDraftAttributes(null);
        }
      },
      async cloneElement(id) {
        const source = elements.find((el) => el.id === id);
        if (!source) return;
        const attributes =
          selectedId === id && draftRef.current
            ? draftRef.current
            : source.attributes;
        await createMutation.mutateAsync({
          type: source.type,
          attributes: { ...attributes },
          afterElementId: id,
        });
      },
      async changeElementOrder(id, afterElementId) {
        await reorderMutation.mutateAsync({ id, afterElementId });
      },
    }),
    [
      formId,
      form,
      theme,
      elements,
      selectedId,
      setSelectedId,
      draftAttributes,
      updateSelectedAttributes,
      flushSelectedAttributes,
      saveStatus,
      preview,
      brandOpen,
      createMutation,
      updateMutation,
      deleteMutation,
      reorderMutation,
      clearDebounce,
    ]
  );

  return (
    <FormBuilderContext.Provider value={value}>
      {children}
    </FormBuilderContext.Provider>
  );
}

export function useFormBuilder(): FormBuilderContextValue {
  const ctx = useContext(FormBuilderContext);
  if (!ctx) {
    throw new Error("useFormBuilder must be used within FormBuilderProvider");
  }
  return ctx;
}
