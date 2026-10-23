import { useEffect, useState, type FormEvent } from "react";
import { AppSheet } from "@/shared/components/app-sheet";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { notify } from "@/shared/lib/toast";
import {
  useUpdateUserEmploymentMutation,
  useUsersQuery,
} from "../hooks/use-users";
import type {
  MembershipWorkShiftView,
  OrgMembershipView,
  UpdateEmploymentInput,
} from "../types";

const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

type Weekday = (typeof WEEKDAYS)[number];

const COUNTRIES = [
  { name: "United Kingdom", code: "GB" },
  { name: "Ireland", code: "IE" },
  { name: "United States", code: "US" },
  { name: "Canada", code: "CA" },
  { name: "Australia", code: "AU" },
  { name: "India", code: "IN" },
  { name: "Germany", code: "DE" },
  { name: "France", code: "FR" },
];

type ManageEmploymentSheetProps = {
  open: boolean;
  userId: string;
  membership: OrgMembershipView;
  onOpenChange: (open: boolean) => void;
};

function emptyShift(timezone = "UTC"): MembershipWorkShiftView {
  return {
    timezone,
    monday: null,
    tuesday: null,
    wednesday: null,
    thursday: null,
    friday: null,
    saturday: null,
    sunday: null,
  };
}

/**
 * V4 MembershipForm parity — employment + operating hours on org membership.
 */
