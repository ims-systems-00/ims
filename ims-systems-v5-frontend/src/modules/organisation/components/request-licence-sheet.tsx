import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { AppSheet } from "@/shared/components/app-sheet";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import {
  COMPLIANCE_TOOLKIT_NAMES,
  toolkitDisplayLabel,
} from "@/modules/compliance/types";
import { useRequestOrganisationLicenceMutation } from "../hooks/use-organisations";
import {
  ADDITIONAL_MODULE_OPTIONS,
  type OrganisationLicences,
} from "../types";

type RequestLicenceSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: OrganisationLicences;
};

/**
 * Organisation licence request drawer.
 * Applies seats/toolkits immediately; backend upgrades Stripe when subscribed.
 */
export function RequestLicenceSheet({
  open,
  onOpenChange,
  existing,
}: RequestLicenceSheetProps) {
  const mutation = useRequestOrganisationLicenceMutation();
  const [superUser, setSuperUser] = useState(0);
  const [users, setUsers] = useState(0);
  const [groups, setGroups] = useState(0);
  const [complianceTools, setComplianceTools] = useState<string[]>([]);
  const [additionalModules, setAdditionalModules] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const availableToolkits = useMemo(
    () =>
      COMPLIANCE_TOOLKIT_NAMES.filter(
        (name) => !existing.complianceTools.includes(name)
      ),
    [existing.complianceTools]
  );

  const availableModules = useMemo(
    () =>
      ADDITIONAL_MODULE_OPTIONS.filter(
        (name) => !existing.additionalModules.includes(name)
      ),
    [existing.additionalModules]
  );

  function reset() {
    setSuperUser(0);
    setUsers(0);
    setGroups(0);
    setComplianceTools([]);
    setAdditionalModules([]);
    setMessage("");
  }

  function toggleToolkit(name: string) {
    setComplianceTools((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name]
    );
  }

  function toggleModule(name: string) {
    setAdditionalModules((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name]
    );
  }

  async function handleSubmit() {
    try {
      const result = await mutation.mutateAsync({
        superUser,
        users,
        groups,
        complianceTools,
        additionalModules,
        message,
      });
      notify.success(
        `Licences allocated successfully (${result.request.reference})`
      );
      reset();
      onOpenChange(false);
    } catch (error) {
      notify.fromError(error, "Unable to request licences");
    }
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title="Request licence"
      description="Add seats, compliance toolkits, or modules. Allocation applies immediately; active Stripe subscriptions are upgraded automatically."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={mutation.isPending}
            onClick={() => void handleSubmit()}
          >
            {mutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : null}
            Confirm
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="Super user" htmlFor="lic-super">
            <Input
              id="lic-super"
              type="number"
              min={0}
              value={superUser}
              onChange={(event) =>
                setSuperUser(Math.max(0, Number(event.target.value) || 0))
              }
            />
          </FormField>
          <FormField label="User" htmlFor="lic-users">
            <Input
              id="lic-users"
              type="number"
              min={0}
              value={users}
              onChange={(event) =>
                setUsers(Math.max(0, Number(event.target.value) || 0))
              }
            />
          </FormField>
          <FormField label="Business unit" htmlFor="lic-groups">
            <Input
              id="lic-groups"
              type="number"
              min={0}
              value={groups}
              onChange={(event) =>
                setGroups(Math.max(0, Number(event.target.value) || 0))
              }
            />
          </FormField>
        </div>

        <FormField label="Compliance toolkits">
          {availableToolkits.length === 0 ? (
            <p className="text-[0.75rem] text-muted-foreground">
              All catalogue toolkits are already licensed.
            </p>
          ) : (
            <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-md border border-border-subtle p-2">
              {availableToolkits.map((name) => {
                const selected = complianceTools.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-[0.6875rem] font-medium transition-colors",
                      selected
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : "border-border-subtle text-muted-foreground hover:bg-muted/40"
                    )}
                    onClick={() => toggleToolkit(name)}
                  >
                    {toolkitDisplayLabel(name)}
                  </button>
                );
              })}
            </div>
          )}
        </FormField>

        <FormField label="Additional modules">
          {availableModules.length === 0 ? (
            <p className="text-[0.75rem] text-muted-foreground">
              All additional modules are already licensed.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {availableModules.map((name) => {
                const selected = additionalModules.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-[0.6875rem] font-medium transition-colors",
                      selected
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : "border-border-subtle text-muted-foreground hover:bg-muted/40"
                    )}
                    onClick={() => toggleModule(name)}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          )}
        </FormField>

        <FormField label="Message" htmlFor="lic-message">
          <Textarea
            id="lic-message"
            rows={3}
            value={message}
            placeholder="Optional note for the licence request"
            onChange={(event) => setMessage(event.target.value)}
          />
        </FormField>
      </div>
    </AppSheet>
  );
}
