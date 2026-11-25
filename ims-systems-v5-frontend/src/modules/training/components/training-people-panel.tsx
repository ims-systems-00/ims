import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, UserPlus } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { EntityTableRow } from "@/shared/components/entity-table-row";
import { FormField } from "@/shared/components/form-field";
import { SearchInput } from "@/shared/components/search-input";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import {
  useAddExternalPersonMutation,
  usePeopleQuery,
  useRolesQuery,
  useTrainingSettingsQuery,
} from "../hooks/use-training";
import { externalPersonFormSchema } from "../schemas";
import { TRAINING_PERSON_STATUSES } from "../types";
import { TrainingPersonStatusBadge } from "./training-badges";

type TrainingPeoplePanelProps = {
  onOpenPerson: (id: string) => void;
  onCreate: () => void;
  canCreate?: boolean;
};

export function TrainingPeoplePanel({
  onOpenPerson,
  onCreate,
  canCreate = true,
}: TrainingPeoplePanelProps) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [site, setSite] = useState("");
  const [role, setRole] = useState("");
  const [externalOpen, setExternalOpen] = useState(false);
  const [extName, setExtName] = useState("");
  const [extEmail, setExtEmail] = useState("");
  const [extCompany, setExtCompany] = useState("");

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const params = useMemo(
    () => ({
      search: search || undefined,
      status: (status || undefined) as
        | (typeof TRAINING_PERSON_STATUSES)[number]
        | undefined,
      site: site || undefined,
      role: role || undefined,
    }),
    [search, status, site, role]
  );

  const peopleQuery = usePeopleQuery(params);
  const rolesQuery = useRolesQuery();
  const settingsQuery = useTrainingSettingsQuery();
  const addExternal = useAddExternalPersonMutation();

  const people = peopleQuery.data ?? [];
  const roles = rolesQuery.data ?? [];
  const sites = settingsQuery.data?.sites ?? [];
  const roleName = (id: string) =>
    roles.find((r) => r.id === id || r.key === id)?.name ?? id;

  async function handleExternal() {
    const parsed = externalPersonFormSchema.safeParse({
      name: extName,
      email: extEmail,
      company: extCompany,
    });
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }
    try {
      const person = await addExternal.mutateAsync({
        name: parsed.data.name,
        email: parsed.data.email,
        company: parsed.data.company || undefined,
      });
      notify.success("External person added");
      setExternalOpen(false);
      setExtName("");
      setExtEmail("");
      setExtCompany("");
      onOpenPerson(person.id);
    } catch (error) {
      notify.fromError(error, "Unable to add external person");
    }
  }

  return (
    <div className="space-y-4">
      <div className="ims-toolbar flex-wrap">
        <SearchInput
          placeholder="Search name, email, company…"
          aria-label="Search people"
          containerClassName="min-w-[14rem] flex-1"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select
          className="ims-select ims-field-sm w-auto min-w-[8rem]"
          value={status}
          aria-label="Filter by status"
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {TRAINING_PERSON_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="ims-select ims-field-sm w-auto min-w-[8rem]"
          value={site}
          aria-label="Filter by site"
          onChange={(e) => setSite(e.target.value)}
        >
          <option value="">All sites</option>
          {sites.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="ims-select ims-field-sm w-auto min-w-[8rem]"
          value={role}
          aria-label="Filter by role"
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">All roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        {canCreate ? (
          <>
            <Button type="button" size="sm" onClick={onCreate}>
              <Plus className="size-3.5" /> Add person
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setExternalOpen(true)}
            >
              <UserPlus className="size-3.5" /> External
            </Button>
          </>
        ) : null}
      </div>

      {peopleQuery.isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading people…
        </div>
      ) : people.length === 0 ? (
        <EmptyState
          title="No people found"
          description="Organisation members appear here automatically. Add external contractors separately if needed."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-subtle">
          <table className="ims-table w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Roles</th>
                <th>Site</th>
                <th>Status</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <EntityTableRow key={p.id} onOpen={() => onOpenPerson(p.id)}>
                  <td>
                    <div className="font-medium">
                      {p.name}
                      {p.external ? (
                        <span className="ims-text-meta ml-1">· external</span>
                      ) : null}
                    </div>
                    {p.company ? (
                      <div className="ims-text-meta">{p.company}</div>
                    ) : null}
                  </td>
                  <td className="text-sm text-muted-foreground">
                    {(p.roles || []).map(roleName).join(", ") || "—"}
                  </td>
                  <td>{p.site || "—"}</td>
                  <td>
                    <TrainingPersonStatusBadge status={p.status} />
                  </td>
                  <td className="text-sm text-muted-foreground">
                    {p.email || "—"}
                  </td>
                </EntityTableRow>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {externalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md space-y-4 rounded-xl border border-border-subtle bg-card p-5 shadow-lg">
            <h3 className="text-sm font-semibold">Add external attendee</h3>
            <FormField label="Name">
              <input
                className="ims-field"
                value={extName}
                onChange={(e) => setExtName(e.target.value)}
              />
            </FormField>
            <FormField label="Email">
              <input
                type="email"
                className="ims-field"
                value={extEmail}
                onChange={(e) => setExtEmail(e.target.value)}
              />
            </FormField>
            <FormField label="Company">
              <input
                className="ims-field"
                value={extCompany}
                onChange={(e) => setExtCompany(e.target.value)}
              />
            </FormField>
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={addExternal.isPending}
                onClick={() => void handleExternal()}
              >
                Add
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setExternalOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
