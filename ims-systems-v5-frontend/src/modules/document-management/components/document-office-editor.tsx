import { useEffect, useId, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { DocumentEditorSession } from "../types";

type DocumentOfficeEditorProps = {
  session: DocumentEditorSession;
  onDocumentSaved?: () => void;
  onError?: (message: string) => void;
};

type DocsApiEditor = {
  destroyEditor?: () => void;
};

type DocsApiFactory = {
  DocEditor: new (
    id: string,
    config: DocumentEditorSession["config"] & {
      events?: {
        onDocumentStateChange?: (event: { data?: boolean }) => void;
        onError?: (event: { data?: string }) => void;
        onAppReady?: () => void;
      };
      height?: string;
      width?: string;
    }
  ) => DocsApiEditor;
};

declare global {
  interface Window {
    DocsAPI?: DocsApiFactory;
  }
}

const scriptCache = new Map<string, Promise<void>>();

/**
 * Backend may return a same-origin path (`/onlyoffice`) so production hosts
 * never bake localhost. DocsAPI needs an absolute origin in the browser.
 */
function resolveDocumentServerUrl(documentServerUrl: string): string {
  const trimmed = documentServerUrl.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) {
    return `${window.location.origin}${trimmed}`;
  }
  return trimmed;
}

function loadDocsApi(documentServerUrl: string): Promise<void> {
  const base = resolveDocumentServerUrl(documentServerUrl);
  if (!base) {
    return Promise.reject(new Error("OnlyOffice document server URL is missing"));
  }

  const existing = scriptCache.get(base);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    if (window.DocsAPI?.DocEditor) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = `${base}/web-apps/apps/api/documents/api.js`;
    script.async = true;
    script.onload = () => {
      if (window.DocsAPI?.DocEditor) resolve();
      else reject(new Error("OnlyOffice DocsAPI failed to initialise"));
    };
    script.onerror = () =>
      reject(
        new Error(
          "Unable to load OnlyOffice Document Server. Is it running on " +
            `${base}?`
        )
      );
    document.head.appendChild(script);
  });

  scriptCache.set(base, promise);
  void promise.catch(() => {
    scriptCache.delete(base);
  });
  return promise;
}

function safeDestroy(editor: DocsApiEditor | null | undefined) {
  if (!editor) return;
  try {
    editor.destroyEditor?.();
  } catch {
    // OnlyOffice can throw during Strict Mode remount cleanup.
  }
}

/**
 * OnlyOffice `onError` may pass `event.data` as a string or as
 * `{ errorCode, errorDescription }`. Never hand the raw object to React/toast.
 */
function formatOnlyOfficeError(event: unknown): string {
  if (event == null) return "OnlyOffice editor error";
  if (typeof event === "string" && event.trim()) return event;

  const record =
    event && typeof event === "object" ? (event as Record<string, unknown>) : null;
  const data = record && "data" in record ? record.data : event;

  if (typeof data === "string" && data.trim()) return data;
  if (data && typeof data === "object") {
    const body = data as Record<string, unknown>;
    const description =
      typeof body.errorDescription === "string" ? body.errorDescription : "";
    const code = body.errorCode != null ? ` (code ${String(body.errorCode)})` : "";
    if (description) return `${description}${code}`;
    try {
      return JSON.stringify(data);
    } catch {
      return "OnlyOffice editor error";
    }
  }
  return "OnlyOffice editor error";
}

/**
 * Embeds OnlyOffice Document Server for in-preview PDF/Office editing.
 * Saves are handled server-side via the editor callback → new version.
 *
 * Critical mount rule: keep a React-managed **childless** host div. DocsAPI
 * replaces a manually inserted placeholder inside it. If React also renders
 * that placeholder as a child, the next setState reconcile hits a detached
 * DOM node and can blank the whole app (removeChild / NotFoundError).
 */
