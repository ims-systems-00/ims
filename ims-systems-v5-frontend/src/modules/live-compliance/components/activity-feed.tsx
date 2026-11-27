import { useLiveActivityQuery } from "../hooks/use-live-compliance";
import { formatDay } from "../lib/health";

/** Recent clause changes and actions taken from advice. */
export function ActivityFeed({ limit = 6 }: { limit?: number }) {
  const query = useLiveActivityQuery(limit);
  const items = query.data ?? [];
  return (
    <section aria-labelledby="live-activity-heading" className="rounded-xl border border-border-subtle bg-card px-4 py-3.5">
      <h2
        id="live-activity-heading"
        className="mb-1.5 text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted-foreground"
      >
        Live activity
      </h2>
      {items.length ? (
        <ul className="divide-y divide-border-subtle/60">
          {items.map((a) => (
            <li key={a.id} className="flex gap-2.5 py-2 text-[0.8125rem]">
              <span className="h-fit shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-primary">
                {a.source}
              </span>
              <span className="min-w-0 flex-1 text-foreground">{a.text}</span>
              <time dateTime={a.at} className="shrink-0 text-xs text-muted-foreground">
                {formatDay(a.at)}
              </time>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-2 text-[0.8125rem] text-muted-foreground">
          No changes yet. Clause changes and actions taken from advice appear here.
        </p>
      )}
    </section>
  );
}
