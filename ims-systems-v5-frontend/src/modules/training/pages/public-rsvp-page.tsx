import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useParams } from "react-router-dom";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import {
  usePublicRsvpMutation,
  usePublicRsvpQuery,
} from "../hooks/use-training";
import { formatDate } from "../lib/training-display";
import type { TrainingRsvpStatus } from "../types";
import { PageLoader } from "@/shared/components/ims-loader";

/**
 * Public session RSVP page — `/training/r/:token` (no app chrome).
 */
export function PublicRsvpPage() {
  const { token = "" } = useParams<{ token: string }>();
  const viewQuery = usePublicRsvpQuery(token || undefined);
  const rsvpMutation = usePublicRsvpMutation(token);
  const [note, setNote] = useState("");
  const [done, setDone] = useState<TrainingRsvpStatus | null>(null);

  const data = viewQuery.data;

  async function respond(status: TrainingRsvpStatus) {
    if (!token) return;
    try {
      await rsvpMutation.mutateAsync({
        status,
        note: note.trim() || undefined,
      });
      setDone(status);
      notify.success(
        status === "accepted"
          ? "Accepted"
          : status === "declined"
            ? "Declined"
            : "Marked tentative"
      );
    } catch (error) {
      notify.fromError(error, "Unable to record RSVP");
    }
  }

  if (!token || viewQuery.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
        <div className="w-full max-w-lg">
          <EmptyState
            title="RSVP link invalid"
            description="This invitation link is invalid or has expired."
          />
        </div>
      </div>
    );
  }

  if (viewQuery.isLoading || !data) {
    return (
      <PageLoader label="Loading invitation…" fullScreen />
    );
  }

  const { session, person, competency, orgName, current, materials } = data;
  const currentStatus = done ?? current?.status;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-lg space-y-4 rounded-xl border border-border-subtle bg-card p-6 shadow-sm">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Session invitation
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {person.name}
            {orgName ? ` · ${orgName}` : ""}
          </p>
        </div>

        <div className="space-y-2 rounded-md border border-border-subtle px-3 py-3 text-sm">
          <p>
            <strong>{competency?.name ?? session.cid}</strong>
          </p>
          <p>
            {formatDate(session.date)}
            {session.time ? ` · ${session.time}` : ""}
            {session.duration ? ` · ${session.duration} min` : ""}
          </p>
          {session.location ? <p>Location: {session.location}</p> : null}
          {session.trainer ? <p>Trainer: {session.trainer}</p> : null}
          {session.provider ? <p>Provider: {session.provider}</p> : null}
          {session.note ? (
            <p className="text-muted-foreground">{session.note}</p>
          ) : null}
        </div>

        {materials.length > 0 ? (
          <div className="space-y-1 text-sm">
            <p className="font-medium">Materials</p>
            {materials.map((m) => (
              <div key={m.id} className="text-muted-foreground">
                {m.url ? (
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {m.name}
                  </a>
                ) : (
                  m.name
                )}
              </div>
            ))}
          </div>
        ) : null}

        {session.status !== "Planned" ? (
          <p className="rounded-md border border-border-subtle bg-muted/40 px-3 py-2 text-sm">
            This session is {session.status.toLowerCase()} — RSVP is closed.
          </p>
        ) : currentStatus ? (
          <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-3 text-sm">
            <CheckCircle2 className="size-4 text-emerald-600" />
            Your response: <strong className="capitalize">{currentStatus}</strong>
          </div>
        ) : null}

        {session.status === "Planned" ? (
          <>
            <FormField label="Note (optional)">
              <input
                className="ims-field"
                value={note}
                maxLength={300}
                disabled={rsvpMutation.isPending}
                onChange={(e) => setNote(e.target.value)}
              />
            </FormField>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={rsvpMutation.isPending}
                onClick={() => void respond("accepted")}
              >
                Accept
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={rsvpMutation.isPending}
                onClick={() => void respond("tentative")}
              >
                Tentative
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={rsvpMutation.isPending}
                onClick={() => void respond("declined")}
              >
                Decline
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
