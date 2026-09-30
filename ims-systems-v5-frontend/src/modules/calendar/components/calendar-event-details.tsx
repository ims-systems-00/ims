import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { StatusBadge } from "@/shared/components/status-badge";
import { formatEventDateTime } from "../lib/date-utils";
import {
  EVENT_REFERENCE_LABELS,
  isLinkedEvent,
  type CalendarEvent,
  type CalendarEventReference,
} from "../types";
import { eventColorDotClass } from "./event-colors";

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid gap-1 border-b border-border/60 py-3 last:border-0 sm:grid-cols-[8rem_1fr] sm:gap-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

function sourceHref(
  eventReference: CalendarEventReference,
  systemEventId: string
): string | null {
  switch (eventReference) {
    case "task":
      return `/tasks?task=${systemEventId}`;
    case "incident":
      return `/incidents?incident=${systemEventId}`;
    case "audit":
      return `/audits/internal?audit=${systemEventId}`;
    case "managementreview":
      return `/management-reviews?review=${systemEventId}`;
    case "supplier":
      return `/suppliers?supplier=${systemEventId}`;
    case "leave":
      return null;
    default:
      return null;
  }
}

export function CalendarEventDetails({ event }: { event: CalendarEvent }) {
  const linked = isLinkedEvent(event);
  const href =
    linked && event.eventReference && event.systemEventId
      ? sourceHref(event.eventReference, event.systemEventId)
      : null;

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span
            className={`inline-block size-2.5 rounded-full ${eventColorDotClass[event.color]}`}
            aria-hidden
          />
          {linked && event.eventReference ? (
            <StatusBadge tone="info">
              {EVENT_REFERENCE_LABELS[event.eventReference]}
            </StatusBadge>
          ) : (
            <StatusBadge tone="neutral">Standalone</StatusBadge>
          )}
          {linked ? (
            <StatusBadge tone="warning">Read-only in Calendar</StatusBadge>
          ) : null}
        </div>
        <h3 className="ims-text-section">{event.title}</h3>
        {event.description ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
            {event.description}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No description.</p>
        )}
      </section>

      <dl>
        <DetailRow label="Start" value={formatEventDateTime(event.start)} />
        <DetailRow label="End" value={formatEventDateTime(event.end)} />
        <DetailRow
          label="Colour"
          value={<span className="capitalize">{event.color}</span>}
        />
        {linked && event.eventReference ? (
          <DetailRow
            label="Source"
            value={
              href ? (
                <Link
                  to={href}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  Open {EVENT_REFERENCE_LABELS[event.eventReference]}
                </Link>
              ) : (
                EVENT_REFERENCE_LABELS[event.eventReference]
              )
            }
          />
        ) : null}
        {linked ? (
          <DetailRow
            label="Note"
            value="Linked events are managed in their source module. Calendar mirrors dates only."
          />
        ) : null}
      </dl>
    </div>
  );
}

export function CalendarEventDetailsLoading() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
      <div className="h-4 w-full animate-pulse rounded bg-muted" />
      <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
      <div className="h-20 w-full animate-pulse rounded bg-muted" />
    </div>
  );
}
