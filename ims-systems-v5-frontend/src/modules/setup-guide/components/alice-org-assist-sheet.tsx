import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { AppSheet } from "@/shared/components/app-sheet";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { notify } from "@/shared/lib/toast";
import { isApiClientError } from "@/shared/lib/http/errors";
import { useCreateFunctionalUnitMutation } from "@/modules/functional-units/hooks/use-functional-units";
import { useCreateInvitationMutation } from "@/modules/invitations/hooks/use-invitations";
import {
  INVITATION_ROLES,
  type InvitationRole,
} from "@/modules/invitations/types";
import { useCreateBusinessPremiseMutation } from "@/modules/business-premise/hooks/use-business-premises";
import type {
  AliceDraftInvite,
  AliceDraftPremise,
  AliceDraftUnit,
} from "../types";
import {
  defaultAliceInviteDrafts,
  defaultAliceOrgDrafts,
  defaultAlicePremiseDrafts,
  emptyAliceInviteDraft,
  emptyAliceOrgDraft,
  emptyAlicePremiseDraft,
  isAliceInviteDraftReady,
  isAliceOrgDraftReady,
  isAlicePremiseDraftReady,
} from "../lib/parse-units";
import { signalSetupEvent, useSetupGuideStore } from "../store";

type AssistPhase = "units" | "users" | "premises";

const PHASES: Array<{ id: AssistPhase; label: string }> = [
  { id: "units", label: "Business units" },
  { id: "users", label: "Users" },
  { id: "premises", label: "Premises" },
];

/**
 * Alice assist for Organisation setup — units, invitations, premises.
 *
 * Each section shows only the mandatory create fields, pre-filled with starter
 * values. Confirm creates units first (so premises can link to real ids), then
 * invitations, then premises.
 */
