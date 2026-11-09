import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import aliceIcon from "@/assets/images/Type=Icon Dark BG.png";
import { cn } from "@/shared/lib/utils";
import { useAliceChatStore } from "../store/use-alice-chat-store";
import {
  ALICE_FAB_SIZE,
  ALICE_FLOAT_Z_INDEX,
  clampFabPosition,
  defaultFabPosition,
  useAliceFloatLayoutStore,
} from "../store/use-alice-float-layout-store";

type FloatingAliceButtonProps = {
  className?: string;
};

const DRAG_THRESHOLD_PX = 6;

/**
 * Draggable FAB that opens the general org-wide Alice chat.
 */
export function FloatingAliceButton({ className }: FloatingAliceButtonProps) {
  const surface = useAliceChatStore((s) => s.surface);
  const open = surface === "float";
  const toggleFloat = useAliceChatStore((s) => s.toggleFloat);
  const fab = useAliceFloatLayoutStore((s) => s.fab);
  const setFab = useAliceFloatLayoutStore((s) => s.setFab);

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  const position = fab ?? defaultFabPosition();

  useEffect(() => {
    function onResize() {
      const current = useAliceFloatLayoutStore.getState().fab;
      if (!current) return;
      setFab(clampFabPosition(current.x, current.y));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [setFab]);

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    const origin = fab ?? defaultFabPosition();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: origin.x,
      originY: origin.y,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (
      !drag.moved &&
      Math.hypot(dx, dy) < DRAG_THRESHOLD_PX
    ) {
      return;
    }
    drag.moved = true;
    setFab(
      clampFabPosition(drag.originX + dx, drag.originY + dy)
    );
  }

  function endPointer(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const moved = drag.moved;
    dragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
    if (!moved) {
      toggleFloat();
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <button
      type="button"
      aria-label={open ? "Close Alice chat" : "Open Alice org-wide chat"}
      title="Alice AI — drag to move, click to open"
      className={cn(
        "pointer-events-auto fixed flex items-center justify-center overflow-hidden rounded-full",
        "bg-foreground shadow-[0_10px_28px_rgb(0_0_0_/0.18)] ring-2 ring-background",
        "transition-transform duration-200 ease-out hover:scale-105 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "touch-none cursor-grab active:cursor-grabbing",
        !open && "animate-[ims-alice-fab-pulse_2.8s_ease-in-out_infinite]",
        open && "scale-95 ring-primary/40",
        className
      )}
      style={{
        zIndex: ALICE_FLOAT_Z_INDEX,
        pointerEvents: "auto",
        width: ALICE_FAB_SIZE,
        height: ALICE_FAB_SIZE,
        left: position.x,
        top: position.y,
        right: "auto",
        bottom: "auto",
      }}
      data-alice-float="fab"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
    >
      <img
        src={aliceIcon}
        alt=""
        className="size-14 object-cover pointer-events-none"
        width={56}
        height={56}
        draggable={false}
      />
    </button>,
    document.body
  );
}
