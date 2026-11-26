import { useState } from "react";
import { Plus } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { EntityTableRow } from "@/shared/components/entity-table-row";
import { Button } from "@/shared/components/ui/button";
import { useCompetenciesQuery } from "../hooks/use-training";
import { formatInterval } from "../lib/training-display";
import {
  TrainingCourseSheet,
  type TrainingCourseSheetMode,
} from "./training-course-sheet";
import { PageLoader } from "@/shared/components/ims-loader";

type TrainingCompetenciesPanelProps = {
  canEdit?: boolean;
};

export function TrainingCompetenciesPanel({
  canEdit = true,
}: TrainingCompetenciesPanelProps) {
  const [showArchived, setShowArchived] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<TrainingCourseSheetMode>("create");
  const [courseId, setCourseId] = useState<string | null>(null);

  const compsQuery = useCompetenciesQuery();
  const all = compsQuery.data ?? [];
  const comps = all.filter((c) => (showArchived ? true : !c.archived));

  function openCreate() {
    setCourseId(null);
    setSheetMode("create");
    setSheetOpen(true);
  }

  function openCourse(id: string) {
    setCourseId(id);
    setSheetMode("view");
    setSheetOpen(true);
  }

  if (compsQuery.isLoading) {
    return (
      <PageLoader label="Loading competencies…" />
    );
  }

  return (
    <div className="space-y-4">
      <div className="ims-toolbar flex-wrap">
        <div className="flex-1">
          <h2 className="text-lg font-semibold tracking-tight">Courses</h2>
          <p className="text-sm text-muted-foreground">
            Competency catalogue — courses, certificates, licences and policy
            acknowledgements. New courses appear on the matrix once assigned to
            a role.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived
        </label>
        {canEdit ? (
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="size-3.5" /> Add course
          </Button>
        ) : null}
      </div>

      {comps.length === 0 ? (
        <EmptyState
          title="No courses yet"
          description="Add a course here, or bootstrap the default catalogue from Settings."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-subtle">
          <table className="ims-table w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Renewal</th>
                <th>Evidence</th>
                <th>Basis</th>
              </tr>
            </thead>
            <tbody>
              {comps.map((c) => (
                <EntityTableRow
                  key={c.id}
                  onOpen={() => openCourse(c.id)}
                >
                  <td>
                    <div className="font-medium">
                      {c.name}
                      {c.archived ? (
                        <span className="ims-text-meta ml-1">archived</span>
                      ) : null}
                    </div>
                  </td>
                  <td>{formatInterval(c.months)}</td>
                  <td>{c.evidence}</td>
                  <td className="text-sm text-muted-foreground">
                    {c.basis || "—"}
                  </td>
                </EntityTableRow>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TrainingCourseSheet
        open={sheetOpen}
        mode={sheetMode}
        courseId={courseId}
        onOpenChange={setSheetOpen}
        onModeChange={setSheetMode}
        canEdit={canEdit}
      />
    </div>
  );
}
