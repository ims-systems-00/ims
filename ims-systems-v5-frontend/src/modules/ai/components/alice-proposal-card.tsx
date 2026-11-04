import { Check, ListTodo, Sparkles, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import type { AiChatProposal } from "../types-chat";

type AliceProposalCardProps = {
  proposal: AiChatProposal;
  onConfirm: () => void;
  onDismiss: () => void;
  className?: string;
};

/**
 * Confirm/dismiss card for propose_create_task / propose_create_ofi.
 */
export function AliceProposalCard({
  proposal,
  onConfirm,
  onDismiss,
  className,
}: AliceProposalCardProps) {
  const isTask = proposal.action === "create_task";
  const title = isTask
    ? String(proposal.payload.name ?? "New task")
    : String(proposal.payload.title ?? "New OFI");
  const detail = isTask
    ? [
        proposal.payload.priority
          ? `Priority: ${String(proposal.payload.priority)}`
          : null,
        proposal.payload.dueDate
          ? `Due: ${String(proposal.payload.dueDate)}`
          : null,
        proposal.payload.notes ? String(proposal.payload.notes) : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : String(proposal.payload.description ?? "");

  return (
    <div
      className={cn(
        "mt-2.5 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] to-transparent p-3",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          {isTask ? (
            <ListTodo className="size-3.5" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground">
            {isTask ? "Create task?" : "Create OFI?"}
          </p>
          <p className="mt-0.5 truncate text-sm text-foreground/90">{title}</p>
          {detail ? (
            <p className="mt-1 line-clamp-3 text-[0.7rem] leading-relaxed text-muted-foreground">
              {detail}
            </p>
          ) : null}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              className="h-7 rounded-lg px-2.5 text-xs"
              onClick={onConfirm}
            >
              <Check className="size-3.5" />
              Confirm
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 rounded-lg px-2.5 text-xs"
              onClick={onDismiss}
            >
              <X className="size-3.5" />
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
