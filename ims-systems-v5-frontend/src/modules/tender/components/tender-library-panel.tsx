import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import {
  useDeleteTenderAnswerMutation,
  useDeleteTenderCaseMutation,
  useDeleteTenderRateMutation,
  useDeleteTenderServiceMutation,
  useTenderAnswersQuery,
  useTenderCasesQuery,
  useTenderRatesQuery,
  useTenderServicesQuery,
  useUpsertTenderAnswerMutation,
  useUpsertTenderCaseMutation,
  useUpsertTenderRateMutation,
  useUpsertTenderServiceMutation,
} from "../hooks/use-tender";
import type {
  TenderCaseStudy,
  TenderLibraryAnswer,
  TenderLibrarySubtab,
  TenderRate,
  TenderService,
} from "../types";
import { TENDER_LIBRARY_SUBTABS } from "../types";

type TenderLibraryPanelProps = {
  canEdit?: boolean;
};

const SUBTAB_LABELS: Record<TenderLibrarySubtab, string> = {
  answers: "Answers",
  services: "Services",
  cases: "Case studies",
  rates: "Rates",
};

export function TenderLibraryPanel({ canEdit = true }: TenderLibraryPanelProps) {
  const [subtab, setSubtab] = useState<TenderLibrarySubtab>("answers");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const answersQuery = useTenderAnswersQuery();
  const servicesQuery = useTenderServicesQuery();
  const casesQuery = useTenderCasesQuery();
  const ratesQuery = useTenderRatesQuery();

  const upsertAnswer = useUpsertTenderAnswerMutation();
  const deleteAnswer = useDeleteTenderAnswerMutation();
  const upsertService = useUpsertTenderServiceMutation();
  const deleteService = useDeleteTenderServiceMutation();
  const upsertCase = useUpsertTenderCaseMutation();
  const deleteCase = useDeleteTenderCaseMutation();
  const upsertRate = useUpsertTenderRateMutation();
  const deleteRate = useDeleteTenderRateMutation();

  const [answerForm, setAnswerForm] = useState({
    question: "",
    answer: "",
    tags: "",
    owner: "",
  });
  const [serviceForm, setServiceForm] = useState({
    name: "",
    description: "",
    method: "",
    tags: "",
  });
  const [caseForm, setCaseForm] = useState({
    client: "",
    title: "",
    sector: "",
    year: "",
    summary: "",
    outcome: "",
  });
  const [rateForm, setRateForm] = useState({
    item: "",
    unit: "",
    rate: "",
    category: "",
  });

  function openCreate() {
    setEditingId(null);
    setAnswerForm({ question: "", answer: "", tags: "", owner: "" });
    setServiceForm({ name: "", description: "", method: "", tags: "" });
    setCaseForm({
      client: "",
      title: "",
      sector: "",
      year: "",
      summary: "",
      outcome: "",
    });
    setRateForm({ item: "", unit: "", rate: "", category: "" });
    setDialogOpen(true);
  }

  function openEditAnswer(row: TenderLibraryAnswer) {
    setEditingId(row.id);
    setAnswerForm({
      question: row.question,
      answer: row.answer,
      tags: (row.tags ?? []).join(", "),
      owner: row.owner ?? "",
    });
    setDialogOpen(true);
  }

  function openEditService(row: TenderService) {
    setEditingId(row.id);
    setServiceForm({
      name: row.name,
      description: row.description ?? "",
      method: row.method ?? "",
      tags: (row.tags ?? []).join(", "),
    });
    setDialogOpen(true);
  }

  function openEditCase(row: TenderCaseStudy) {
    setEditingId(row.id);
    setCaseForm({
      client: row.client,
      title: row.title,
      sector: row.sector ?? "",
      year: row.year ?? "",
      summary: row.summary ?? "",
      outcome: row.outcome ?? "",
    });
    setDialogOpen(true);
  }

  function openEditRate(row: TenderRate) {
    setEditingId(row.id);
    setRateForm({
      item: row.item,
      unit: row.unit ?? "",
      rate: String(row.rate ?? ""),
      category: row.category ?? "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    try {
      if (subtab === "answers") {
        if (!answerForm.question.trim()) {
          notify.error("Question is required");
          return;
        }
        await upsertAnswer.mutateAsync({
          id: editingId ?? undefined,
          question: answerForm.question.trim(),
          answer: answerForm.answer,
          owner: answerForm.owner.trim() || undefined,
          tags: answerForm.tags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        });
      } else if (subtab === "services") {
        if (!serviceForm.name.trim()) {
          notify.error("Name is required");
          return;
        }
        await upsertService.mutateAsync({
          id: editingId ?? undefined,
          name: serviceForm.name.trim(),
          description: serviceForm.description,
          method: serviceForm.method,
          tags: serviceForm.tags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        });
      } else if (subtab === "cases") {
        if (!caseForm.client.trim() || !caseForm.title.trim()) {
          notify.error("Client and title are required");
          return;
        }
        await upsertCase.mutateAsync({
          id: editingId ?? undefined,
          client: caseForm.client.trim(),
          title: caseForm.title.trim(),
          sector: caseForm.sector || undefined,
          year: caseForm.year || undefined,
          summary: caseForm.summary || undefined,
          outcome: caseForm.outcome || undefined,
        });
      } else {
        const rate = Number(rateForm.rate);
        if (!rateForm.item.trim() || Number.isNaN(rate)) {
          notify.error("Item and numeric rate are required");
          return;
        }
        await upsertRate.mutateAsync({
          id: editingId ?? undefined,
          item: rateForm.item.trim(),
          unit: rateForm.unit || undefined,
          rate,
          category: rateForm.category || undefined,
        });
      }
      notify.success(editingId ? "Updated" : "Created");
      setDialogOpen(false);
    } catch (error) {
      notify.fromError(error, "Unable to save");
    }
  }

  async function handleDelete(id: string) {
    try {
      if (subtab === "answers") await deleteAnswer.mutateAsync(id);
      else if (subtab === "services") await deleteService.mutateAsync(id);
      else if (subtab === "cases") await deleteCase.mutateAsync(id);
      else await deleteRate.mutateAsync(id);
      notify.success("Deleted");
    } catch (error) {
      notify.fromError(error, "Unable to delete");
    }
  }

  const pending =
    upsertAnswer.isPending ||
    upsertService.isPending ||
    upsertCase.isPending ||
    upsertRate.isPending;

  const loading =
    (subtab === "answers" && answersQuery.isLoading) ||
    (subtab === "services" && servicesQuery.isLoading) ||
    (subtab === "cases" && casesQuery.isLoading) ||
    (subtab === "rates" && ratesQuery.isLoading);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Library</h2>
          <p className="text-sm text-muted-foreground">
            Approved answers, services, case studies and rates used for drafting.
          </p>
        </div>
        {canEdit ? (
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="size-3.5" />
            Add {SUBTAB_LABELS[subtab].toLowerCase()}
          </Button>
        ) : null}
      </div>

      <div
        className="flex flex-wrap gap-1 border-b border-border-subtle"
        role="tablist"
        aria-label="Library sections"
      >
        {TENDER_LIBRARY_SUBTABS.map((id) => {
          const selected = subtab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={cn(
                "relative px-3.5 py-2.5 text-sm font-medium transition-colors",
                selected
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setSubtab(id)}
            >
              {SUBTAB_LABELS[id]}
              {selected ? (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              ) : null}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : subtab === "answers" ? (
        <AnswersTable
          rows={answersQuery.data ?? []}
          canEdit={canEdit}
          onEdit={openEditAnswer}
          onDelete={(id) => void handleDelete(id)}
        />
      ) : subtab === "services" ? (
        <ServicesTable
          rows={servicesQuery.data ?? []}
          canEdit={canEdit}
          onEdit={openEditService}
          onDelete={(id) => void handleDelete(id)}
        />
      ) : subtab === "cases" ? (
        <CasesTable
          rows={casesQuery.data ?? []}
          canEdit={canEdit}
          onEdit={openEditCase}
          onDelete={(id) => void handleDelete(id)}
        />
      ) : (
        <RatesTable
          rows={ratesQuery.data ?? []}
          canEdit={canEdit}
          onEdit={openEditRate}
          onDelete={(id) => void handleDelete(id)}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit" : "Add"} {SUBTAB_LABELS[subtab].toLowerCase()}
            </DialogTitle>
            <DialogDescription>
              Content is used when Alice drafts tender answers and pricing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {subtab === "answers" ? (
              <>
                <FormField label="Question">
                  <Input
                    value={answerForm.question}
                    onChange={(e) =>
                      setAnswerForm((f) => ({
                        ...f,
                        question: e.target.value,
                      }))
                    }
                  />
                </FormField>
                <FormField label="Answer">
                  <textarea
                    className="ims-field min-h-[120px]"
                    value={answerForm.answer}
                    onChange={(e) =>
                      setAnswerForm((f) => ({ ...f, answer: e.target.value }))
                    }
                  />
                </FormField>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Tags (comma-separated)">
                    <Input
                      value={answerForm.tags}
                      onChange={(e) =>
                        setAnswerForm((f) => ({ ...f, tags: e.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="Owner">
                    <Input
                      value={answerForm.owner}
                      onChange={(e) =>
                        setAnswerForm((f) => ({ ...f, owner: e.target.value }))
                      }
                    />
                  </FormField>
                </div>
              </>
            ) : null}

            {subtab === "services" ? (
              <>
                <FormField label="Name">
                  <Input
                    value={serviceForm.name}
                    onChange={(e) =>
                      setServiceForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </FormField>
                <FormField label="Description">
                  <textarea
                    className="ims-field min-h-[80px]"
                    value={serviceForm.description}
                    onChange={(e) =>
                      setServiceForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                  />
                </FormField>
                <FormField label="Method">
                  <textarea
                    className="ims-field min-h-[80px]"
                    value={serviceForm.method}
                    onChange={(e) =>
                      setServiceForm((f) => ({ ...f, method: e.target.value }))
                    }
                  />
                </FormField>
                <FormField label="Tags">
                  <Input
                    value={serviceForm.tags}
                    onChange={(e) =>
                      setServiceForm((f) => ({ ...f, tags: e.target.value }))
                    }
                  />
                </FormField>
              </>
            ) : null}

            {subtab === "cases" ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Client">
                    <Input
                      value={caseForm.client}
                      onChange={(e) =>
                        setCaseForm((f) => ({ ...f, client: e.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="Title">
                    <Input
                      value={caseForm.title}
                      onChange={(e) =>
                        setCaseForm((f) => ({ ...f, title: e.target.value }))
                      }
                    />
                  </FormField>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Sector">
                    <Input
                      value={caseForm.sector}
                      onChange={(e) =>
                        setCaseForm((f) => ({ ...f, sector: e.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="Year">
                    <Input
                      value={caseForm.year}
                      onChange={(e) =>
                        setCaseForm((f) => ({ ...f, year: e.target.value }))
                      }
                    />
                  </FormField>
                </div>
                <FormField label="Summary">
                  <textarea
                    className="ims-field min-h-[80px]"
                    value={caseForm.summary}
                    onChange={(e) =>
                      setCaseForm((f) => ({ ...f, summary: e.target.value }))
                    }
                  />
                </FormField>
                <FormField label="Outcome">
                  <textarea
                    className="ims-field min-h-[60px]"
                    value={caseForm.outcome}
                    onChange={(e) =>
                      setCaseForm((f) => ({ ...f, outcome: e.target.value }))
                    }
                  />
                </FormField>
              </>
            ) : null}

            {subtab === "rates" ? (
              <>
                <FormField label="Item">
                  <Input
                    value={rateForm.item}
                    onChange={(e) =>
                      setRateForm((f) => ({ ...f, item: e.target.value }))
                    }
                  />
                </FormField>
                <div className="grid gap-3 sm:grid-cols-3">
                  <FormField label="Unit">
                    <Input
                      value={rateForm.unit}
                      onChange={(e) =>
                        setRateForm((f) => ({ ...f, unit: e.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="Rate">
                    <Input
                      type="number"
                      min={0}
                      value={rateForm.rate}
                      onChange={(e) =>
                        setRateForm((f) => ({ ...f, rate: e.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="Category">
                    <Input
                      value={rateForm.category}
                      onChange={(e) =>
                        setRateForm((f) => ({
                          ...f,
                          category: e.target.value,
                        }))
                      }
                    />
                  </FormField>
                </div>
              </>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => void handleSave()}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnswersTable({
  rows,
  canEdit,
  onEdit,
  onDelete,
}: {
  rows: TenderLibraryAnswer[];
  canEdit: boolean;
  onEdit: (row: TenderLibraryAnswer) => void;
  onDelete: (id: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No library answers"
        description="Add approved Q&A pairs so drafting can reuse them."
      />
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border-subtle bg-card">
      <table className="ims-table w-full">
        <thead>
          <tr>
            <th>Question</th>
            <th>Owner</th>
            <th>Uses</th>
            {canEdit ? <th /> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <div className="font-medium line-clamp-2">{row.question}</div>
                <div className="ims-text-meta line-clamp-1">{row.answer}</div>
              </td>
              <td>{row.owner || "—"}</td>
              <td>{row.uses ?? 0}</td>
              {canEdit ? (
                <td>
                  <RowActions
                    onEdit={() => onEdit(row)}
                    onDelete={() => onDelete(row.id)}
                  />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ServicesTable({
  rows,
  canEdit,
  onEdit,
  onDelete,
}: {
  rows: TenderService[];
  canEdit: boolean;
  onEdit: (row: TenderService) => void;
  onDelete: (id: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No services"
        description="Describe services and methods used in bids."
      />
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border-subtle bg-card">
      <table className="ims-table w-full">
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            {canEdit ? <th /> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="font-medium">{row.name}</td>
              <td className="line-clamp-2 text-muted-foreground">
                {row.description || "—"}
              </td>
              {canEdit ? (
                <td>
                  <RowActions
                    onEdit={() => onEdit(row)}
                    onDelete={() => onDelete(row.id)}
                  />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CasesTable({
  rows,
  canEdit,
  onEdit,
  onDelete,
}: {
  rows: TenderCaseStudy[];
  canEdit: boolean;
  onEdit: (row: TenderCaseStudy) => void;
  onDelete: (id: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No case studies"
        description="Capture client outcomes for evidence-backed answers."
      />
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border-subtle bg-card">
      <table className="ims-table w-full">
        <thead>
          <tr>
            <th>Client</th>
            <th>Title</th>
            <th>Sector</th>
            {canEdit ? <th /> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="font-medium">{row.client}</td>
              <td>{row.title}</td>
              <td>{row.sector || "—"}</td>
              {canEdit ? (
                <td>
                  <RowActions
                    onEdit={() => onEdit(row)}
                    onDelete={() => onDelete(row.id)}
                  />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RatesTable({
  rows,
  canEdit,
  onEdit,
  onDelete,
}: {
  rows: TenderRate[];
  canEdit: boolean;
  onEdit: (row: TenderRate) => void;
  onDelete: (id: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No rates"
        description="Add unit rates so pricing schedules can be suggested."
      />
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border-subtle bg-card">
      <table className="ims-table w-full">
        <thead>
          <tr>
            <th>Item</th>
            <th>Unit</th>
            <th>Rate</th>
            <th>Category</th>
            {canEdit ? <th /> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="font-medium">{row.item}</td>
              <td>{row.unit || "—"}</td>
              <td>{row.rate}</td>
              <td>{row.category || "—"}</td>
              {canEdit ? (
                <td>
                  <RowActions
                    onEdit={() => onEdit(row)}
                    onDelete={() => onDelete(row.id)}
                  />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex justify-end gap-1">
      <Button type="button" size="sm" variant="ghost" onClick={onEdit}>
        <Pencil className="size-3.5" />
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onDelete}>
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
