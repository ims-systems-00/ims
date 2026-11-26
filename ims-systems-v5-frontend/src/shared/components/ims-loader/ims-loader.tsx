import { cn } from "@/shared/lib/utils";
import "./ims-loader.css";

const NODES: ReadonlyArray<readonly [number, number]> = [
  [0, -94],
  [-81.41, 47],
  [81.41, 47],
];

/** "OS" letterforms from the iMS OS mark, centred on the core. */
const OS_PATH =
  "M39.2 1.2Q29 1.2 21.2 -3.4Q13.4 -8 9 -16.15Q4.6 -24.3 4.6 -35Q4.6 -45.7 9 -53.85Q13.4 -62 21.2 -66.6Q29 -71.2 39.2 -71.2Q49.5 -71.2 57.3 -66.6Q65.1 -62 69.45 -53.85Q73.8 -45.7 73.8 -35Q73.8 -24.3 69.45 -16.15Q65.1 -8 57.3 -3.4Q49.5 1.2 39.2 1.2ZM39.2 -10.9Q45.6 -10.9 50.25 -13.85Q54.9 -16.8 57.5 -22.2Q60.1 -27.6 60.1 -35Q60.1 -42.5 57.5 -47.85Q54.9 -53.2 50.25 -56.1Q45.6 -59 39.2 -59Q32.9 -59 28.2 -56.1Q23.5 -53.2 20.9 -47.85Q18.3 -42.5 18.3 -35Q18.3 -27.6 20.9 -22.2Q23.5 -16.8 28.2 -13.85Q32.9 -10.9 39.2 -10.9Z M109.4 1.2Q101.8 1.2 95.85 -1.4Q89.9 -4 86.45 -9Q83 -14 82.9 -21.1H97.2Q97.3 -18 98.8 -15.5Q100.3 -13 102.95 -11.55Q105.6 -10.1 109.3 -10.1Q112.5 -10.1 114.85 -11.15Q117.2 -12.2 118.5 -14.1Q119.8 -16 119.8 -18.6Q119.8 -21.6 118.35 -23.6Q116.9 -25.6 114.35 -27Q111.8 -28.4 108.45 -29.55Q105.1 -30.7 101.4 -32Q93.1 -34.7 88.75 -39.2Q84.4 -43.7 84.4 -51.1Q84.4 -57.4 87.45 -61.9Q90.5 -66.4 95.9 -68.8Q101.3 -71.2 108.2 -71.2Q115.3 -71.2 120.65 -68.75Q126 -66.3 129.15 -61.7Q132.3 -57.1 132.4 -50.9H118Q117.9 -53.2 116.65 -55.25Q115.4 -57.3 113.2 -58.55Q111 -59.8 108 -59.8Q105.4 -59.9 103.25 -59Q101.1 -58.1 99.85 -56.35Q98.6 -54.6 98.6 -52Q98.6 -49.5 99.85 -47.8Q101.1 -46.1 103.3 -44.85Q105.5 -43.6 108.5 -42.55Q111.5 -41.5 115 -40.4Q120.2 -38.6 124.6 -36.15Q129 -33.7 131.6 -29.8Q134.2 -25.9 134.2 -19.5Q134.2 -14 131.3 -9.3Q128.4 -4.6 122.95 -1.7Q117.5 1.2 109.4 1.2Z";

const SIZES = {
  xs: "size-5",
  sm: "size-8",
  md: "size-14",
  lg: "size-20",
} as const;

export type ImsLoaderSize = keyof typeof SIZES;

type ImsLoaderProps = {
  size?: ImsLoaderSize;
  className?: string;
};

/**
 * Animated iMS OS mark used as the app's loading indicator.
 * Decorative: wrap it (or use PageLoader) to announce loading to AT.
 */
export function ImsLoader({ size = "md", className }: ImsLoaderProps) {
  return (
    <svg
      viewBox="-122 -122 244 244"
      className={cn("ims-loader shrink-0", SIZES[size], className)}
      aria-hidden
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g className="ims-loader-orbit">
        <circle r="94" fill="none" stroke="#343a7a" strokeWidth="1.8" />
        {NODES.map(([cx, cy]) => (
          <g key={`${cx},${cy}`}>
            <circle
              className="ims-loader-node-halo"
              cx={cx}
              cy={cy}
              r="13"
              fill="#8c7dff"
              opacity=".22"
            />
            <circle cx={cx} cy={cy} r="7.5" fill="#8c7dff" />
          </g>
        ))}
      </g>
      <g className="ims-loader-ring">
        <circle r="70" fill="none" stroke="#4a44c8" strokeWidth="1.8" />
        <circle
          r="70"
          fill="none"
          stroke="#8c7dff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="64 376"
        />
      </g>
      <g className="ims-loader-core">
        <circle r="44" fill="#121535" stroke="#4f39f6" strokeWidth="5" />
        <path
          transform="scale(0.3858) translate(-69.4,35)"
          d={OS_PATH}
          fill="#f0eeff"
        />
      </g>
    </svg>
  );
}

type PageLoaderProps = {
  /** Visible + announced text, e.g. "Loading risks…". */
  label?: string;
  /** Fill the viewport (session/workspace boot) instead of the content area. */
  fullScreen?: boolean;
  /** Inline row (small mark beside the text) for sheets and sub-sections. */
  compact?: boolean;
  size?: ImsLoaderSize;
  className?: string;
};

/**
 * Centred loading state for pages and main panels.
 */
export function PageLoader({
  label = "Loading…",
  fullScreen = false,
  compact = false,
  size,
  className,
}: PageLoaderProps) {
  if (compact) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "ims-page-loader flex items-center gap-2.5 py-2 text-sm text-muted-foreground",
          className
        )}
      >
        <ImsLoader size={size ?? "sm"} />
        <span>{label}</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "ims-page-loader flex flex-col items-center justify-center gap-3 text-center text-[0.8125rem] text-muted-foreground",
        fullScreen ? "min-h-dvh bg-background px-4" : "min-h-48 py-12",
        className
      )}
    >
      <ImsLoader size={size ?? (fullScreen ? "lg" : "md")} />
      <span>{label}</span>
    </div>
  );
}
