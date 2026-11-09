/**
 * Org-scoped people / functional-unit name lookup for Alice filters.
 */

import { createOrganisationMembershipRepository } from "../../organisation/repositories/organisation-membership.repository";
import { createFunctionalUnitRepository } from "../../functional-units/repositories/functional-unit.repository";
import { createUserRepository } from "../../users/repositories/user.repository";

export type AliceDirectoryMatch = {
  id: string;
  name: string;
  kind: "person" | "unit";
  email?: string | null;
  reference?: string | null;
};

export type AliceDirectoryResult = {
  query: string;
  people: AliceDirectoryMatch[];
  units: AliceDirectoryMatch[];
};

const MAX_MATCHES = 8;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Resolve people and/or functional units by name fragment within an organisation.
 */
export async function resolveAliceDirectory(input: {
  organizationId: string;
  query: string;
  kind?: "people" | "units" | "both";
}): Promise<AliceDirectoryResult> {
  const query = input.query.trim();
  const kind = input.kind ?? "both";
  const people: AliceDirectoryMatch[] = [];
  const units: AliceDirectoryMatch[] = [];

  if (query.length < 2) {
    return { query, people, units };
  }

  if (kind === "people" || kind === "both") {
    const memberships =
      await createOrganisationMembershipRepository().listByOrganization(
        input.organizationId
      );
    const memberIds = memberships.map((row) => row.userId).filter(Boolean);
    if (memberIds.length > 0) {
      const users = createUserRepository();
      const listed = await users.listActiveByIds(memberIds, {
        search: query,
        page: 1,
        pageSize: MAX_MATCHES,
      });
      for (const user of listed.items) {
        people.push({
          id: user.id,
          name:
            user.name?.trim() ||
            `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
            user.email,
          kind: "person",
          email: user.email ?? null,
        });
      }
    }
  }

  if (kind === "units" || kind === "both") {
    const fus = createFunctionalUnitRepository();
    const listed = await fus.list(input.organizationId, {
      page: 1,
      pageSize: MAX_MATCHES,
      search: query,
    });
    for (const unit of listed.items) {
      units.push({
        id: unit.id,
        name: unit.name,
        kind: "unit",
        reference: unit.reference ?? null,
      });
    }
  }

  return { query, people, units };
}

/**
 * Resolve a free-text name to up to N user ids (empty if none).
 */
export async function resolvePersonIdsByName(
  organizationId: string,
  name: string,
  limit = 5
): Promise<{ ids: string[]; matches: AliceDirectoryMatch[] }> {
  const result = await resolveAliceDirectory({
    organizationId,
    query: name,
    kind: "people",
  });
  const matches = result.people.slice(0, limit);
  return { ids: matches.map((m) => m.id), matches };
}

/**
 * Resolve a free-text unit name to up to N functional-unit ids.
 */
export async function resolveUnitIdsByName(
  organizationId: string,
  name: string,
  limit = 5
): Promise<{ ids: string[]; matches: AliceDirectoryMatch[] }> {
  const result = await resolveAliceDirectory({
    organizationId,
    query: name,
    kind: "units",
  });
  const matches = result.units.slice(0, limit);
  return { ids: matches.map((m) => m.id), matches };
}

export function personNameFromMessage(message: string): {
  role: "raisedBy" | "owner" | "assignee" | "unit";
  name: string;
} | null {
  const text = message.trim();
  const patterns: Array<{
    role: "raisedBy" | "owner" | "assignee" | "unit";
    re: RegExp;
  }> = [
    {
      role: "raisedBy",
      re: /\b(?:raised|created|logged|reported)\s+by\s+([A-Za-z][A-Za-z0-9.' -]{1,60})/i,
    },
    {
      role: "owner",
      re: /\b(?:owned|owner)\s+by\s+([A-Za-z][A-Za-z0-9.' -]{1,60})/i,
    },
    {
      role: "assignee",
      re: /\b(?:assigned\s+to|assignee)\s+([A-Za-z][A-Za-z0-9.' -]{1,60})/i,
    },
    {
      role: "unit",
      re: /\b(?:for|in|from)\s+(?:the\s+)?(?:functional\s+)?unit\s+([A-Za-z][A-Za-z0-9.' -]{1,60})/i,
    },
  ];
  for (const row of patterns) {
    const match = text.match(row.re);
    if (!match?.[1]) continue;
    const name = match[1].replace(/[?.!,;:]+$/g, "").trim();
    if (name.length < 2) continue;
    return { role: row.role, name };
  }
  return null;
}

export { escapeRegex };
