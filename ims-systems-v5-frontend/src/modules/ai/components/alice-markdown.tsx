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

/**
 * Alice Markdown renderer — constrained to the chat bubble width.
 */
export function AliceMarkdown({
  children,
  className,
  onCreateTaskFromListItem,
}: AliceMarkdownProps) {
  const components: Components = {
    h1: ({ children: c }) => (
      <h3 className="mt-3 break-words text-[0.95rem] font-semibold tracking-tight first:mt-0">
        {c}
      </h3>
    ),
    h2: ({ children: c }) => (
      <h4 className="mt-2.5 break-words text-sm font-semibold tracking-tight first:mt-0">
        {c}
      </h4>
    ),
    h3: ({ children: c }) => (
      <h5 className="mt-2 break-words text-sm font-semibold first:mt-0">{c}</h5>
    ),
    h4: ({ children: c }) => (
      <h6 className="mt-2 break-words text-sm font-medium first:mt-0">{c}</h6>
    ),
    h5: ({ children: c }) => (
      <p className="mt-2 break-words text-sm font-medium first:mt-0">{c}</p>
    ),
    p: ({ children: c }) => (
      <p className="mt-2 break-words text-[0.8125rem] leading-relaxed text-foreground first:mt-0">
        {c}
      </p>
    ),
    ul: ({ children: c }) => (
      <ul className="mt-2 list-disc space-y-1.5 break-words pl-4 text-[0.8125rem]">
        {c}
      </ul>
    ),
    ol: ({ children: c }) => (
      <ol className="mt-2 list-decimal space-y-1.5 break-words pl-4 text-[0.8125rem]">
        {c}
      </ol>
    ),
    li: ({ children: c }) => {
      const text = extractText(c).trim();
      return (
        <li className="break-words leading-relaxed">
          <div className="min-w-0">{c}</div>
          {onCreateTaskFromListItem && text ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="mt-1 h-7 px-2 text-[0.7rem] text-muted-foreground hover:text-foreground"
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
        className="break-all font-medium text-primary underline-offset-2 hover:underline"
      >
        {c}
      </a>
    ),
    table: ({ children: c }) => (
      <div className="mt-2 max-w-full overflow-x-auto rounded-md border border-border-subtle">
        <table className="w-full min-w-0 border-collapse text-left text-[0.75rem]">
          {c}
        </table>
      </div>
    ),
    thead: ({ children: c }) => <thead className="bg-muted/60">{c}</thead>,
    th: ({ children: c }) => (
      <th className="break-words px-2 py-1.5 font-semibold">{c}</th>
    ),
    td: ({ children: c }) => (
      <td className="break-words border-t border-border-subtle px-2 py-1.5 align-top">
        {c}
      </td>
    ),
    pre: ({ children: c }) => (
      <pre className="mt-2 max-w-full overflow-x-auto rounded-md bg-muted/80 p-2.5 text-[0.7rem] leading-relaxed">
        {c}
      </pre>
    ),
    code: ({ children: c, className: codeClass }) => {
      const isBlock = Boolean(codeClass);
      if (isBlock) {
        return <code className="whitespace-pre font-mono">{c}</code>;
      }
      return (
        <code className="break-all rounded bg-muted px-1 py-0.5 font-mono text-[0.75rem]">
          {c}
        </code>
      );
    },
    blockquote: ({ children: c }) => (
      <blockquote className="mt-2 border-l-2 border-border pl-3 text-[0.8125rem] text-muted-foreground">
        {c}
      </blockquote>
    ),
    hr: () => <hr className="my-3 border-border-subtle" />,
  };

  return (
    <div
      className={cn(
        "alice-md min-w-0 max-w-full overflow-x-hidden break-words [overflow-wrap:anywhere]",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
