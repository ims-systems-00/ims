import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { Check, GripVertical, X } from "lucide-react";
import aliceIcon from "@/assets/images/Type=Icon Dark BG.png";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { getSetupStep } from "../catalog";
import { useSetupGuideStore } from "../store";

const PANEL_WIDTH_PX = 360;
const MARGIN_PX = 16;
const DRAG_THRESHOLD_PX = 4;

type PanelPosition = { left: number; top: number };

function defaultPosition(): PanelPosition {
  if (typeof window === "undefined") {
    return { left: MARGIN_PX, top: MARGIN_PX };
  }
  const width = Math.min(PANEL_WIDTH_PX, window.innerWidth - MARGIN_PX * 2);
  return {
    left: Math.max(MARGIN_PX, window.innerWidth - width - MARGIN_PX),
    top: Math.max(MARGIN_PX, window.innerHeight - 420),
  };
}

function clampPosition(
  left: number,
  top: number,
  panelWidth: number,
  panelHeight: number
): PanelPosition {
  const maxLeft = Math.max(
    MARGIN_PX,
    window.innerWidth - panelWidth - MARGIN_PX
  );
  const maxTop = Math.max(
    MARGIN_PX,
    window.innerHeight - panelHeight - MARGIN_PX
  );
  return {
    left: Math.min(Math.max(MARGIN_PX, left), maxLeft),
    top: Math.min(Math.max(MARGIN_PX, top), maxTop),
  };
}

/**
 * Bottom-right coach panel in Alice's voice — setupux `.guide` pattern.
 * Drag the header grip to move it anywhere on screen.
 */
export function SetupGuidePanel() {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
    moved: boolean;
  } | null>(null);

  const activeStepId = useSetupGuideStore((s) => s.activeStepId);
  const subIndex = useSetupGuideStore((s) => s.subIndex);
  const aliceAssistOpen = useSetupGuideStore((s) => s.aliceAssistOpen);
  const closeGuide = useSetupGuideStore((s) => s.closeGuide);
  const advanceSub = useSetupGuideStore((s) => s.advanceSub);
  const openAliceAssist = useSetupGuideStore((s) => s.openAliceAssist);
  const showChecklist = useSetupGuideStore((s) => s.showChecklist);

  const [position, setPosition] = useState<PanelPosition>(defaultPosition);
  const [dragging, setDragging] = useState(false);

  const step = activeStepId ? getSetupStep(activeStepId) : undefined;
  const sub = step?.guide.subs[subIndex];

  useEffect(() => {
    if (!step || !sub?.route) return;
    navigate(sub.route);
  }, [navigate, step, sub?.route, subIndex]);

  // Re-clamp after resize / when the panel remounts for a new step.
  useEffect(() => {
    if (!step) return;
    function onResize() {
      const el = panelRef.current;
      if (!el) return;
      const box = el.getBoundingClientRect();
      setPosition((current) =>
        clampPosition(current.left, current.top, box.width, box.height)
      );
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [step?.id]);

  function onDragPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    // Don't start a drag from interactive controls inside the header.
    if (
      event.target instanceof Element &&
      event.target.closest("button, a, input, textarea, select")
    ) {
      return;
    }
    const el = panelRef.current;
    if (!el) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originLeft: position.left,
      originTop: position.top,
      moved: false,
    };
    el.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function onDragPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    drag.moved = true;
    const el = panelRef.current;
    const width = el?.offsetWidth ?? PANEL_WIDTH_PX;
    const height = el?.offsetHeight ?? 360;
    setPosition(
      clampPosition(drag.originLeft + dx, drag.originTop + dy, width, height)
    );
  }

  function onDragPointerUp(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
  }

  if (!step) return null;

  const progress = ((subIndex + 1) / step.guide.subs.length) * 100;
  const isLast = subIndex >= step.guide.subs.length - 1;
  // Stay mounted (keeps drag position) but leave the stage while Alice's sheet
  // is open — otherwise this z-70 panel and the spotlight sit on top of it.
  const paused = aliceAssistOpen;

  return (
    <aside
      ref={panelRef}
      data-guide-layer=""
      data-setup-guide-panel=""
      aria-label="Setup guide"
      aria-hidden={paused || undefined}
      className={cn(
        "fixed z-[70] w-[min(22.5rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-[hsl(222_47%_11%)] text-white shadow-2xl",
        dragging ? "cursor-grabbing select-none" : null,
        paused && "pointer-events-none invisible"
      )}
      style={{
        left: position.left,
        top: position.top,
        right: "auto",
        bottom: "auto",
      }}
    >
      <div
        className={cn(
          "flex items-start gap-2 rounded-t-2xl px-4 pt-3.5 pb-2",
          "touch-none cursor-grab active:cursor-grabbing",
          dragging && "cursor-grabbing"
        )}
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerUp}
        onPointerCancel={onDragPointerUp}
        title="Drag to move"
      >
        <GripVertical
          className="mt-2 size-4 shrink-0 text-white/45"
          aria-hidden
        />
        <img
          src={aliceIcon}
          alt=""
          className="size-9 shrink-0 rounded-full object-cover ring-2 ring-white/20 pointer-events-none"
          width={36}
          height={36}
          draggable={false}
        />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-primary">
            Step · {step.title}
          </p>
          <p className="text-sm font-semibold leading-snug">{step.title}</p>
        </div>
        <button
          type="button"
          aria-label="Close setup guide"
          className="-mr-1 -mt-1 inline-flex size-7 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
          onClick={() => {
            closeGuide();
            showChecklist();
          }}
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <div className="px-4 pb-4">
        <p className="mb-3 text-[0.8125rem] leading-relaxed text-white/75">
          {step.guide.text}
        </p>

        <ul className="mb-3 space-y-1.5 text-[0.8125rem]">
          {step.guide.subs.map((item, index) => {
            const done = index < subIndex;
            const current = index === subIndex;
            return (
              <li
                key={item.label}
                className={cn(
                  "flex items-start gap-2",
                  done && "text-white/45 line-through",
                  current && "font-medium text-white",
                  !done && !current && "text-white/55"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 inline-flex size-3.5 shrink-0 items-center justify-center rounded-full border",
                    done &&
                      "border-emerald-400 bg-emerald-400 text-[hsl(222_47%_11%)]",
                    current && "border-white bg-white",
                    !done && !current && "border-white/40"
                  )}
                  aria-hidden
                >
                  {done ? <Check className="size-2.5" strokeWidth={3} /> : null}
                </span>
                <span>{item.label}</span>
              </li>
            );
          })}
        </ul>

        <div
          className="mb-3 h-1 overflow-hidden rounded-full bg-white/15"
          aria-hidden
        >
          <i
            className="block h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {step.aliceCapable ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="bg-white text-pink-700 hover:bg-white/90"
              onClick={() => openAliceAssist()}
            >
              Ask Alice
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-white/80 hover:bg-white/10 hover:text-white"
            onClick={() => {
              closeGuide();
              showChecklist();
            }}
          >
            Skip
          </Button>
          <Button
            type="button"
            size="sm"
            className="ml-auto"
            onClick={() => {
              if (isLast) {
                // Leave without trapping the user; org still completes on create.
                closeGuide();
                showChecklist();
                return;
              }
              advanceSub();
            }}
          >
            {isLast ? "Done" : "Next"}
          </Button>
        </div>
      </div>
    </aside>
  );
}
