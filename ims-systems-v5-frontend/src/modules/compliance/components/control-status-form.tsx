import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { updateControlStatusSchema } from "../schemas";
import type { ControlStatus, UpdateControlStatusInput } from "../types";
import { useState } from "react";

type ControlStatusFormProps = {
  control: ControlStatus;
  pending?: boolean;
  onSubmit: (values: UpdateControlStatusInput) => Promise<void>;
};

/**
 * Primary drawer form: Select Control + Implementation status.
 */
export function ControlStatusForm({
  control,
  pending = false,
  onSubmit,
}: ControlStatusFormProps) {
  const [selected, setSelected] = useState(control.selected);
  const [state, setState] = useState<UpdateControlStatusInput["state"]>(
    control.state === "Implemented" || control.state === "Yes"
      ? "Implemented"
      : "Not implemented"
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = updateControlStatusSchema.safeParse({ selected, state });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid status");
      return;
    }
    setError(null);
    await onSubmit(parsed.data);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <FormField label="Select control" htmlFor="control-selected" required>
        <select
          id="control-selected"
          className="ims-select"
          value={selected}
          disabled={pending || control.isLocked}
          onChange={(event) => {
            const next = event.target.value as UpdateControlStatusInput["selected"];
            setSelected(next);
            if (next === "Not selected") setState("Not implemented");
          }}
        >
          <option value="Selected">Selected</option>
          <option value="Not selected">Not selected</option>
        </select>
      </FormField>

      <FormField label="Status" htmlFor="control-state" required error={error ?? undefined}>
        <select
          id="control-state"
          className="ims-select"
          value={state}
          disabled={pending || control.isLocked || selected === "Not selected"}
          onChange={(event) =>
            setState(event.target.value as UpdateControlStatusInput["state"])
          }
        >
          <option value="Implemented">Implemented</option>
          <option value="Not implemented">Not implemented</option>
        </select>
      </FormField>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending || control.isLocked}>
          {pending ? "Saving…" : "Update status"}
        </Button>
      </div>
    </form>
  );
}
