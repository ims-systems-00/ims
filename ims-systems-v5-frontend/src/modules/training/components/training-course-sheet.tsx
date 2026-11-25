import { useEffect, useState } from "react";
import { Archive, Loader2, Pencil } from "lucide-react";
import { AppSheet } from "@/shared/components/app-sheet";
import { FormField, FormSection } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import {
  useArchiveCompetencyMutation,
  useCompetenciesQuery,
  useCreateCompetencyMutation,
  useUpdateCompetencyMutation,
} from "../hooks/use-training";
import { formatInterval } from "../lib/training-display";
import { competencyFormSchema } from "../schemas";
import { TRAINING_EVIDENCE_TYPES } from "../types";

export type TrainingCourseSheetMode = "create" | "view" | "edit";

type TrainingCourseSheetProps = {
  open: boolean;
  mode: TrainingCourseSheetMode;
  courseId?: string | null;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: TrainingCourseSheetMode) => void;
  canEdit?: boolean;
};

export function TrainingCourseSheet({
  open,
  mode,
  courseId,
  onOpenChange,
  onModeChange,
  canEdit = true,
}: TrainingCourseSheetProps) {
  const [name, setName] = useState("");
  const [months, setMonths] = useState(12);
  const [evidence, setEvidence] =
    useState<(typeof TRAINING_EVIDENCE_TYPES)[number]>("Certificate");
  const [basis, setBasis] = useState("");
  const [description, setDescription] = useState("");
  const [provider, setProvider] = useState("");
  const [covers, setCovers] = useState("");

  const compsQuery = useCompetenciesQuery();
  const createMutation = useCreateCompetencyMutation();
  const updateMutation = useUpdateCompetencyMutation();
  const archiveMutation = useArchiveCompetencyMutation();

  const all = compsQuery.data ?? [];
  const course = all.find((c) => c.id === courseId) ?? null;

  useEffect(() => {
    if (!open) return;
    if (mode === "create") {
      setName("");
      setMonths(12);
      setEvidence("Certificate");
      setBasis("");
      setDescription("");
      setProvider("");
      setCovers("");
      return;
    }
    if (!course) return;
    setName(course.name);
    setMonths(course.months);
    setEvidence(course.evidence);
    setBasis(course.basis ?? "");
    setDescription(course.description ?? "");
    setProvider(course.provider ?? "");
    setCovers((course.covers || []).join(", "));
  }, [open, mode, course]);

  async function handleSave() {
    const parsed = competencyFormSchema.safeParse({
      name,
      months,
      evidence,
      basis,
      description,
      provider,
      covers,
    });
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }
    const coversList = (parsed.data.covers || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const body = {
      name: parsed.data.name,
      months: parsed.data.months,
      evidence: parsed.data.evidence,
      basis: parsed.data.basis || undefined,
      description: parsed.data.description || undefined,
      provider: parsed.data.provider || undefined,
      covers: coversList,
    };
    try {
      if (mode === "create") {
        await createMutation.mutateAsync(body);
        notify.success("Course created");
        onOpenChange(false);
      } else if (courseId) {
        await updateMutation.mutateAsync({ id: courseId, body });
        notify.success("Course updated");
        onModeChange("view");
      }
    } catch (error) {
      notify.fromError(error, "Unable to save course");
    }
  }

  async function handleArchive() {
    if (!course) return;
    if (
      !window.confirm(
        `Archive "${course.name}"? It leaves the matrix and roles; records are kept.`
      )
    )
      return;
    try {
      await archiveMutation.mutateAsync(course.id);
      notify.success("Archived");
      onOpenChange(false);
    } catch (error) {
      notify.fromError(error, "Unable to archive");
    }
  }

  const pending =
    createMutation.isPending ||
    updateMutation.isPending ||
    archiveMutation.isPending;
  const editing = mode === "create" || mode === "edit";
  const title =
    mode === "create" ? "Add course" : course?.name ?? "Course";

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={
        mode === "create"
          ? "Add a competency to the catalogue. Assign it to roles to show on the matrix."
          : course?.evidence
      }
      className="sm:max-w-xl"
      footer={
        editing ? (
          <div className="flex w-full gap-2">
            <Button
              type="button"
              disabled={pending}
              onClick={() => void handleSave()}
            >
              {pending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : null}
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() =>
                mode === "create" ? onOpenChange(false) : onModeChange("view")
              }
            >
              Cancel
            </Button>
          </div>
        ) : undefined
      }
    >
      {mode !== "create" && compsQuery.isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : null}

      {mode !== "create" && course && mode === "view" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {course.archived ? (
              <span className="ims-text-meta">Archived</span>
            ) : null}
            {canEdit && !course.archived ? (
              <div className="ml-auto flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onModeChange("edit")}
                >
                  <Pencil className="size-3.5" /> Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => void handleArchive()}
                >
                  <Archive className="size-3.5" />
                </Button>
              </div>
            ) : null}
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Renewal</dt>
              <dd className="font-medium">{formatInterval(course.months)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Evidence</dt>
              <dd className="font-medium">{course.evidence}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Basis</dt>
              <dd className="font-medium">{course.basis || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Provider</dt>
              <dd className="font-medium">{course.provider || "—"}</dd>
            </div>
          </dl>
          {course.description ? (
            <p className="text-sm text-muted-foreground">{course.description}</p>
          ) : null}
          {(course.covers || []).length > 0 ? (
            <FormSection title="Covers">
              <p className="text-sm">{(course.covers || []).join(", ")}</p>
            </FormSection>
          ) : null}
        </div>
      ) : null}

      {editing ? (
        <div className="space-y-4">
          <FormSection title="Details">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Name">
                <input
                  className="ims-field"
                  value={name}
                  disabled={pending}
                  onChange={(e) => setName(e.target.value)}
                />
              </FormField>
              <FormField label="Renewal (months, 0 = never)">
                <input
                  type="number"
                  className="ims-field"
                  value={months}
                  disabled={pending}
                  onChange={(e) => setMonths(Number(e.target.value) || 0)}
                />
              </FormField>
              <FormField label="Evidence type">
                <select
                  className="ims-select ims-field"
                  value={evidence}
                  disabled={pending}
                  onChange={(e) =>
                    setEvidence(
                      e.target.value as (typeof TRAINING_EVIDENCE_TYPES)[number]
                    )
                  }
                >
                  {TRAINING_EVIDENCE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Basis">
                <input
                  className="ims-field"
                  value={basis}
                  disabled={pending}
                  onChange={(e) => setBasis(e.target.value)}
                />
              </FormField>
              <FormField label="Default provider">
                <input
                  className="ims-field"
                  value={provider}
                  disabled={pending}
                  onChange={(e) => setProvider(e.target.value)}
                />
              </FormField>
              <FormField label="Covers (comma-separated)">
                <input
                  className="ims-field"
                  value={covers}
                  disabled={pending}
                  placeholder="Lifting equipment, policy:hs"
                  onChange={(e) => setCovers(e.target.value)}
                />
              </FormField>
            </div>
            <FormField label="Description">
              <textarea
                className="ims-field min-h-[60px]"
                value={description}
                disabled={pending}
                onChange={(e) => setDescription(e.target.value)}
              />
            </FormField>
          </FormSection>
        </div>
      ) : null}
    </AppSheet>
  );
}
