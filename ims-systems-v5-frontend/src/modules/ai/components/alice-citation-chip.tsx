import { Link } from "react-router-dom";
import type { AiChatCitation } from "../types-chat";

type AliceCitationChipProps = {
  cite: AiChatCitation;
  onPin?: (cite: AiChatCitation) => void;
};

/**
 * Clickable citation linking to a grounded IMS record.
 */
export function AliceCitationChip({ cite, onPin }: AliceCitationChipProps) {
  return (
    <span className="inline-flex max-w-full items-center gap-1">
      <Link
        to={cite.href}
        className="inline-flex max-w-full truncate rounded-full border border-primary/15 bg-primary/[0.06] px-2 py-0.5 text-[0.65rem] text-primary transition hover:bg-primary/10"
        title={cite.title}
      >
        <span className="truncate">
          {[cite.reference, cite.title].filter(Boolean).join(" — ")}
        </span>
      </Link>
      {onPin ? (
        <button
          type="button"
          className="rounded-full px-1.5 text-[0.6rem] text-muted-foreground hover:text-primary"
          onClick={() => onPin(cite)}
        >
          Pin
        </button>
      ) : null}
    </span>
  );
}