export function DocumentOfficeEditor({
  session,
  onDocumentSaved,
  onError,
}: DocumentOfficeEditorProps) {
  const reactId = useId().replace(/:/g, "");
  const elementId = `onlyoffice-editor-${reactId}`;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<DocsApiEditor | null>(null);
  const wasDirty = useRef(false);
  const savedNotified = useRef(false);
  const onDocumentSavedRef = useRef(onDocumentSaved);
  const onErrorRef = useRef(onError);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  onDocumentSavedRef.current = onDocumentSaved;
  onErrorRef.current = onError;

  const sessionKey = [
    session.documentServerUrl,
    session.config.document.key,
    session.config.token,
  ].join("|");

  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    let cancelled = false;
    wasDirty.current = false;
    savedNotified.current = false;
    setLoading(true);
    setError(null);

    async function mount() {
      const activeSession = sessionRef.current;
      let created: DocsApiEditor | null = null;
      try {
        await loadDocsApi(activeSession.documentServerUrl);
        if (cancelled || !window.DocsAPI?.DocEditor) return;

        const host = hostRef.current;
        if (!host) {
          throw new Error("Editor host element is not ready");
        }

        safeDestroy(editorRef.current);
        editorRef.current = null;

        // Manual DOM only — React must not own these nodes.
        host.replaceChildren();
        const placeholder = document.createElement("div");
        placeholder.id = elementId;
        placeholder.style.width = "100%";
        placeholder.style.height = "640px";
        host.appendChild(placeholder);

        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
        if (cancelled) return;

        const config = {
          ...activeSession.config,
          width: "100%",
          height: "640px",
          events: {
            onAppReady: () => {
              if (!cancelled) setLoading(false);
            },
            onDocumentStateChange: (event: { data?: boolean }) => {
              if (event.data === true) {
                wasDirty.current = true;
                return;
              }
              // Ignore the initial "clean" pulse; only notify after a real edit+save.
              if (
                event.data === false &&
                wasDirty.current &&
                !savedNotified.current
              ) {
                savedNotified.current = true;
                onDocumentSavedRef.current?.();
              }
            },
            onError: (event: unknown) => {
              const message = formatOnlyOfficeError(event);
              setError(message);
              onErrorRef.current?.(message);
            },
          },
        };

        try {
          created = new window.DocsAPI.DocEditor(elementId, config);
        } catch {
          const maybeFactory = window.DocsAPI.DocEditor as unknown as (
            id: string,
            cfg: typeof config
          ) => DocsApiEditor;
          created = maybeFactory(elementId, config);
        }

        if (cancelled) {
          safeDestroy(created);
          return;
        }
        editorRef.current = created;
        setLoading(false);
      } catch (err) {
        safeDestroy(created);
        if (cancelled) return;
        const message =
          err instanceof Error
            ? err.message
            : "Unable to open the document editor";
        setLoading(false);
        setError(message);
        onErrorRef.current?.(message);
      }
    }

    void mount();

    return () => {
      cancelled = true;
      const current = editorRef.current;
      editorRef.current = null;
      safeDestroy(current);
      // Clear manual nodes so the next mount starts clean.
      try {
        hostRef.current?.replaceChildren();
      } catch {
        // Host may already be detached during unmount.
      }
    };
  }, [elementId, sessionKey]);

  return (
    <div className="relative flex min-h-[40rem] flex-1 flex-col bg-white">
      {loading && !error ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-muted/30 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Opening editor…
        </div>
      ) : null}
      {error ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-white p-8 text-center">
          <p className="max-w-md text-sm text-destructive">{error}</p>
          <p className="max-w-md text-[0.75rem] text-muted-foreground">
            Confirm OnlyOffice is running and reachable, then close and try
            Edit again.
          </p>
        </div>
      ) : null}
      {/* Childless host: DocsAPI owns descendants. Never put React children here. */}
      <div
        ref={hostRef}
        className="w-full flex-1"
        style={{ minHeight: 640, height: 640 }}
        aria-label="Document editor"
      />
    </div>
  );
}