export function AliceOrgAssistSheet() {
  const navigate = useNavigate();
  const open = useSetupGuideStore((s) => s.aliceAssistOpen);
  const activeStepId = useSetupGuideStore((s) => s.activeStepId);
  const closeAliceAssist = useSetupGuideStore((s) => s.closeAliceAssist);
  const finishStep = useSetupGuideStore((s) => s.finishStep);
  const closeGuide = useSetupGuideStore((s) => s.closeGuide);
  const showChecklist = useSetupGuideStore((s) => s.showChecklist);

  const visible = open && activeStepId === "org";

  const [phase, setPhase] = useState<AssistPhase>("units");
  const [units, setUnits] = useState<AliceDraftUnit[]>(defaultAliceOrgDrafts);
  const [invites, setInvites] = useState<AliceDraftInvite[]>(
    defaultAliceInviteDrafts
  );
  const [premises, setPremises] = useState<AliceDraftPremise[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createUnit = useCreateFunctionalUnitMutation();
  const createInvite = useCreateInvitationMutation();
  const createPremise = useCreateBusinessPremiseMutation();

  const readyUnits = useMemo(() => units.filter(isAliceOrgDraftReady), [units]);
  const readyInvites = useMemo(
    () => invites.filter(isAliceInviteDraftReady),
    [invites]
  );
  const readyUnitIds = useMemo(
    () => new Set(readyUnits.map((unit) => unit.id)),
    [readyUnits]
  );
  const readyPremises = useMemo(
    () =>
      premises.filter((premise) =>
        isAlicePremiseDraftReady(premise, readyUnitIds)
      ),
    [premises, readyUnitIds]
  );

  useEffect(() => {
    if (!visible) return;
    const nextUnits = defaultAliceOrgDrafts();
    setUnits(nextUnits);
    setInvites(defaultAliceInviteDrafts());
    setPremises(defaultAlicePremiseDrafts(nextUnits));
    setPhase("units");
    setError(null);
    setCreating(false);
  }, [visible]);

  // Keep premise unit links valid when units are removed.
  useEffect(() => {
    const validIds = new Set(units.map((unit) => unit.id));
    const fallback = units[0]?.id ?? "";
    setPremises((current) => {
      let changed = false;
      const next = current.map((premise) => {
        if (validIds.has(premise.unitDraftId)) return premise;
        changed = true;
        return { ...premise, unitDraftId: fallback };
      });
      return changed ? next : current;
    });
  }, [units]);

  function updateUnit(
    id: string,
    patch: Partial<
      Pick<AliceDraftUnit, "name" | "operatingLocation" | "responsibility">
    >
  ) {
    setUnits((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft))
    );
  }

  function updateInvite(
    id: string,
    patch: Partial<Pick<AliceDraftInvite, "email" | "role">>
  ) {
    setInvites((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft))
    );
  }

  function updatePremise(
    id: string,
    patch: Partial<
      Pick<AliceDraftPremise, "name" | "location" | "address" | "unitDraftId">
    >
  ) {
    setPremises((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft))
    );
  }

  async function handleConfirm() {
    if (readyUnits.length === 0 || creating) return;
    setCreating(true);
    setError(null);

    const unitIdByDraft = new Map<string, string>();
    let unitsCreated = 0;
    let invitesCreated = 0;
    let premisesCreated = 0;

    try {
      for (const draft of readyUnits) {
        const created = await createUnit.mutateAsync({
          name: draft.name.trim(),
          accessType: draft.accessType,
          responsibility: draft.responsibility.trim(),
          operatingLocation: draft.operatingLocation.trim(),
        });
        unitIdByDraft.set(draft.id, created.id);
        unitsCreated += 1;
      }
      signalSetupEvent("org.fu.created");

      for (const draft of readyInvites) {
        await createInvite.mutateAsync({
          email: draft.email.trim().toLowerCase(),
          role: draft.role,
        });
        invitesCreated += 1;
      }
      if (invitesCreated > 0) signalSetupEvent("org.users.invited");

      for (const draft of readyPremises) {
        const unitId = unitIdByDraft.get(draft.unitDraftId);
        if (!unitId) continue;
        await createPremise.mutateAsync({
          name: draft.name.trim(),
          location: draft.location.trim(),
          address: draft.address.trim(),
          functionalUnitIds: [unitId],
        });
        premisesCreated += 1;
      }
      if (premisesCreated > 0) signalSetupEvent("org.premises.created");

      finishStep("org");
      closeAliceAssist();
      closeGuide();
      showChecklist();
      navigate("/functional-units");
      notify.success(
        [
          `${unitsCreated} unit${unitsCreated === 1 ? "" : "s"}`,
          invitesCreated
            ? `${invitesCreated} invite${invitesCreated === 1 ? "" : "s"}`
            : null,
          premisesCreated
            ? `${premisesCreated} premise${premisesCreated === 1 ? "" : "s"}`
            : null,
        ]
          .filter(Boolean)
          .join(" · ") + " created"
      );
    } catch (err) {
      const message = isApiClientError(err)
        ? err.message
        : "Could not finish organisation setup with Alice.";
      setError(
        [
          message,
          unitsCreated ? `${unitsCreated} unit(s) created` : null,
          invitesCreated ? `${invitesCreated} invite(s) sent` : null,
          premisesCreated ? `${premisesCreated} premise(s) created` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      );
    } finally {
      setCreating(false);
    }
  }

  const phaseIndex = PHASES.findIndex((item) => item.id === phase);
  const canConfirm = readyUnits.length > 0 && !creating;

  return (
    <AppSheet
      open={visible}
      onOpenChange={(next) => {
        if (!next) closeAliceAssist();
      }}
      title="Alice — set up your organisation"
      description="Mandatory fields only, pre-filled. Create business units, invite people, then register a site."
      dataTour="setup.alice.org"
      className="sm:max-w-xl"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {phase !== "units" ? (
              <Button
                type="button"
                variant="outline"
                disabled={creating}
                onClick={() =>
                  setPhase(phase === "premises" ? "users" : "units")
                }
              >
                Back
              </Button>
            ) : null}
            {phase !== "premises" ? (
              <Button
                type="button"
                variant="outline"
                disabled={creating}
                onClick={() =>
                  setPhase(phase === "units" ? "users" : "premises")
                }
              >
                Next section
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={creating}
              onClick={() => closeAliceAssist()}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!canConfirm}
              onClick={() => {
                void handleConfirm();
              }}
            >
              {creating ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden />
                  Creating…
                </>
              ) : (
                "Create with Alice"
              )}
            </Button>
          </div>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Organisation sections">
        {PHASES.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={phase === item.id}
            disabled={creating}
            onClick={() => setPhase(item.id)}
            className={
              phase === item.id
                ? "rounded-md bg-primary px-2.5 py-1 text-[0.75rem] font-semibold text-primary-foreground"
                : "rounded-md bg-surface-muted px-2.5 py-1 text-[0.75rem] font-medium text-muted-foreground hover:text-foreground"
            }
          >
            {index + 1}. {item.label}
          </button>
        ))}
      </div>

      <p className="mb-4 text-[0.8125rem] leading-relaxed text-muted-foreground">
        {phase === "units"
          ? "Internal business function — name, operating location and responsibility are required."
          : phase === "users"
            ? "Invitations need an email and a role. People join when they accept."
            : "Premises need name, location, address and at least one business unit."}
        {phaseIndex < PHASES.length - 1
          ? " You can Confirm from any section once units are ready."
          : null}
      </p>

      {error ? (
        <p className="ims-alert ims-alert-error mb-4" role="alert">
          {error}
        </p>
      ) : null}

      {phase === "units" ? (
        <SectionList
          addLabel="Add unit"
          disabled={creating}
          onAdd={() => setUnits((current) => [...current, emptyAliceOrgDraft()])}
        >
          {units.map((draft, index) => (
            <section
              key={draft.id}
              className="rounded-lg border border-border bg-surface px-3.5 py-3"
              aria-label={`Business unit ${index + 1}`}
            >
              <RowHeader
                title={`Unit ${index + 1}`}
                disabled={creating || units.length <= 1}
                onRemove={() =>
                  setUnits((current) =>
                    current.length <= 1
                      ? current
                      : current.filter((row) => row.id !== draft.id)
                  )
                }
              />
              <div className="space-y-3">
                <FormField label="Name" htmlFor={`${draft.id}-name`} required>
                  <Input
                    id={`${draft.id}-name`}
                    value={draft.name}
                    disabled={creating}
                    onChange={(event) =>
                      updateUnit(draft.id, { name: event.target.value })
                    }
                    placeholder="e.g. HR Team"
                  />
                </FormField>
                <FormField
                  label="Operating location"
                  htmlFor={`${draft.id}-location`}
                  required
                >
                  <Input
                    id={`${draft.id}-location`}
                    value={draft.operatingLocation}
                    disabled={creating}
                    onChange={(event) =>
                      updateUnit(draft.id, {
                        operatingLocation: event.target.value,
                      })
                    }
                    placeholder="e.g. Head Office"
                  />
                </FormField>
                <FormField
                  label="Responsibility"
                  htmlFor={`${draft.id}-responsibility`}
                  required
                >
                  <Textarea
                    id={`${draft.id}-responsibility`}
                    value={draft.responsibility}
                    disabled={creating}
                    rows={2}
                    onChange={(event) =>
                      updateUnit(draft.id, {
                        responsibility: event.target.value,
                      })
                    }
                    placeholder="What this unit is accountable for"
                  />
                </FormField>
              </div>
            </section>
          ))}
        </SectionList>
      ) : null}

      {phase === "users" ? (
        <SectionList
          addLabel="Add invite"
          disabled={creating}
          onAdd={() =>
            setInvites((current) => [...current, emptyAliceInviteDraft()])
          }
        >
          {invites.map((draft, index) => (
            <section
              key={draft.id}
              className="rounded-lg border border-border bg-surface px-3.5 py-3"
              aria-label={`Invite ${index + 1}`}
            >
              <RowHeader
                title={`Invite ${index + 1}`}
                disabled={creating || invites.length <= 1}
                onRemove={() =>
                  setInvites((current) =>
                    current.length <= 1
                      ? current
                      : current.filter((row) => row.id !== draft.id)
                  )
                }
              />
              <div className="space-y-3">
                <FormField label="Email" htmlFor={`${draft.id}-email`} required>
                  <Input
                    id={`${draft.id}-email`}
                    type="email"
                    value={draft.email}
                    disabled={creating}
                    onChange={(event) =>
                      updateInvite(draft.id, { email: event.target.value })
                    }
                    placeholder="name@company.com"
                  />
                </FormField>
                <FormField label="Role" htmlFor={`${draft.id}-role`} required>
                  <select
                    id={`${draft.id}-role`}
                    className="ims-select ims-field"
                    value={draft.role}
                    disabled={creating}
                    onChange={(event) =>
                      updateInvite(draft.id, {
                        role: event.target.value as InvitationRole,
                      })
                    }
                  >
                    {INVITATION_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
            </section>
          ))}
        </SectionList>
      ) : null}

      {phase === "premises" ? (
        <SectionList
          addLabel="Add premise"
          disabled={creating || readyUnits.length === 0}
          onAdd={() =>
            setPremises((current) => [
              ...current,
              emptyAlicePremiseDraft(readyUnits[0]?.id ?? units[0]?.id ?? ""),
            ])
          }
        >
          {readyUnits.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add at least one ready business unit before registering a premise.
            </p>
          ) : null}
          {premises.map((draft, index) => (
            <section
              key={draft.id}
              className="rounded-lg border border-border bg-surface px-3.5 py-3"
              aria-label={`Premise ${index + 1}`}
            >
              <RowHeader
                title={`Premise ${index + 1}`}
                disabled={creating || premises.length <= 1}
                onRemove={() =>
                  setPremises((current) =>
                    current.length <= 1
                      ? current
                      : current.filter((row) => row.id !== draft.id)
                  )
                }
              />
              <div className="space-y-3">
                <FormField label="Name" htmlFor={`${draft.id}-name`} required>
                  <Input
                    id={`${draft.id}-name`}
                    value={draft.name}
                    disabled={creating}
                    onChange={(event) =>
                      updatePremise(draft.id, { name: event.target.value })
                    }
                    placeholder="e.g. Head Office"
                  />
                </FormField>
                <FormField
                  label="Location"
                  htmlFor={`${draft.id}-location`}
                  required
                >
                  <Input
                    id={`${draft.id}-location`}
                    value={draft.location}
                    disabled={creating}
                    onChange={(event) =>
                      updatePremise(draft.id, { location: event.target.value })
                    }
                    placeholder="e.g. Manchester"
                  />
                </FormField>
                <FormField
                  label="Address"
                  htmlFor={`${draft.id}-address`}
                  required
                >
                  <Textarea
                    id={`${draft.id}-address`}
                    value={draft.address}
                    disabled={creating}
                    rows={2}
                    onChange={(event) =>
                      updatePremise(draft.id, { address: event.target.value })
                    }
                    placeholder="Street, city, postcode"
                  />
                </FormField>
                <FormField
                  label="Business unit"
                  htmlFor={`${draft.id}-unit`}
                  required
                >
                  <select
                    id={`${draft.id}-unit`}
                    className="ims-select ims-field"
                    value={draft.unitDraftId}
                    disabled={creating}
                    onChange={(event) =>
                      updatePremise(draft.id, {
                        unitDraftId: event.target.value,
                      })
                    }
                  >
                    {units
                      .filter((unit) => unit.name.trim() || unit.id === draft.unitDraftId)
                      .map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name.trim() || "Untitled unit"}
                        </option>
                      ))}
                  </select>
                </FormField>
              </div>
            </section>
          ))}
        </SectionList>
      ) : null}

      <p className="mt-4 text-[0.75rem] text-muted-foreground">
        Ready: {readyUnits.length} unit{readyUnits.length === 1 ? "" : "s"},{" "}
        {readyInvites.length} invite{readyInvites.length === 1 ? "" : "s"},{" "}
        {readyPremises.length} premise
        {readyPremises.length === 1 ? "" : "s"}.
      </p>
    </AppSheet>
  );
}

function SectionList({
  children,
  addLabel,
  onAdd,
  disabled,
}: {
  children: ReactNode;
  addLabel: string;
  onAdd: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      {children}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={onAdd}
      >
        <Plus className="size-4" aria-hidden />
        {addLabel}
      </Button>
    </div>
  );
}

function RowHeader({
  title,
  onRemove,
  disabled,
}: {
  title: string;
  onRemove: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={disabled}
        aria-label={`Remove ${title}`}
        onClick={onRemove}
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>
    </div>
  );
}
