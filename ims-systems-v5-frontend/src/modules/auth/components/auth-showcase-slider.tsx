import { useEffect, useState } from "react";
import { cn } from "@/shared/lib/utils";
import dashboardImage from "@/assets/images/dashboard.png";
import risksImage from "@/assets/images/risks-management.png";
import documentsImage from "@/assets/images/document-management.png";
import complianceImage from "@/assets/images/compliance-module.png";

type ShowcaseSlide = {
  id: string;
  src: string;
  title: string;
  description: string;
  alt: string;
};

const SLIDES: ShowcaseSlide[] = [
  {
    id: "dashboard",
    src: dashboardImage,
    title: "Live operational overview",
    description:
      "See risks, incidents, and activity in one place so leaders stay ahead of issues.",
    alt: "iMS live dashboard with charts and organisation overview",
  },
  {
    id: "risks",
    src: risksImage,
    title: "Structured risk management",
    description:
      "Capture, score, and track risks with clear ownership across your organisation.",
    alt: "iMS risk management module listing and filters",
  },
  {
    id: "documents",
    src: documentsImage,
    title: "Document control that sticks",
    description:
      "Repositories, reviews, and controlled documents without the spreadsheet chase.",
    alt: "iMS document management repositories and files",
  },
  {
    id: "compliance",
    src: complianceImage,
    title: "Compliance in one toolkit",
    description:
      "Evidence, obligations, and follow-ups stay linked to the work your teams already do.",
    alt: "iMS compliance toolkit overview",
  },
];

const INTERVAL_MS = 5000;

/**
 * Auto-advancing product screenshot panel for auth entry pages.
 */
export function AuthShowcaseSlider() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [paused]);

  const active = SLIDES[index]!;

  return (
    <div
      className="relative flex h-full min-h-[28rem] flex-col overflow-hidden rounded-[1.75rem] bg-surface-muted p-6 md:p-8 lg:p-10"
      style={{
        backgroundImage:
          "linear-gradient(160deg, color-mix(in oklch, var(--primary) 14%, var(--background)) 0%, var(--surface-muted) 42%, var(--background) 100%)",
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, color-mix(in oklch, var(--foreground) 18%, transparent) 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
        aria-hidden
      />

      <div className="relative z-[1] max-w-lg space-y-2">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-primary">
          Inside iMS
        </p>
        <div className="relative min-h-[4.5rem]">
          {SLIDES.map((slide, slideIndex) => (
            <div
              key={slide.id}
              className={cn(
                "absolute inset-x-0 top-0 space-y-2 transition-all duration-500 ease-out",
                slideIndex === index
                  ? "translate-y-0 opacity-100"
                  : "translate-y-2 opacity-0"
              )}
              aria-hidden={slideIndex !== index}
            >
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-[1.75rem]">
                {slide.title}
              </h2>
              <p className="text-[0.9375rem] leading-relaxed text-muted-foreground">
                {slide.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-[1] mt-8 flex flex-1 items-end justify-center">
        <div className="relative w-full max-w-3xl">
          {SLIDES.map((slide, slideIndex) => (
            <div
              key={slide.id}
              className={cn(
                "transition-all duration-700 ease-out",
                slideIndex === index
                  ? "relative translate-y-0 opacity-100"
                  : "pointer-events-none absolute inset-x-0 bottom-0 translate-y-4 opacity-0"
              )}
              aria-hidden={slideIndex !== index}
            >
              <div className="overflow-hidden rounded-2xl border border-border/70 bg-background shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)]">
                <img
                  src={slide.src}
                  alt={slide.alt}
                  className="block h-auto w-full object-cover object-top"
                  draggable={false}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className="relative z-[1] mt-6 flex items-center justify-center gap-2"
        role="tablist"
        aria-label="Product screenshots"
      >
        {SLIDES.map((slide, slideIndex) => (
          <button
            key={slide.id}
            type="button"
            role="tab"
            aria-selected={slideIndex === index}
            aria-label={`Show ${slide.title}`}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              slideIndex === index
                ? "w-6 bg-primary"
                : "w-2 bg-foreground/20 hover:bg-foreground/35"
            )}
            onClick={() => setIndex(slideIndex)}
          />
        ))}
      </div>

      <p className="sr-only" aria-live="polite">
        {active.title}
      </p>
    </div>
  );
}
