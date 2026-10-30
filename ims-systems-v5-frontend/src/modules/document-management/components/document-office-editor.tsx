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

function loadDocsApi(documentServerUrl: string): Promise<void> {
  const base = documentServerUrl.replace(/\/+$/, "");
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

function safeDestroy(editor: DocsApiEditor | null) {
  if (!editor) return;
  try {
    editor.destroyEditor?.();
  } catch {
    // OnlyOffice can throw during Strict Mode remount cleanup.
  }
}

/**
 * Embeds OnlyOffice Document Server for in-preview PDF/Office editing.
 * Saves are handled server-side via the editor callback → new version.
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
    savedNotified.current = false;
    setLoading(true);
    setError(null);

    async function mount() {
      const activeSession = sessionRef.current;
      try {
        await loadDocsApi(activeSession.documentServerUrl);
        if (cancelled || !window.DocsAPI?.DocEditor) return;

        // Ensure a clean placeholder node exists (OnlyOffice replaces it).
        const host = hostRef.current;
        if (!host) {
          throw new Error("Editor host element is not ready");
        }
        host.replaceChildren();
        const placeholder = document.createElement("div");
        placeholder.id = elementId;
        placeholder.style.width = "100%";
        placeholder.style.height = "100%";
        placeholder.style.minHeight = "32rem";
        host.appendChild(placeholder);

        // Wait a frame so the placeholder is attached before DocsAPI mounts.
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
        if (cancelled) return;

        safeDestroy(editorRef.current);
        const config = {
          ...activeSession.config,
          width: "100%",
          height: "100%",
          events: {
            onDocumentStateChange: (event: { data?: boolean }) => {
              if (event.data === false && !savedNotified.current) {
                savedNotified.current = true;
                onDocumentSavedRef.current?.();
              }
            },
            onError: (event: { data?: string }) => {
              const message = event.data || "OnlyOffice editor error";
              setError(message);
              onErrorRef.current?.(message);
            },
          },
        };
        // DocsAPI expects a constructor; fall back if a non-constructable export appears.
        try {
          editorRef.current = new window.DocsAPI.DocEditor(elementId, config);
        } catch {
          const maybeFactory = window.DocsAPI.DocEditor as unknown as (
            id: string,
            cfg: typeof config
          ) => DocsApiEditor;
          editorRef.current = maybeFactory(elementId, config);
        }
        if (!cancelled) setLoading(false);
      } catch (err) {
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
      safeDestroy(editorRef.current);
      editorRef.current = null;
    };
  }, [elementId, sessionKey]);

  return (
    <div className="relative flex min-h-[32rem] flex-1 flex-col bg-white">
      {loading && !error ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-muted/30 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Opening editor…
        </div>
      ) : null}
      {error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <p className="max-w-md text-sm text-destructive">{error}</p>
          <p className="max-w-md text-[0.75rem] text-muted-foreground">
            Confirm OnlyOffice is running and reachable, then close and try
            Edit again.
          </p>
        </div>
      ) : (
        <div
          ref={hostRef}
          className="min-h-[32rem] w-full flex-1"
          aria-label="Document editor"
        />
      )}
    </div>
  );
}
