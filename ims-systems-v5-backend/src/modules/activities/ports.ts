/**
 * Cross-module ports for Activities.
 * Spec: docs/module-specifications/activity.md §5 / §9
 */

/**
 * When an activity is created against an OFI (`cips`), promote Pending → In Progress.
 * Spec: only confirmed cross-module state change triggered by Activity creation.
 */
export type ActivityOfiFollowUpPort = {
  onCipActivityCreated(input: {
    organizationId: string;
    ofiId: string;
    actorId: string;
  }): Promise<void>;
};

export class NoOpActivityOfiFollowUpAdapter implements ActivityOfiFollowUpPort {
  async onCipActivityCreated(): Promise<void> {
    return;
  }
}

/**
 * Role-based group visibility (V4 list filter for Head of Service / Basic /
 * External users). IAM roles are not fully on SecurityIdentity yet —
 * development returns org-wide (no group filter).
 */
export type ActivityListScope =
  | { mode: "all" }
  | {
      mode: "groups";
      /** Include activities whose groupId is in this set OR null. */
      groupIds: string[];
      includeNullGroup: boolean;
    };

export type ActivityListScopePort = {
  resolveScope(input: {
    organizationId: string;
    subjectId: string;
  }): Promise<ActivityListScope>;
};

export class DevAllActivitiesListScopeAdapter
  implements ActivityListScopePort
{
  async resolveScope(): Promise<ActivityListScope> {
    return { mode: "all" };
  }
}
