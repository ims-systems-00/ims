import type { OrganisationRole } from "../../modules/organisation/types";

/** OpenFGA relation names on type `organization`. */
export const OPENFGA_ORG_ROLE_RELATIONS = [
  "super_admin",
  "head_of_service",
  "basic",
  "auditor",
] as const;

export type OpenFgaOrgRoleRelation = (typeof OPENFGA_ORG_ROLE_RELATIONS)[number];

export type OpenFgaOrgPermissionRelation =
  | "can_read"
  | "can_create"
  | "can_update"
  | "can_delete"
  | "can_manage";

const ROLE_TO_RELATION: Record<OrganisationRole, OpenFgaOrgRoleRelation> = {
  "Super Admin": "super_admin",
  "Head of Service": "head_of_service",
  Basic: "basic",
  Auditor: "auditor",
};

export function organisationRoleToRelation(
  role: OrganisationRole
): OpenFgaOrgRoleRelation {
  return ROLE_TO_RELATION[role];
}

export function userObject(userId: string): string {
  return `user:${userId}`;
}

export function organizationObject(organizationId: string): string {
  return `organization:${organizationId}`;
}

/** Map Authorizer action → OpenFGA relation on organization (when org-scoped). */
export function organisationActionToRelation(
  action: string
): OpenFgaOrgPermissionRelation | null {
  switch (action) {
    case "read":
      return "can_read";
    case "create":
      return "can_create";
    case "update":
      return "can_update";
    case "delete":
      return "can_delete";
    case "manage":
      return "can_manage";
    default:
      return null;
  }
}
