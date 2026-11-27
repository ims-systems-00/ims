import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Scale, Trash2 } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField } from "@/shared/components/form-field";
import { PageLoader } from "@/shared/components/ims-loader";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/layout";
import { formatDate } from "@/shared/lib/format-date";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import { ModuleComplianceStrip } from "@/modules/live-compliance";
import { useLegalRegisterMutations, useLegalRegisterQuery } from "../hooks/use-legal-register";
import type { LegalDuty, LegalRegister } from "../types";

/**
 * Legal register at `/compliance/legal-register` (ISO 14001 / 45001):
 * the legal duties that apply (6.1.3) and evidence each is met (9.1.2).
 */
export function LegalRegisterPage() {
  const query = useLegalRegisterQuery();
  const mutations = useLegalRegisterMutations();
  const [searchParams] = useSearchParams();
  const focusDutyId = searchParams.get("duty");
  const [adding, setAdding] = useState(false);

  return (
    <div className="mx-auto max-w-8xl space-y-5">
      <PageHeader
        title="Legal register"
        description="The legal duties that apply to you and the evidence that each one is met. Review the register at planned intervals."
        actions={
          <Button type="button" onClick={() => setAdding((v) => !v)}>
            <Plus />
            Add duty
          </Button>
        }
      />
      <ModuleComplianceStrip module="compliance" />

      {query.isLoading ? <PageLoader label="Loading legal register…" /> : null}
      {query.isError ? (
        <p className="ims-alert ims-alert-error" role="alert">
          Unable to load the legal register.
        </p>
      ) : null}

      {adding ? <AddDutyForm onDone={() => setAdding(false)} /> : null}

      {query.data ? (
        <>
          <ReviewPanel register={query.data} />
          {query.data.duties.length ? (
            <DutiesTable duties={query.data.duties} focusDutyId={focusDutyId} />
          ) : (
            <EmptyState
              icon={<Scale />}
              title="No legal duties recorded yet"
              description="Start from the common UK duties for workplaces and remove any that do not apply, or add your own."
              action={
                <Button
                  type="button"
                  size="sm"
                  disabled={mutations.addCommon.isPending}
                  onClick={() =>
                    mutations.addCommon.mutate(undefined, {
                      onSuccess: (r) => notify.success(`${r.added} duties added`),
                      onError: (e) => notify.fromError(e, "Unable to add duties"),
                    })
                  }
                >
                  Add common UK duties
                </Button>
              }
            />
          )}
        </>
      ) : null}
    </div>
  );
}

