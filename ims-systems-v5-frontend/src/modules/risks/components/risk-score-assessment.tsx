import { cn } from "@/shared/lib/utils";
import type { RiskScoreBand, RiskScorePair } from "../types";

/**
 * Compact likelihood × consequence assessment display.
 * Preview total uses the same formula as the backend (L × C); persisted
 * totals from the API remain authoritative after save.
 */
export function RiskScoreAssessment({
  score,
  band,
  label = "Current score",
  className,
}: {
  score: RiskScorePair;
  band?: RiskScoreBand;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="ims-text-label">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
            {score.total}
            {band ? (
              <span className="ml-2 text-sm font-medium capitalize text-muted-foreground">
                {band}
              </span>
            ) : null}
          </p>
        </div>
        <p className="ims-text-meta tabular-nums">
          Likelihood {score.likelihood} × Consequence {score.consequence}
        </p>
      </div>

      <div
        className="grid grid-cols-5 gap-1"
        role="img"
        aria-label={`Risk matrix position likelihood ${score.likelihood}, consequence ${score.consequence}, score ${score.total}`}
      >
        {[5, 4, 3, 2, 1].map((likelihood) =>
          [1, 2, 3, 4, 5].map((consequence) => {
            const total = likelihood * consequence;
            const active =
              likelihood === score.likelihood &&
              consequence === score.consequence;
            const cellBand =
              total <= 10 ? "low" : total <= 15 ? "medium" : "high";
            return (
              <span
                key={`${likelihood}-${consequence}`}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-sm text-[0.625rem] tabular-nums",
                  cellBand === "low" && "bg-success/12 text-success",
                  cellBand === "medium" &&
                    "bg-warning/18 text-warning-foreground",
                  cellBand === "high" && "bg-destructive/10 text-destructive",
                  active && "ring-2 ring-foreground ring-offset-1"
                )}
                aria-hidden={!active}
              >
                {active ? total : ""}
              </span>
            );
          })
        )}
      </div>
      <div className="flex justify-between text-[0.625rem] text-muted-foreground">
        <span>Consequence →</span>
        <span>↑ Likelihood</span>
      </div>
    </div>
  );
}

export function ScoreInputs({
  likelihood,
  consequence,
  onLikelihoodChange,
  onConsequenceChange,
  disabled,
  likelihoodError,
  consequenceError,
}: {
  likelihood: number;
  consequence: number;
  onLikelihoodChange: (value: number) => void;
  onConsequenceChange: (value: number) => void;
  disabled?: boolean;
  likelihoodError?: string;
  consequenceError?: string;
}) {
  const previewTotal = likelihood * consequence;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="ims-text-label block">Likelihood</span>
          <select
            className="ims-select"
            value={likelihood}
            disabled={disabled}
            aria-invalid={Boolean(likelihoodError)}
            onChange={(event) =>
              onLikelihoodChange(Number(event.target.value))
            }
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          {likelihoodError ? (
            <span className="text-xs text-destructive" role="alert">
              {likelihoodError}
            </span>
          ) : null}
        </label>
        <label className="block space-y-1.5">
          <span className="ims-text-label block">Consequence</span>
          <select
            className="ims-select"
            value={consequence}
            disabled={disabled}
            aria-invalid={Boolean(consequenceError)}
            onChange={(event) =>
              onConsequenceChange(Number(event.target.value))
            }
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          {consequenceError ? (
            <span className="text-xs text-destructive" role="alert">
              {consequenceError}
            </span>
          ) : null}
        </label>
      </div>
      <RiskScoreAssessment
        score={{
          likelihood,
          consequence,
          total: previewTotal,
        }}
        band={
          previewTotal <= 10 ? "low" : previewTotal <= 15 ? "medium" : "high"
        }
        label="Score preview"
      />
      <p className="ims-text-meta">
        Score is likelihood × consequence. The server stores and returns the
        authoritative total.
      </p>
    </div>
  );
}
