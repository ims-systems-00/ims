import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { EntityTableRow } from "@/shared/components/entity-table-row";
import { Button } from "@/shared/components/ui/button";
import {
  useCompetenciesQuery,
  useRolesQuery,
} from "../hooks/use-training";
import { TrainingLevelBadge } from "./training-badges";
import {
  TrainingRoleSheet,
  type TrainingRoleSheetMode,
} from "./training-role-sheet";

type TrainingRolesPanelProps = {
  canEdit?: boolean;
};

export function TrainingRolesPanel({ canEdit = true }: TrainingRolesPanelProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<TrainingRoleSheetMode>("create");
  const [roleId, setRoleId] = useState<string | null>(null);

  const rolesQuery = useRolesQuery();
  const compsQuery = useCompetenciesQuery();

  const roles = rolesQuery.data ?? [];
  const comps = (compsQuery.data ?? []).filter((c) => !c.archived);
  const compName = (id: string) =>
    comps.find((c) => c.id === id || c.key === id)?.name ?? id;

  function openCreate() {
    setRoleId(null);
    setSheetMode("create");
    setSheetOpen(true);
  }

  function openRole(id: string) {
    setRoleId(id);
    setSheetMode("view");
    setSheetOpen(true);
  }

  if (rolesQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading roles…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="ims-toolbar">
        <div className="flex-1">
          <h2 className="text-lg font-semibold tracking-tight">Roles</h2>
          <p className="text-sm text-muted-foreground">
            Mandatory and desirable courses per role. The implicit
            &quot;All staff&quot; role applies to everyone. Assign new courses
            here after creating them under Courses.
          </p>
        </div>
        {canEdit ? (
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="size-3.5" /> Add role
          </Button>
        ) : null}
      </div>

      {roles.length === 0 ? (
        <EmptyState
          title="No roles"
          description="Create roles and assign mandatory competencies."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-subtle">
          <table className="ims-table w-full">
            <thead>
              <tr>
                <th>Role</th>
                <th>Mandatory</th>
                <th>Desirable</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <EntityTableRow
                  key={role.id}
                  onOpen={() => openRole(role.id)}
                >
                  <td>
                    <div className="font-medium">
                      {role.name}
                      {role.key === "all" ? (
                        <span className="ims-text-meta ml-1">· everyone</span>
                      ) : null}
                    </div>
                    {role.description ? (
                      <div className="ims-text-meta line-clamp-1">
                        {role.description}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      {(role.mandatory || []).length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        (role.mandatory || []).map((cid) => (
                          <span
                            key={`m-${cid}`}
                            className="inline-flex items-center gap-1"
                          >
                            <TrainingLevelBadge level="mandatory" />
                            <span className="text-xs">{compName(cid)}</span>
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      {(role.desirable || []).length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        (role.desirable || []).map((cid) => (
                          <span
                            key={`d-${cid}`}
                            className="inline-flex items-center gap-1"
                          >
                            <TrainingLevelBadge level="desirable" />
                            <span className="text-xs">{compName(cid)}</span>
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                </EntityTableRow>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TrainingRoleSheet
        open={sheetOpen}
        mode={sheetMode}
        roleId={roleId}
        onOpenChange={setSheetOpen}
        onModeChange={setSheetMode}
        canEdit={canEdit}
      />
    </div>
  );
}
