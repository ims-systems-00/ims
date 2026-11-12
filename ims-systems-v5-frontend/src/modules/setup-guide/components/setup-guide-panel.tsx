import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X } from "lucide-react";
import aliceIcon from "@/assets/images/Type=Icon Dark BG.png";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { getSetupStep } from "../catalog";
import { useSetupGuideStore } from "../store";

const SHEET_OPEN_SELECTOR =
  '.ims-sheet-content-right[data-state="open"], [data-slot="sheet-content"][data-state="open"]';

/**
 * True while a right-side app drawer/sheet is open in the DOM
 * (module create/edit sheets and Alice assist).
 */
function useRightDrawerOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function sync() {
      setOpen(Boolean(document.querySelector(SHEET_OPEN_SELECTOR)));
    }
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state", "class"],
    });
    return () => observer.disconnect();
  }, []);

  return open;
}

/**
 * Coach panel in Alice's voice — docked bottom-right; slides to bottom-left
 * when a right drawer is open (setupux `.guide` / `.main.dopen` pattern).
 */
export function SetupGuidePanel() {
  const navigate = useNavigate();
  const drawerOpen = useRightDrawerOpen();

  const activeStepId = useSetupGuideStore((s) => s.activeStepId);
  const subIndex = useSetupGuideStore((s) => s.subIndex);
  const closeGuide = useSetupGuideStore((s) => s.closeGuide);
  const advanceSub = useSetupGuideStore((s) => s.advanceSub);
  const openAliceAssist = useSetupGuideStore((s) => s.openAliceAssist);
  const showChecklist = useSetupGuideStore((s) => s.showChecklist);

  const step = activeStepId ? getSetupStep(activeStepId) : undefined;
  const sub = step?.guide.subs[subIndex];

  useEffect(() => {
    // Seeded subs navigate via useSetupSeed — don't fight that with a static route.
    if (!step || !sub?.route || sub.seed) return;
    navigate(sub.route);
  }, [navigate, step, sub?.route, sub?.seed, subIndex]);

  if (!step) return null;

  const progress = ((subIndex + 1) / step.guide.subs.length) * 100;
  const isLast = subIndex >= step.guide.subs.length - 1;

  return (
    <aside
      data-guide-layer=""
      data-setup-guide-panel=""
      aria-label="Setup guide"
      className={cn(
        "fixed z-[70] w-[min(22.5rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-[hsl(222_47%_11%)] text-white shadow-2xl",
        "bottom-4 transition-[left,right] duration-300 ease-out",
        drawerOpen ? "left-4 right-auto" : "right-4 left-auto"
      )}
    >
      <div className="flex items-start gap-2 rounded-t-2xl px-4 pt-3.5 pb-2">
        <img
          src={aliceIcon}
          alt=""
          className="size-9 shrink-0 rounded-full object-cover ring-2 ring-white/20"
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
