import { useEffect, useState } from "react";
import { measureSpotlight, type SpotlightTarget } from "../lib/spotlight";

type SetupSpotlightProps = {
  selector?: string;
  label?: string;
  labelAbove?: boolean;
  active: boolean;
};

/**
 * Fixed-position highlight with a page dim — setupux `.spot` pattern.
 * Pointer-events none so the real control stays clickable.
 */
export function SetupSpotlight({
  selector,
  label,
  labelAbove = false,
  active,
}: SetupSpotlightProps) {
  const [target, setTarget] = useState<SpotlightTarget | null>(null);

  useEffect(() => {
    if (!active || !selector) {
      setTarget(null);
      return;
    }

    function refresh() {
      setTarget(measureSpotlight(selector, label, labelAbove));
    }

    refresh();
    const timer = window.setInterval(refresh, 200);
    window.addEventListener("resize", refresh);
    window.addEventListener("scroll", refresh, true);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("resize", refresh);
      window.removeEventListener("scroll", refresh, true);
    };
  }, [active, label, labelAbove, selector]);

  if (!active || !target) return null;

  const { rect } = target;
  // Do NOT set data-guide-layer here — that CSS forces pointer-events:auto and
  // would block clicks on the highlighted Create control underneath.
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-[60] rounded-xl border-2 border-primary transition-[top,left,width,height] duration-300 ease-out"
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        boxShadow:
          "0 0 0 9999px rgba(7, 10, 24, 0.45), 0 0 0 6px color-mix(in oklab, var(--primary) 30%, transparent)",
      }}
    >
      {target.label ? (
        <span
          className="pointer-events-none absolute left-0 whitespace-nowrap rounded-md bg-primary px-2.5 py-1.5 text-[0.75rem] font-semibold text-primary-foreground"
          style={
            target.labelAbove
              ? { bottom: "calc(100% + 10px)" }
              : { top: "calc(100% + 10px)" }
          }
        >
          {target.label}
        </span>
      ) : null}
    </div>
  );
}