function ReviewPanel({ register }: { register: LegalRegister }) {
  const { markReviewed, updateSettings } = useLegalRegisterMutations();
  const { lastReviewedOn, reviewIntervalMonths } = register.settings;
  const overdue =
    register.nextReviewDue !== null &&
    register.nextReviewDue.slice(0, 10) < new Date().toISOString().slice(0, 10);
  const missing = register.duties.filter((d) => !d.evidence.length).length;

  return (
    <section
      aria-label="Register review"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-card px-4 py-3"
    >
      <div className="space-y-0.5 text-[0.8125rem]">
        <p className="font-medium text-foreground">
          {lastReviewedOn ? `Last reviewed ${formatDate(lastReviewedOn)}` : "Never reviewed"}
          {register.nextReviewDue ? (
            <span className={cn("ml-2", overdue ? "text-destructive" : "text-muted-foreground")}>
              · next review {overdue ? "overdue since" : "due"} {formatDate(register.nextReviewDue)}
            </span>
          ) : null}
        </p>
        <p className="text-muted-foreground">
          {register.duties.length} duties · {missing} without evidence
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Review every
          <select
            className="ims-select h-8 w-auto"
            value={reviewIntervalMonths}
            disabled={updateSettings.isPending}
            onChange={(e) =>
              updateSettings.mutate(Number(e.target.value), {
                onError: (err) => notify.fromError(err, "Unable to save"),
              })
            }
          >
            {[3, 6, 12, 24].map((m) => (
              <option key={m} value={m}>
                {m} months
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={markReviewed.isPending || !register.duties.length}
          onClick={() =>
            markReviewed.mutate(undefined, {
              onSuccess: () => notify.success("Legal register marked reviewed"),
              onError: (e) => notify.fromError(e, "Unable to mark reviewed"),
            })
          }
        >
          Mark register reviewed
        </Button>
      </div>
    </section>
  );
}

function DutiesTable({ duties, focusDutyId }: { duties: LegalDuty[]; focusDutyId: string | null }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border-subtle bg-card">
      <table className="w-full min-w-[720px] text-[0.8125rem]">
        <thead>
          <tr className="border-b border-border-subtle text-left text-[0.6875rem] uppercase tracking-[0.08em] text-muted-foreground">
            <th scope="col" className="px-3 py-2 font-medium">Duty</th>
            <th scope="col" className="px-3 py-2 font-medium">Legislation</th>
            <th scope="col" className="px-3 py-2 font-medium">Evidence</th>
            <th scope="col" className="px-3 py-2 font-medium"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {duties.map((duty) => (
            <DutyRow key={duty.id} duty={duty} focused={duty.id === focusDutyId} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DutyRow({ duty, focused }: { duty: LegalDuty; focused: boolean }) {
  const { addEvidence, removeEvidence, removeDuty } = useLegalRegisterMutations();
  const [adding, setAdding] = useState(focused && !duty.evidence.length);
  const [label, setLabel] = useState("");
  const busy = addEvidence.isPending || removeEvidence.isPending || removeDuty.isPending;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!label.trim()) return;
    addEvidence.mutate(
      { id: duty.id, label: label.trim() },
      {
        onSuccess: () => {
          setLabel("");
          setAdding(false);
          notify.success("Evidence linked");
        },
        onError: (e) => notify.fromError(e, "Unable to link evidence"),
      }
    );
  }

  return (
    <tr
      className={cn(
        "border-b border-border-subtle/60 align-top last:border-0",
        focused && "bg-primary/[0.04]"
      )}
    >
      <td className="px-3 py-2.5">
        <p className="font-medium text-foreground">{duty.name}</p>
        {duty.appliesTo ? <p className="text-xs text-muted-foreground">{duty.appliesTo}</p> : null}
      </td>
      <td className="px-3 py-2.5 text-muted-foreground">
        {duty.legislation}
        {duty.reference ? ` · ${duty.reference}` : ""}
      </td>
      <td className="px-3 py-2.5">
        {duty.evidence.length ? (
          <ul className="space-y-1">
            {duty.evidence.map((e) => (
              <li key={e.id} className="flex items-center gap-1.5">
                <StatusBadge tone="success">Linked</StatusBadge>
                {e.url ? (
                  <a href={e.url} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
                    {e.label}
                  </a>
                ) : (
                  <span>{e.label}</span>
                )}
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-destructive"
                  aria-label={`Remove evidence ${e.label}`}
                  disabled={busy}
                  onClick={() => removeEvidence.mutate({ id: duty.id, evidenceId: e.id })}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <StatusBadge tone="info">Missing</StatusBadge>
        )}
        {adding ? (
          <form className="mt-2 flex gap-2" onSubmit={submit}>
            <input
              className="ims-field h-8"
              aria-label={`Evidence for ${duty.name}`}
              placeholder="e.g. Waste transfer notes 2026"
              value={label}
              autoFocus={focused}
              onChange={(e) => setLabel(e.target.value)}
            />
            <Button type="submit" size="sm" disabled={busy || !label.trim()}>
              Link
            </Button>
          </form>
        ) : null}
      </td>
      <td className="px-3 py-2.5 text-right">
        <div className="flex justify-end gap-1">
          <Button type="button" size="sm" variant="ghost" onClick={() => setAdding((v) => !v)}>
            Link evidence
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={`Remove duty ${duty.name}`}
            disabled={busy}
            onClick={() =>
              removeDuty.mutate(duty.id, {
                onError: (e) => notify.fromError(e, "Unable to remove duty"),
              })
            }
          >
            <Trash2 />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function AddDutyForm({ onDone }: { onDone: () => void }) {
  const { createDuty } = useLegalRegisterMutations();
  const [name, setName] = useState("");
  const [legislation, setLegislation] = useState("");
  const [reference, setReference] = useState("");
  const [appliesTo, setAppliesTo] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !legislation.trim()) return;
    createDuty.mutate(
      {
        name: name.trim(),
        legislation: legislation.trim(),
        reference: reference.trim() || undefined,
        appliesTo: appliesTo.trim() || undefined,
      },
      {
        onSuccess: () => {
          notify.success("Duty added");
          onDone();
        },
        onError: (e) => notify.fromError(e, "Unable to add duty"),
      }
    );
  }

  return (
    <form
      onSubmit={submit}
      aria-label="Add legal duty"
      className="grid gap-3 rounded-xl border border-border-subtle bg-card p-4 md:grid-cols-2"
    >
      <FormField label="Duty" required>
        <input className="ims-field" value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <FormField label="Legislation" required>
        <input className="ims-field" value={legislation} onChange={(e) => setLegislation(e.target.value)} />
      </FormField>
      <FormField label="Regulation / article">
        <input className="ims-field" value={reference} onChange={(e) => setReference(e.target.value)} />
      </FormField>
      <FormField label="Applies to">
        <input className="ims-field" value={appliesTo} onChange={(e) => setAppliesTo(e.target.value)} />
      </FormField>
      <div className="flex justify-end gap-2 md:col-span-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={createDuty.isPending || !name.trim() || !legislation.trim()}>
          Save duty
        </Button>
      </div>
    </form>
  );
}
