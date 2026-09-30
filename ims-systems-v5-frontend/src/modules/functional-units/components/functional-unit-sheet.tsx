import { Loader2 } from "lucide-react";
import { AppSheet } from "@/shared/components/app-sheet";
import { Button } from "@/shared/components/ui/button";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import {
  FunctionalUnitForm,
  FunctionalUnitFormActions,
} from "./functional-unit-form";
import { FunctionalUnitMembersPanel } from "./functional-unit-members-panel";
import {
  useCreateFunctionalUnitMutation,
  useFunctionalUnitQuery,
  useUpdateFunctionalUnitMutation,
} from "../hooks/use-functional-units";
import {
  isBusinessAccessType,
  type CreateFunctionalUnitInput,
  type FunctionalUnit,
} from "../types";

export type FunctionalUnitSheetMode = "create" | "view" | "edit";

type FunctionalUnitSheetProps = {
  open: boolean;
  mode: FunctionalUnitSheetMode;
  unitId?: string | null;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: FunctionalUnitSheetMode) => void;
  onCreated?: (unit: FunctionalUnit) => void;
};

export function FunctionalUnitSheet({
  open,
  mode,
  unitId,
  onOpenChange,
  onModeChange,
  onCreated,
}: FunctionalUnitSheetProps) {
  const unitQuery = useFunctionalUnitQuery(
    mode === "create" ? undefined : (unitId ?? undefined)
  );
  const createMutation = useCreateFunctionalUnitMutation();
  const updateMutation = useUpdateFunctionalUnitMutation(unitId ?? "");

  const unit = unitQuery.data;
  const pending = createMutation.isPending || updateMutation.isPending;

  async function handleCreate(values: CreateFunctionalUnitInput) {
    const created = await createMutation.mutateAsync(values);
    onCreated?.(created);
  }

  async function handleUpdate(values: CreateFunctionalUnitInput) {
    await updateMutation.mutateAsync({
      name: values.name,
      responsibility: values.responsibility,
      operatingLocation: values.operatingLocation,
      standards: values.standards,
    });
    notify.success("Functional unit updated successfully");
    onModeChange("view");
  }

  const title =
    mode === "create"
      ? "Create Functional Unit"
      : mode === "edit"
        ? "Edit Functional Unit"
        : (unit?.name ?? "Functional Unit");

  const description =
    mode === "create"
      ? "Add an organisation subdivision with access type and responsibility."
      : mode === "edit"
        ? "Update descriptive fields. Access type stays fixed."
        : unit?.reference;

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        mode === "create" ? (
          <FunctionalUnitFormActions
            formId="fu-create-form"
            submitLabel="Create"
            pending={pending}
            onCancel={() => onOpenChange(false)}
          />
        ) : mode === "edit" ? (
          <FunctionalUnitFormActions
            formId="fu-edit-form"
            submitLabel="Save"
            pending={pending}
            onCancel={() => onModeChange("view")}
          />
        ) : unit && !unit.isSystemDefault ? (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button type="button" onClick={() => onModeChange("edit")}>
              Edit
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        )
      }
    >
      {mode === "create" ? (
        <FunctionalUnitForm
          key="create"
          formId="fu-create-form"
          mode="create"
          submitLabel="Create"
          pending={pending}
          hideActions
          onSubmit={handleCreate}
          onCancel={() => onOpenChange(false)}
        />
      ) : null}

      {mode !== "create" && unitQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading functional unit…
        </div>
      ) : null}

      {mode !== "create" && unitQuery.isError ? (
        <SheetError error={unitQuery.error} />
      ) : null}

      {mode === "view" && unit ? (
        <>
          <FunctionalUnitDetails unit={unit} />
          <FunctionalUnitMembersPanel unit={unit} />
        </>
      ) : null}

      {mode === "edit" && unit ? (
        <FunctionalUnitForm
          key={`edit-${unit.id}`}
          formId="fu-edit-form"
          mode="edit"
          accessTypeLocked
          submitLabel="Save"
          pending={pending}
          hideActions
          initialValues={{
            name: unit.name,
            accessType: unit.accessType,
            responsibility: unit.responsibility,
            operatingLocation: unit.operatingLocation ?? "",
            standards: unit.standards ?? "",
          }}
          onSubmit={handleUpdate}
          onCancel={() => onModeChange("view")}
        />
      ) : null}
    </AppSheet>
  );
}

function FunctionalUnitDetails({ unit }: { unit: FunctionalUnit }) {
  return (
    <dl className="ims-detail-grid">
      <div>
        <dt className="ims-detail-label">Access type</dt>
        <dd className="ims-detail-value">{unit.accessType}</dd>
      </div>
      <div>
        <dt className="ims-detail-label">Members</dt>
        <dd className="ims-detail-value tabular-nums">{unit.totalMembers}</dd>
      </div>
      {isBusinessAccessType(unit.accessType) ? (
        <div>
          <dt className="ims-detail-label">Operating location</dt>
          <dd className="ims-detail-value">
            {unit.operatingLocation ?? "—"}
          </dd>
        </div>
      ) : (
        <div>
          <dt className="ims-detail-label">Standards</dt>
          <dd className="ims-detail-value">{unit.standards ?? "—"}</dd>
        </div>
      )}
      <div className="sm:col-span-2">
        <dt className="ims-detail-label">Responsibility</dt>
        <dd className="ims-detail-value">{unit.responsibility}</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="ims-detail-label">Compliance toolkits</dt>
        <dd className="ims-detail-value">
          {unit.complianceToolkits.length > 0
            ? unit.complianceToolkits.join(", ")
            : "None assigned"}
        </dd>
      </div>
      {unit.isSystemDefault ? (
        <div className="sm:col-span-2">
          <p className="ims-alert ims-alert-info">
            System default unit. Editing is disabled.
          </p>
        </div>
      ) : null}
    </dl>
  );
}

function SheetError({ error }: { error: unknown }) {
  if (isApiClientError(error)) {
    if (error.status === 404) {
      return (
        <p className="text-sm text-muted-foreground">
          Functional unit not found.
        </p>
      );
    }
    if (error.status === 403) {
      return (
        <p className="text-sm text-destructive">
          You do not have permission to view this functional unit.
        </p>
      );
    }
    return <p className="text-sm text-destructive">{error.message}</p>;
  }
  return (
    <p className="text-sm text-destructive">Unable to load functional unit.</p>
  );
}
