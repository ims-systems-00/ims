import { useId } from "react";
import type { TooltipRenderProps } from "react-joyride";
import { Check, Lock, RotateCcw, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { isStepLocked } from "../lib/gating";
import type { GuideStepData } from "../lib/to-joyride-steps";
import { useSetupGuideStore } from "../store";
import type { GuideChapterRef, GuideStep } from "../types";

function eyebrowFor(step: GuideStep): string {
  if (step.kind === "outro") return `${step.tourTitle} · Complete`;
  const chapter = `Chapter ${step.chapterIndex + 1} of ${step.chapterCount}`;
  if (step.kind === "chapter") return `${step.tourTitle} · ${chapter}`;
  return `${chapter} · ${step.chapterName}`;
}

function progressFor(step: GuideStep): string | null {
  if (step.kind === "outro") return null;
  if (step.kind === "chapter") {
    return step.pointCount === 1 ? "1 point" : `${step.pointCount} points`;
  }
  return `Point ${step.pointNumber} of ${step.pointCount}`;
}

/**
 * The guide card React Joyride renders next to the highlighted control (or
 * centred, for chapter introductions, the outro and missing controls).
 *
 * Layout follows the journey demo: chapter chips, an eyebrow, a numbered
 * point with a short title and description, then Back / Next.
 */
export function SetupGuideTooltip({
  controls,
  index,
  step,
  tooltipProps,
}: TooltipRenderProps) {
  const titleId = useId();
  const { step: guide, chapters, missing } = step.data as GuideStepData;

  const completedEvents = useSetupGuideStore((s) => s.completedEvents);
  const exitTour = useSetupGuideStore((s) => s.exitTour);
  const finishTour = useSetupGuideStore((s) => s.finishTour);
  const openPicker = useSetupGuideStore((s) => s.openPicker);

  const locked = isStepLocked(guide, completedEvents, missing);
  const isOutro = guide.kind === "outro";
  const isPoint = guide.kind === "explain" || guide.kind === "action";
  const wide = !isPoint || missing;
  const progress = progressFor(guide);

  return (
    <div
      {...tooltipProps}
      aria-labelledby={titleId}
      data-guide-layer=""
      data-setup-guide-card={missing ? "missing" : guide.kind}
      data-setup-guide-step={guide.id}
      // Keep keyboard focus where it is (often inside a modal sheet, which
      // would otherwise pull it straight back) while still receiving clicks.
      onMouseDown={(event) => event.preventDefault()}
      className={cn(
        "rounded-lg border border-border bg-surface-elevated text-left text-foreground shadow-xl",
        wide
          ? "w-[min(28rem,calc(100vw-2rem))]"
          : "w-[min(22rem,calc(100vw-2rem))]"
      )}
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-3.5">
        <p className="pt-1 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-primary">
          {eyebrowFor(guide)}
        </p>
        <button
          type="button"
          aria-label="Exit setup guide"
          title="Exit setup guide (Esc)"
          onClick={exitTour}
          className="-mr-1.5 -mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <ChapterChips
        chapters={chapters}
        currentIndex={guide.chapterIndex}
        onJump={(stepIndex) => controls.go(stepIndex)}
      />

      <div className="px-4 pt-3">
        <div className="flex items-start gap-2.5">
          {isPoint ? (
            <span
              aria-hidden
              className="mt-px inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
            >
              {guide.pointNumber}
            </span>
          ) : null}
          <h2
            id={titleId}
            className={cn(
              "font-semibold tracking-[-0.015em]",
              isPoint ? "text-[0.9375rem] leading-6" : "text-lg leading-snug"
            )}
          >
            {guide.title}
          </h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {guide.body}
        </p>

        {missing ? (
          <div
            role="status"
            className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[0.8125rem] leading-relaxed text-foreground"
          >
            <p className="font-medium">
              This part of the screen is not available right now.
            </p>
            {guide.missingHint ? (
              <p className="mt-0.5 text-muted-foreground">
                {guide.missingHint}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => controls.go(index)}
              className="mt-1.5 inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
            >
              <RotateCcw className="size-3" aria-hidden />
              Try again
            </button>
          </div>
        ) : null}

        {guide.kind === "action" && !missing ? (
          <p
            role="status"
            className="mt-3 flex items-center gap-2.5 rounded-md bg-primary/10 px-3 py-2 text-[0.8125rem] font-medium text-foreground"
          >
            <span
              aria-hidden
              className="ims-guide-dot inline-block size-2 shrink-0 rounded-full bg-primary"
            />
            <span>
              <span className="text-primary">Your turn.</span>{" "}
              {guide.actionHint ?? "Do this in the app to continue."}
            </span>
          </p>
        ) : null}

        {guide.kind === "chapter" && index === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Use ← → to move between points, Esc to leave. The highlighted
            control is the real one — you can use it.
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle px-4 py-3">
        <span className="text-xs tabular-nums text-muted-foreground">
          {progress}
        </span>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isOutro ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => controls.go(0)}
              >
                Watch again
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  finishTour();
                  openPicker();
                }}
              >
                Another module
              </Button>
              <Button
                type="button"
                size="sm"
                data-action="primary"
                onClick={finishTour}
              >
                Finish
              </Button>
            </>
          ) : (
            <>
              {index > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-action="back"
                  onClick={() => controls.prev()}
                >
                  Back
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                data-action="primary"
                disabled={locked}
                title={
                  locked ? "Complete the highlighted action first" : undefined
                }
                onClick={() => controls.next()}
              >
                {locked ? <Lock aria-hidden /> : null}
                {index === 0 ? "Start" : "Next"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ChapterChips({
  chapters,
  currentIndex,
  onJump,
}: {
  chapters: GuideChapterRef[];
  currentIndex: number;
  onJump: (stepIndex: number) => void;
}) {
  return (
    <ol
      aria-label="Chapters"
      className="mt-2 flex flex-wrap items-center gap-1.5 px-4"
    >
      {chapters.map((chapter, chapterIndex) => {
        const done = chapterIndex < currentIndex;
        const current = chapterIndex === currentIndex;
        return (
          <li key={chapter.id}>
            <button
              type="button"
              aria-current={current ? "step" : undefined}
              aria-label={`Chapter ${chapterIndex + 1}: ${chapter.name}${done ? " (done)" : ""}`}
              title={chapter.name}
              onClick={() => onJump(chapter.firstStepIndex)}
              className={cn(
                "inline-flex h-6 items-center gap-1.5 rounded-full border px-1 text-[0.6875rem] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                current
                  ? "border-primary bg-primary/10 pr-2.5 text-foreground"
                  : "border-border-subtle text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "inline-flex size-4 items-center justify-center rounded-full text-[0.625rem] font-semibold",
                  current || done
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {done ? (
                  <Check className="size-2.5" aria-hidden />
                ) : (
                  chapterIndex + 1
                )}
              </span>
              {current ? chapter.name : null}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
