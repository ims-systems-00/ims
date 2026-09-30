import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import {
  useEmbeddedRiskMutations,
  useIdentificationMutations,
  useOfiMutations,
} from "../hooks/use-audits";
import {
  embeddedRiskFormSchema,
  identificationFormSchema,
  ofiFormSchema,
} from "../schemas";
import type { Audit } from "../types";

type FieldErrors = Record<string, string>;

type AuditFindingsSectionProps = {
  audit: Audit;
  editable: boolean;
};

export function AuditFindingsSection({
  audit,
  editable,
}: AuditFindingsSectionProps) {
  const identificationMutations = useIdentificationMutations(audit.id);
  const riskMutations = useEmbeddedRiskMutations(audit.id);
  const ofiMutations = useOfiMutations(audit.id);

  return (
    <div className="space-y-6">
      <IdentificationsBlock
        audit={audit}
        editable={editable}
        pending={
          identificationMutations.add.isPending ||
          identificationMutations.remove.isPending
        }
        onAdd={async (values) => {
          await identificationMutations.add.mutateAsync(values);
          notify.success("Non-conformity added");
        }}
        onRemove={async (id) => {
          await identificationMutations.remove.mutateAsync(id);
          notify.success("Non-conformity removed");
        }}
      />
      <RisksBlock
        audit={audit}
        editable={editable}
        pending={
          riskMutations.add.isPending || riskMutations.remove.isPending
        }
        onAdd={async (values) => {
          await riskMutations.add.mutateAsync(values);
          notify.success("Risk added");
        }}
        onRemove={async (id) => {
          await riskMutations.remove.mutateAsync(id);
          notify.success("Risk removed");
        }}
      />
      <OfisBlock
        audit={audit}
        editable={editable}
        pending={ofiMutations.add.isPending || ofiMutations.remove.isPending}
        onAdd={async (values) => {
          await ofiMutations.add.mutateAsync(values);
          notify.success("OFI added");
        }}
        onRemove={async (id) => {
          await ofiMutations.remove.mutateAsync(id);
          notify.success("OFI removed");
        }}
      />
    </div>
  );
}

