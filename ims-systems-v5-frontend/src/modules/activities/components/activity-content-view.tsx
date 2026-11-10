import { useEffect, useRef } from "react";
import { cn } from "@/shared/lib/utils";
import { notify } from "@/shared/lib/toast";
import { createViewUrl, downloadFile } from "@/modules/files/api/files";
import {
  isActivityValueEmpty,
  normalizeActivityHtml,
} from "../lib/activity-html";

/** Strip scripts / inline handlers from TipTap/plain HTML before read-only render. */
function sanitizeActivityHtml(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/?(script|style)[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

async function resolveMediaInRoot(root: HTMLElement): Promise<void> {
  const imgs = [
    ...root.querySelectorAll<HTMLImageElement>("img[data-bucket][data-key]"),
  ];
  await Promise.all(
    imgs.map(async (img) => {
      const bucket = img.getAttribute("data-bucket");
      const key = img.getAttribute("data-key");
      const fileName = img.getAttribute("data-name") ?? undefined;
      if (!bucket || !key) return;
      try {
        const view = await createViewUrl({ bucket, key, fileName });
        img.src = view.url;
      } catch {
        /* leave broken / empty src */
      }
    })
  );
}

type ActivityContentViewProps = {
  value: string;
  className?: string;
};

/**
 * Read-only activity body — static HTML only (no TipTap).
 */
export function ActivityContentView({
  value,
  className,
}: ActivityContentViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const html = sanitizeActivityHtml(normalizeActivityHtml(value));

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    void resolveMediaInRoot(root);
  }, [html]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    async function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a[data-bucket][data-key]") as
        | HTMLAnchorElement
        | null;
      if (!anchor) return;
      event.preventDefault();
      event.stopPropagation();
      const bucket = anchor.getAttribute("data-bucket");
      const key = anchor.getAttribute("data-key");
      const fileName = anchor.getAttribute("data-name") ?? "attachment";
      if (!bucket || !key) return;
      try {
        await downloadFile({
          Bucket: bucket,
          Key: key,
          key,
          Name: fileName,
        });
      } catch (error) {
        notify.fromError(error, "Could not download attachment");
      }
    }

    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, []);

  if (isActivityValueEmpty(value) || !html) {
    return <p className={cn("text-sm text-muted-foreground", className)}>—</p>;
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "activity-rich-view activity-editor-prose text-sm leading-relaxed",
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
