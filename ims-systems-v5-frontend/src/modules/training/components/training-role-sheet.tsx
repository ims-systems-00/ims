import { useEffect, useState } from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { AppSheet } from "@/shared/components/app-sheet";
import { FormField, FormSection } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import {
  useCompetenciesQuery,
  useCreateRoleMutation,
  useRemoveRoleMutation,
  useRolesQuery,
  useUpdateRoleMutation,
} from "../hooks/use-training";
import { roleFormSchema } from "../schemas";
import { TrainingLevelBadge } from "./training-badges";
import { PageLoader } from "@/shared/components/ims-loader";

export type TrainingRoleSheetMode = "create" | "view" | "edit";

type TrainingRoleSheetProps = {
  open: boolean;
  mode: TrainingRoleSheetMode;
  roleId?: string | null;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: TrainingRoleSheetMode) => void;
  canEdit?: boolean;
};

export function TrainingRoleSheet({
  open,
  mode,
  roleId,
  onOpenChange,
  onModeChange,
  canEdit = true,
}: TrainingRoleSheetProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mandatory, setMandatory] = useState<string[]>([]);
  const [desirable, setDesirable] = useState<string[]>([]);

  const rolesQuery = useRolesQuery();
  const compsQuery = useCompetenciesQuery();
  const createMutation = useCreateRoleMutation();
  const updateMutation = useUpdateRoleMutation();
  const removeMutation = useRemoveRoleMutation();

  const roles = rolesQuery.data ?? [];
  const role = roles.find((r) => r.id === roleId) ?? null;
  const comps = (compsQuery.data ?? []).filter((c) => !c.archived);
  const compName = (id: string) =>
    comps.find((c) => c.id === id || c.key === id)?.name ?? id;

  useEffect(() => {
    if (!open) return;
    if (mode === "create") {
      setName("");
      setDescription("");
      setMandatory([]);
      setDesirable([]);
      return;
    }
    if (!role) return;
    setName(role.name);
    setDescription(role.description ?? "");
    setMandatory(role.mandatory ?? []);
    setDesirable(role.desirable ?? []);
  }, [open, mode, role]);

  function toggle(list: string[], id: string, set: (v: string[]) => void) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  async function handleSave() {
    const parsed = roleFormSchema.safeParse({
      name,
      description,
      mandatory,
      desirable,
    });
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }
    try {
      if (mode === "create") {
        await createMutation.mutateAsync({
          name: parsed.data.name,
          description: parsed.data.description || undefined,
          mandatory: parsed.data.mandatory,
          desirable: parsed.data.desirable,
        });
        notify.success("Role created");
        onOpenChange(false);
      } else if (roleId) {
        await updateMutation.mutateAsync({
          id: roleId,
          body: {
            name: parsed.data.name,
            description: parsed.data.description || undefined,
            mandatory: parsed.data.mandatory,
            desirable: parsed.data.desirable,
          },
        });
        notify.success("Role updated");
        onModeChange("view");
      }
    } catch (error) {
      notify.fromError(error, "Unable to save role");
    }
  }

  async function handleDelete() {
    if (!role || role.key === "all") {
      notify.error('The "all" role cannot be deleted');
      return;
    }
    if (!window.confirm(`Remove role "${role.name}"?`)) return;
    try {
      await removeMutation.mutateAsync(role.id);
      notify.success("Role removed");
      onOpenChange(false);
    } catch (error) {
      notify.fromError(error, "Unable to remove role");
    }
  }

  const pending =
    createMutation.isPending ||
    updateMutation.isPending ||
    removeMutation.isPending;
  const editing = mode === "create" || mode === "edit";
  const title =
    mode === "create" ? "Add role" : role?.name ?? "Role";

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={
        mode === "create"
          ? "Define mandatory and desirable courses for this role."
          : role?.description || undefined
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
      {mode !== "create" && rolesQuery.isLoading ? (
        <PageLoader label="Loading…" compact className="py-8" />
      ) : null}

      {mode !== "create" && role && mode === "view" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {role.key === "all" ? (
              <span className="ims-text-meta">Applies to everyone</span>
            ) : null}
            {canEdit ? (
              <div className="ml-auto flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onModeChange("edit")}
                >
                  <Pencil className="size-3.5" /> Edit
                </Button>
                {role.key !== "all" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => void handleDelete()}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
          {role.description ? (
            <p className="text-sm text-muted-foreground">{role.description}</p>
          ) : null}
          <FormSection title="Mandatory">
            <div className="flex flex-wrap gap-1.5">
              {(role.mandatory || []).length === 0 ? (
                <span className="text-xs text-muted-foreground">None</span>
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
          </FormSection>
          <FormSection title="Desirable">
            <div className="flex flex-wrap gap-1.5">
              {(role.desirable || []).length === 0 ? (
                <span className="text-xs text-muted-foreground">None</span>
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
          </FormSection>
        </div>
      ) : null}

      {editing ? (
        <div className="space-y-4">
          <FormSection title="Details">
            <div className="grid gap-3">
              <FormField label="Name">
                <input
                  className="ims-field"
                  value={name}
                  disabled={pending || role?.key === "all"}
                  onChange={(e) => setName(e.target.value)}
                />
              </FormField>
              <FormField label="Description">
                <input
                  className="ims-field"
                  value={description}
                  disabled={pending}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </FormField>
            </div>
          </FormSection>
          <FormField label="Mandatory">
            <div className="flex flex-wrap gap-2">
              {comps.length === 0 ? (
                <span className="text-xs text-muted-foreground">
                  Create courses first under Courses.
                </span>
              ) : (
                comps.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-1.5 rounded-md border border-border-subtle px-2 py-1 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={mandatory.includes(c.id)}
                      disabled={pending}
                      onChange={() => toggle(mandatory, c.id, setMandatory)}
                    />
                    {c.name}
                  </label>
                ))
              )}
            </div>
          </FormField>
          <FormField label="Desirable">
            <div className="flex flex-wrap gap-2">
              {comps.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-1.5 rounded-md border border-border-subtle px-2 py-1 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={desirable.includes(c.id)}
                    disabled={pending}
                    onChange={() => toggle(desirable, c.id, setDesirable)}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </FormField>
        </div>
      ) : null}
    </AppSheet>
  );
}