function IdentificationsBlock({
  audit,
  editable,
  pending,
  onAdd,
  onRemove,
}: {
  audit: Audit;
  editable: boolean;
  pending: boolean;
  onAdd: (values: {
    nonConformity: string;
    rootCause: string;
  }) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [nonConformity, setNonConformity] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = identificationFormSchema.safeParse({
      nonConformity,
      rootCause,
    });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    try {
      await onAdd(parsed.data);
      setNonConformity("");
      setRootCause("");
      setErrors({});
      setOpen(false);
    } catch (error) {
      notify.fromError(error, "Unable to add non-conformity");
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight">Non-conformities</h3>
        {editable ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setOpen((value) => !value)}
          >
            <Plus />
            Add
          </Button>
        ) : null}
      </div>
      {audit.identifications.length === 0 ? (
        <p className="ims-text-meta">No non-conformity found</p>
      ) : (
        <ul className="space-y-2">
          {audit.identifications.map((item) => (
            <li
              key={item.id}
              className="rounded-md border border-border bg-surface px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium">{item.nonConformity}</p>
                  <p className="text-xs text-muted-foreground">
                    Root cause: {item.rootCause}
                  </p>
                </div>
                {editable ? (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Remove non-conformity ${item.nonConformity}`}
                    disabled={pending}
                    onClick={() => {
                      void onRemove(item.id).catch((error) =>
                        notify.fromError(error, "Unable to remove")
                      );
                    }}
                  >
                    <Trash2 />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {editable && open ? (
        <form className="space-y-3 rounded-md border border-border p-3" onSubmit={(e) => void handleSubmit(e)}>
          <FormField label="Non-conformity" required error={errors.nonConformity}>
            <textarea
              className="ims-field min-h-[3.5rem] py-2"
              value={nonConformity}
              disabled={pending}
              onChange={(event) => setNonConformity(event.target.value)}
            />
          </FormField>
          <FormField label="Root cause" required error={errors.rootCause}>
            <textarea
              className="ims-field min-h-[3.5rem] py-2"
              value={rootCause}
              disabled={pending}
              onChange={(event) => setRootCause(event.target.value)}
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              Save
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

function RisksBlock({
  audit,
  editable,
  pending,
  onAdd,
  onRemove,
}: {
  audit: Audit;
  editable: boolean;
  pending: boolean;
  onAdd: (values: {
    title: string;
    description: string;
    likelihood: number;
    consequence: number;
  }) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [likelihood, setLikelihood] = useState("3");
  const [consequence, setConsequence] = useState("3");
  const [errors, setErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = embeddedRiskFormSchema.safeParse({
      title,
      description,
      likelihood,
      consequence,
    });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    try {
      await onAdd(parsed.data);
      setTitle("");
      setDescription("");
      setLikelihood("3");
      setConsequence("3");
      setErrors({});
      setOpen(false);
    } catch (error) {
      notify.fromError(error, "Unable to add risk");
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight">Embedded risks</h3>
        {editable ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setOpen((value) => !value)}
          >
            <Plus />
            Add
          </Button>
        ) : null}
      </div>
      {audit.risks.length === 0 ? (
        <p className="ims-text-meta">No risk found</p>
      ) : (
        <ul className="space-y-2">
          {audit.risks.map((item) => (
            <li
              key={item.id}
              className="rounded-md border border-border bg-surface px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.description}
                  </p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    Score {item.total} (L{item.likelihood} × C{item.consequence})
                  </p>
                </div>
                {editable ? (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Remove risk ${item.title}`}
                    disabled={pending}
                    onClick={() => {
                      void onRemove(item.id).catch((error) =>
                        notify.fromError(error, "Unable to remove")
                      );
                    }}
                  >
                    <Trash2 />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {editable && open ? (
        <form className="space-y-3 rounded-md border border-border p-3" onSubmit={(e) => void handleSubmit(e)}>
          <FormField label="Title" required error={errors.title}>
            <input
              className="ims-field"
              value={title}
              disabled={pending}
              onChange={(event) => setTitle(event.target.value)}
            />
          </FormField>
          <FormField label="Description" required error={errors.description}>
            <textarea
              className="ims-field min-h-[3.5rem] py-2"
              value={description}
              disabled={pending}
              onChange={(event) => setDescription(event.target.value)}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Likelihood" required error={errors.likelihood}>
              <select
                className="ims-select"
                value={likelihood}
                disabled={pending}
                onChange={(event) => setLikelihood(event.target.value)}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Consequence" required error={errors.consequence}>
              <select
                className="ims-select"
                value={consequence}
                disabled={pending}
                onChange={(event) => setConsequence(event.target.value)}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              Save
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

function OfisBlock({
  audit,
  editable,
  pending,
  onAdd,
  onRemove,
}: {
  audit: Audit;
  editable: boolean;
  pending: boolean;
  onAdd: (values: {
    title: string;
    opportunityForImprovement: string;
  }) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [opportunity, setOpportunity] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = ofiFormSchema.safeParse({
      title,
      opportunityForImprovement: opportunity,
    });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    try {
      await onAdd(parsed.data);
      setTitle("");
      setOpportunity("");
      setErrors({});
      setOpen(false);
    } catch (error) {
      notify.fromError(error, "Unable to add OFI");
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight">
          Opportunities for improvement
        </h3>
        {editable ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setOpen((value) => !value)}
          >
            <Plus />
            Add
          </Button>
        ) : null}
      </div>
      {audit.ofis.length === 0 ? (
        <p className="ims-text-meta">No OFI found</p>
      ) : (
        <ul className="space-y-2">
          {audit.ofis.map((item) => (
            <li
              key={item.id}
              className="rounded-md border border-border bg-surface px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.opportunityForImprovement}
                  </p>
                </div>
                {editable ? (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Remove OFI ${item.title}`}
                    disabled={pending}
                    onClick={() => {
                      void onRemove(item.id).catch((error) =>
                        notify.fromError(error, "Unable to remove")
                      );
                    }}
                  >
                    <Trash2 />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {editable && open ? (
        <form className="space-y-3 rounded-md border border-border p-3" onSubmit={(e) => void handleSubmit(e)}>
          <FormField label="Title" required error={errors.title}>
            <input
              className="ims-field"
              value={title}
              disabled={pending}
              onChange={(event) => setTitle(event.target.value)}
            />
          </FormField>
          <FormField
            label="Opportunity for improvement"
            required
            error={errors.opportunityForImprovement}
          >
            <textarea
              className="ims-field min-h-[3.5rem] py-2"
              value={opportunity}
              disabled={pending}
              onChange={(event) => setOpportunity(event.target.value)}
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              Save
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
