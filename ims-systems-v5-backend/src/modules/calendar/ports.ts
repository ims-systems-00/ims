/**
 * Cross-module ports for Calendar.
 * Spec: docs/module-specifications/calendar.md §9 (visibility).
 */

/**
 * Role-based list visibility — IAM roles not yet on SecurityIdentity.
 * Development returns org-wide access (matches other V5 modules).
 *
 * Spec intent: Super Admin / Auditors → all; HoS / Basic → matching groupIds
 * or unassigned (empty groupIds).
 */
export type CalendarListScope =
  | { mode: "all" }
  | {
      mode: "businessUnits";
      businessUnitIds: string[];
    };

export type CalendarListScopePort = {
  resolveScope(input: {
    organizationId: string;
    subjectId: string;
  }): Promise<CalendarListScope>;
};

export class DevAllCalendarListScopeAdapter implements CalendarListScopePort {
  async resolveScope(): Promise<CalendarListScope> {
    return { mode: "all" };
  }
}