export function ManageEmploymentSheet({
  open,
  userId,
  membership,
  onOpenChange,
}: ManageEmploymentSheetProps) {
  const usersQuery = useUsersQuery({ page: 1, pageSize: 100 });
  const mutation = useUpdateUserEmploymentMutation(userId);

  const [jobTitle, setJobTitle] = useState(membership.jobTitle || "Not set");
  const [workLocationType, setWorkLocationType] = useState(
    membership.workLocationType === "Remote" ? "Remote" : "On-site"
  );
  const [salary, setSalary] = useState(String(membership.salary ?? 0));
  const [countryCode, setCountryCode] = useState(
    membership.countryCode || "GB"
  );
  const [leaveDays, setLeaveDays] = useState(
    String(membership.leaveDaysEntitled ?? 0)
  );
  const [lineManagerIds, setLineManagerIds] = useState(
    membership.lineManagerIds ?? []
  );
  const [workShift, setWorkShift] = useState<MembershipWorkShiftView>(
    membership.workShift ?? emptyShift()
  );

  useEffect(() => {
    if (!open) return;
    setJobTitle(membership.jobTitle || "Not set");
    setWorkLocationType(
      membership.workLocationType === "Remote" ? "Remote" : "On-site"
    );
    setSalary(String(membership.salary ?? 0));
    setCountryCode(membership.countryCode || "GB");
    setLeaveDays(String(membership.leaveDaysEntitled ?? 0));
    setLineManagerIds(membership.lineManagerIds ?? []);
    setWorkShift(membership.workShift ?? emptyShift());
  }, [open, membership]);

  // Include self so solo orgs can assign the member as their own line manager for testing.
  const options = (usersQuery.data?.items ?? []).map((row) => row.user);

  function toggleDay(day: Weekday, enabled: boolean) {
    setWorkShift((prev) => ({
      ...prev,
      [day]: enabled ? { start: "09:00", end: "17:00" } : null,
    }));
  }

  function setDayTime(day: Weekday, field: "start" | "end", value: string) {
    setWorkShift((prev) => {
      const current = prev[day] ?? { start: "09:00", end: "17:00" };
      return { ...prev, [day]: { ...current, [field]: value } };
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!jobTitle.trim()) {
      notify.error("Job title is required");
      return;
    }
    const country =
      COUNTRIES.find((item) => item.code === countryCode) ??
      COUNTRIES[0] ??
      { name: "United Kingdom", code: "GB" };
    const body: UpdateEmploymentInput = {
      jobTitle: jobTitle.trim(),
      workLocationType: workLocationType as "On-site" | "Remote",
      salary: Number(salary) || 0,
      countryName: country.name,
      countryCode: country.code,
      leaveDaysEntitled: Number(leaveDays) || 0,
      lineManagerIds,
      workShift: {
        ...workShift,
        timezone:
          workShift.timezone ||
          Intl.DateTimeFormat().resolvedOptions().timeZone ||
          "UTC",
      },
    };
    try {
      await mutation.mutateAsync(body);
      notify.success("Employment details updated.");
      onOpenChange(false);
    } catch (error) {
      notify.fromError(error, "Unable to update employment details");
    }
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Manage employment"
      description="Job details, line managers, leave entitlement, and operating hours for this organisation."
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
            type="submit"
            form="manage-employment-form"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Saving…" : "Update"}
          </Button>
        </>
      }
    >
      <form
        id="manage-employment-form"
        className="space-y-4"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <FormField label="Job title" htmlFor="emp-job-title" required>
          <Input
            id="emp-job-title"
            value={jobTitle}
            onChange={(event) => setJobTitle(event.target.value)}
          />
        </FormField>

        <FormField label="Working place" htmlFor="emp-place" required>
          <select
            id="emp-place"
            className="ims-select"
            value={workLocationType}
            onChange={(event) => setWorkLocationType(event.target.value)}
          >
            <option value="On-site">On-site</option>
            <option value="Remote">Remote</option>
          </select>
        </FormField>

        <FormField label="Salary (optional)" htmlFor="emp-salary">
          <Input
            id="emp-salary"
            type="number"
            min={0}
            value={salary}
            onChange={(event) => setSalary(event.target.value)}
          />
        </FormField>

        <FormField label="Line managers" htmlFor="emp-managers">
          <select
            id="emp-managers"
            className="ims-select min-h-24"
            multiple
            value={lineManagerIds}
            onChange={(event) => {
              setLineManagerIds(
                Array.from(event.target.selectedOptions).map(
                  (option) => option.value
                )
              );
            }}
          >
            {options.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name || candidate.email}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Hold Ctrl/Cmd to select multiple. Used for leave approvals.
          </p>
        </FormField>

        <FormField label="Country" htmlFor="emp-country">
          <select
            id="emp-country"
            className="ims-select"
            value={countryCode}
            onChange={(event) => setCountryCode(event.target.value)}
          >
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Annual leave entitlement"
          htmlFor="emp-leave-days"
        >
          <Input
            id="emp-leave-days"
            type="number"
            min={0}
            value={leaveDays}
            onChange={(event) => setLeaveDays(event.target.value)}
          />
        </FormField>

        <div className="space-y-2">
          <p className="text-sm font-medium">Operating hours</p>
          <p className="text-xs text-muted-foreground">
            Please capture your working hours below. This information will be
            visible to your line manager(s).
          </p>
          <div className="space-y-2">
            {WEEKDAYS.map((day) => {
              const hours = workShift[day];
              const enabled = Boolean(hours);
              return (
                <div
                  key={day}
                  className="grid gap-2 rounded-md border border-border px-3 py-2 sm:grid-cols-[7rem_auto_1fr_1fr] sm:items-center"
                >
                  <label className="flex items-center gap-2 text-sm capitalize">
                    <input
                      type="checkbox"
                      className="size-3.5 rounded border-border"
                      checked={enabled}
                      onChange={(event) =>
                        toggleDay(day, event.target.checked)
                      }
                    />
                    {day}
                  </label>
                  {enabled ? (
                    <>
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        Hours
                      </span>
                      <Input
                        type="time"
                        value={hours?.start ?? "09:00"}
                        onChange={(event) =>
                          setDayTime(day, "start", event.target.value)
                        }
                      />
                      <Input
                        type="time"
                        value={hours?.end ?? "17:00"}
                        onChange={(event) =>
                          setDayTime(day, "end", event.target.value)
                        }
                      />
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground sm:col-span-3">
                      Off
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </form>
    </AppSheet>
  );
}
