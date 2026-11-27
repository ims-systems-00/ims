import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ListChecks } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import {
  consumeSignInSummary,
  hasPendingSignInSummary,
} from "@/shared/lib/sign-in-summary";
import { cn } from "@/shared/lib/utils";
import { useActionCentreQuery } from "../hooks/use-live-compliance";
import { useActionCentreStore, useLiveComplianceEnabled } from "../lib/action-centre";
import { ActionCentreList, ReadinessStrip } from "./action-centre-list";

/**
 * Navbar entry: a checklist icon with a badge for anything overdue or due
 * this week; opens the full grouped list with a fix button per item.
 */
export function ActionCentreButton() {
  return <ActionCentreButtonInner enabled={useLiveComplianceEnabled() && import.meta.env.MODE !== "test"} />;
}

export function ActionCentreButtonInner({ enabled = true }: { enabled?: boolean }) {
  const open = useActionCentreStore((s) => s.open);
  const setOpen = useActionCentreStore((s) => s.setOpen);
  const query = useActionCentreQuery("mine", enabled);
  if (!enabled) return null;
  const data = query.data;
  const urgent = data ? data.counts.now + data.counts.week : 0;
  const badge = urgent > 99 ? "99+" : urgent > 0 ? String(urgent) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="relative"
          aria-label={badge ? `Action centre, ${urgent} need attention` : "Action centre"}
          title="Action centre"
        >
          <ListChecks className="size-4" />
          {badge ? (
            <span
              className={cn(
                "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1",
                "text-[0.625rem] font-semibold leading-none",
                data && data.counts.now > 0
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-warning text-warning-foreground"
              )}
            >
              {badge}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(26rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Action centre</p>
            <p className="text-xs text-muted-foreground">
              {data
                ? data.counts.total
                  ? `${data.counts.total} ${data.counts.total === 1 ? "thing" : "things"} to keep you audit-ready`
                  : "Everything is in order"
                : "Loading…"}
            </p>
          </div>
          <Link
            to="/compliance/live"
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Overview
            <ArrowUpRight className="size-3" />
          </Link>
        </div>
        <div className="max-h-[min(70vh,34rem)] overflow-y-auto px-2 py-3">
          {data ? (
            <>
              <ReadinessStrip readiness={data.readiness} className="mb-3 px-2" />
              <ActionCentreList items={data.items} onNavigate={() => setOpen(false)} />
            </>
          ) : query.isError ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              Unable to load your actions.
            </p>
          ) : (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">Loading…</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const SUMMARY_LIMIT = 5;

function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Sign-in summary: every time the user enters an organisation (sign-in org
 * picker or org switcher), once the app has loaded and the intro animation
 * has finished, show what needs them: overdue and due-this-week items with a
 * fix button each, or what is coming up / an all-clear when nothing is urgent.
 */
export function SignInActionSummary() {
  return (
    <SignInActionSummaryInner
      enabled={useLiveComplianceEnabled() && import.meta.env.MODE !== "test"}
    />
  );
}

export function SignInActionSummaryInner({ enabled = true }: { enabled?: boolean }) {
  const query = useActionCentreQuery("mine", enabled && hasPendingSignInSummary());
  const setPanelOpen = useActionCentreStore((s) => s.setOpen);
  const [open, setOpen] = useState(false);
  const data = query.data;
  // After an org switch the cache is refetched: wait for the fresh result.
  const ready = Boolean(data) && !query.isFetching;

  useEffect(() => {
    if (!enabled || !ready || !hasPendingSignInSummary()) return;
    // Wait for the post-login intro overlay to finish.
    const timer = setInterval(() => {
      if (document.getElementById("imsi")) return;
      clearInterval(timer);
      consumeSignInSummary();
      setOpen(true);
    }, 400);
    return () => clearInterval(timer);
  }, [enabled, ready]);

  if (!data) return null;
  const urgentCount = data.counts.now + data.counts.week;
  const hasUrgent = urgentCount > 0;
  const shown = data.items.filter((i) => (hasUrgent ? i.bucket !== "later" : true));

  const title = hasUrgent
    ? urgentCount === 1
      ? "1 thing needs you"
      : `${urgentCount} things need you`
    : data.counts.total
      ? "Nothing urgent today"
      : "You're all caught up";
  const description = data.counts.now
    ? `${data.counts.now} overdue${data.counts.week ? `, ${data.counts.week} due this week` : ""}. Fix them now and you stay audit-ready.`
    : data.counts.week
      ? `${data.counts.week} due this week. Get ahead of them and you stay audit-ready.`
      : data.counts.total
        ? `${data.counts.total} coming up later. Nothing is overdue.`
        : "Every monitored clause is in order. Nice work.";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {greeting()}. {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ReadinessStrip readiness={data.readiness} />
        {data.counts.total ? (
          <div className="-mx-2 max-h-[50vh] overflow-y-auto">
            <ActionCentreList
              items={shown}
              buckets={hasUrgent ? ["now", "week"] : ["later"]}
              limit={SUMMARY_LIMIT}
              onNavigate={() => setOpen(false)}
            />
          </div>
        ) : null}
        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            {hasUrgent ? "Later" : "Close"}
          </Button>
          {data.counts.total ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setPanelOpen(true);
              }}
            >
              See all {data.counts.total}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
