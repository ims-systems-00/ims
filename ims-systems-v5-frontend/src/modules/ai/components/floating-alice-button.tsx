import aliceIcon from "@/assets/images/Type=Icon Dark BG.png";
import { cn } from "@/shared/lib/utils";
import { useAliceChatStore } from "../store/use-alice-chat-store";

type FloatingAliceButtonProps = {
  className?: string;
};

/**
 * Fixed bottom-right FAB that opens the in-app Alice chatbot.
 */
export function FloatingAliceButton({ className }: FloatingAliceButtonProps) {
  const open = useAliceChatStore((s) => s.open);
  const toggleChat = useAliceChatStore((s) => s.toggleChat);

  return (
    <button
      type="button"
      aria-label={open ? "Close Alice chat" : "Open Alice chat"}
      title="Alice AI"
      className={cn(
        "fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center overflow-hidden rounded-full",
        "bg-foreground shadow-[0_10px_28px_rgb(0_0_0_/0.18)] ring-2 ring-background",
        "transition-transform duration-300 ease-out hover:scale-105 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        !open && "animate-[ims-alice-fab-pulse_2.8s_ease-in-out_infinite]",
        open && "scale-95 ring-primary/40",
        className
      )}
      onClick={() => toggleChat()}
    >
      <img
        src={aliceIcon}
        alt=""
        className="size-14 object-cover"
        width={56}
        height={56}
      />
    </button>
  );
}
