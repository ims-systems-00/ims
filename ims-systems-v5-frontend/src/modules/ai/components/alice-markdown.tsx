import type { ReactNode } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ListTodo } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

type AliceMarkdownProps = {
  children: string;
  className?: string;
  /** When set, list items show a Create task action. */
  onCreateTaskFromListItem?: (text: string) => void;
};

function extractText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (typeof node === "object" && "props" in node) {
    const element = node as { props?: { children?: ReactNode } };
    return extractText(element.props?.children);
  }
  return "";
}

export function AliceMarkdown({
  children,
  className,
  onCreateTaskFromListItem,
}: AliceMarkdownProps) {
  const components: Components = {
    h1: ({ children: c }) => (
      <h3 className="mt-4 text-base font-semibold tracking-tight first:mt-0">
        {c}
      </h3>
    ),
    h2: ({ children: c }) => (
      <h4 className="mt-3 text-sm font-semibold tracking-tight first:mt-0">
        {c}
      </h4>
    ),
    h3: ({ children: c }) => (
      <h5 className="mt-3 text-sm font-semibold first:mt-0">{c}</h5>
    ),
    h4: ({ children: c }) => (
      <h6 className="mt-2 text-sm font-medium first:mt-0">{c}</h6>
    ),
    h5: ({ children: c }) => (
      <p className="mt-2 text-sm font-medium first:mt-0">{c}</p>
    ),
    p: ({ children: c }) => (
      <p className="mt-2 text-sm leading-relaxed text-foreground first:mt-0">
        {c}
      </p>
    ),
    ul: ({ children: c }) => (
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">{c}</ul>
    ),
    ol: ({ children: c }) => (
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm">{c}</ol>
    ),
    li: ({ children: c }) => {
      const text = extractText(c).trim();
      return (
        <li className="group relative leading-relaxed">
          <span>{c}</span>
          {onCreateTaskFromListItem && text ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="ml-2 h-7 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => onCreateTaskFromListItem(text)}
            >
              <ListTodo className="size-3.5" />
              Create task
            </Button>
          ) : null}
        </li>
      );
    },
    strong: ({ children: c }) => (
      <strong className="font-semibold text-foreground">{c}</strong>
    ),
    a: ({ href, children: c }) => (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-primary underline-offset-2 hover:underline"
      >
        {c}
      </a>
    ),
    code: ({ children: c, className: codeClass }) => {
      const isBlock = Boolean(codeClass);
      if (isBlock) {
        return (
          <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 text-xs">
            <code>{c}</code>
          </pre>
        );
      }
      return (
        <code className="rounded bg-muted px-1 py-0.5 text-[0.8125rem]">
          {c}
        </code>
      );
    },
  };

  return (
    <div className={cn("alice-md text-foreground", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
