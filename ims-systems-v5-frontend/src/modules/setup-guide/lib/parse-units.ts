import type {
  AliceDraftInvite,
  AliceDraftPremise,
  AliceDraftUnit,
} from "../types";

const DEFAULT_LOCATION = "Head Office";
const DEFAULT_RESPONSIBILITY =
  "Accountable for day-to-day delivery in this unit.";

let draftSeq = 0;

export function createAliceDraftId(prefix = "alice"): string {
  draftSeq += 1;
  return `${prefix}-${Date.now()}-${draftSeq}`;
}

/** Mandatory-field starter rows for business units. */
export function defaultAliceOrgDrafts(): AliceDraftUnit[] {
  return [
    {
      id: createAliceDraftId("fu"),
      name: "HR Team",
      operatingLocation: "The Hive, Oldham",
      accessType: "Internal business function",
      responsibility:
        "People, payroll and workplace policies for the organisation.",
    },
    {
      id: createAliceDraftId("fu"),
      name: "Operations",
      operatingLocation: DEFAULT_LOCATION,
      accessType: "Internal business function",
      responsibility: "Delivery of core services and operational performance.",
    },
    {
      id: createAliceDraftId("fu"),
      name: "Quality Assurance",
      operatingLocation: DEFAULT_LOCATION,
      accessType: "Internal business function",
      responsibility: "Quality management and continuous improvement.",
    },
  ];
}

export function emptyAliceOrgDraft(): AliceDraftUnit {
  return {
    id: createAliceDraftId("fu"),
    name: "",
    operatingLocation: DEFAULT_LOCATION,
    accessType: "Internal business function",
    responsibility: DEFAULT_RESPONSIBILITY,
  };
}

export function isAliceOrgDraftReady(draft: AliceDraftUnit): boolean {
  return (
    draft.name.trim().length > 0 &&
    draft.responsibility.trim().length > 0 &&
    draft.operatingLocation.trim().length > 0
  );
}

/** Starter invitations (email + role). */
export function defaultAliceInviteDrafts(): AliceDraftInvite[] {
  return [
    {
      id: createAliceDraftId("invite"),
      email: "alex.manager@example.com",
      role: "Head of Service",
    },
    {
      id: createAliceDraftId("invite"),
      email: "sam.member@example.com",
      role: "Basic User",
    },
  ];
}

export function emptyAliceInviteDraft(): AliceDraftInvite {
  return {
    id: createAliceDraftId("invite"),
    email: "",
    role: "Basic User",
  };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isAliceInviteDraftReady(draft: AliceDraftInvite): boolean {
  return EMAIL_PATTERN.test(draft.email.trim().toLowerCase());
}

/** Starter premises linked to the first unit draft by default. */
export function defaultAlicePremiseDrafts(
  units: AliceDraftUnit[]
): AliceDraftPremise[] {
  const firstUnitId = units[0]?.id ?? "";
  return [
    {
      id: createAliceDraftId("premise"),
      name: "Head Office",
      location: "Manchester",
      address: "1 High Street, Manchester, M1 1AA",
      unitDraftId: firstUnitId,
    },
  ];
}

export function emptyAlicePremiseDraft(
  unitDraftId: string
): AliceDraftPremise {
  return {
    id: createAliceDraftId("premise"),
    name: "",
    location: DEFAULT_LOCATION,
    address: "",
    unitDraftId,
  };
}

export function isAlicePremiseDraftReady(
  draft: AliceDraftPremise,
  unitIds: Set<string>
): boolean {
  return (
    draft.name.trim().length > 0 &&
    draft.location.trim().length > 0 &&
    draft.address.trim().length > 0 &&
    unitIds.has(draft.unitDraftId)
  );
}

/**
 * Parse Alice paste lines into functional-unit drafts.
 * Location defaults to Head Office when omitted (business type requires it).
 */
export function parseAliceUnitLines(raw: string): AliceDraftUnit[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const drafts: AliceDraftUnit[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const parts = line.split(/\s*[—–-]\s+/);
    const name = (parts[0] ?? "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const location = parts.slice(1).join(" — ").trim();
    drafts.push({
      id: createAliceDraftId("fu"),
      name,
      operatingLocation: location || DEFAULT_LOCATION,
      accessType: "Internal business function",
      responsibility: DEFAULT_RESPONSIBILITY,
    });
  }

  return drafts;
}
