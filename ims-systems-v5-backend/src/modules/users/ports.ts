/**
 * Cross-module ports required by Users.
 * Real Membership / Auth / Notification / Ownership modules replace stubs later.
 */

import type {
  OrgMembershipView,
  OwnershipCheckResult,
  UpdateEmploymentInput,
  User,
} from "./types";

export interface MembershipLookupPort {
  listByOrganization(
    organizationId: string
  ): Promise<OrgMembershipView[]>;
  findByOrganizationAndUser(
    organizationId: string,
    userId: string
  ): Promise<OrgMembershipView | null>;
  /** Optional — Leaves line-manager assignment (auth0-openfga adapter). */
  setLineManagerIds?(
    organizationId: string,
    userId: string,
    lineManagerIds: string[]
  ): Promise<OrgMembershipView | null>;
  /** Optional — V4 MembershipForm employment update. */
  updateEmployment?(
    organizationId: string,
    userId: string,
    input: UpdateEmploymentInput
  ): Promise<OrgMembershipView | null>;
}

/**
 * Development adapter — Membership module is not implemented yet.
 * Treats every Active, non-deleted user as a member of the caller's
 * organisation so directory APIs remain testable.
 *
 * Demo job titles/roles are assigned for known seed user ids so the
 * Users UI is readable during local UI review.
 */
/** Matches `pnpm seed:demo` unit memberships so profile BU cards resolve. */
const DEMO_UNITS = {
  operations: "200000000000000000000001",
  it: "200000000000000000000002",
  compliance: "200000000000000000000003",
  externalAudit: "200000000000000000000004",
  partners: "200000000000000000000005",
} as const;

const DEMO_MEMBERSHIP_META: Record<
  string,
  {
    role: string;
    jobTitle: string;
    groupIds: string[];
    /** Line managers for Leaves approval (demo graph). */
    lineManagerIds?: string[];
  }
> = {
  "100000000000000000000001": {
    role: "Super User",
    jobTitle: "Head of Operations",
    groupIds: [DEMO_UNITS.operations, DEMO_UNITS.compliance],
  },
  "100000000000000000000002": {
    role: "Basic User",
    jobTitle: "Operations Analyst",
    groupIds: [DEMO_UNITS.operations, DEMO_UNITS.partners],
    lineManagerIds: ["100000000000000000000001"],
  },
  "100000000000000000000003": {
    role: "Hos User",
    jobTitle: "Delivery Lead",
    groupIds: [DEMO_UNITS.operations, DEMO_UNITS.externalAudit],
    lineManagerIds: ["100000000000000000000001"],
  },
  "100000000000000000000004": {
    role: "Auditor User",
    jobTitle: "Compliance Manager",
    groupIds: [DEMO_UNITS.compliance],
    lineManagerIds: ["100000000000000000000001"],
  },
  "100000000000000000000005": {
    role: "Super User",
    jobTitle: "Engineering Lead",
    groupIds: [DEMO_UNITS.it],
  },
  "100000000000000000000006": {
    role: "Basic User",
    jobTitle: "Software Engineer",
    groupIds: [DEMO_UNITS.it],
    lineManagerIds: ["100000000000000000000005"],
  },
};

type EmploymentOverride = Partial<
  Omit<OrgMembershipView, "userId" | "role" | "groupIds">
>;

export class DevAllActiveUsersMembershipAdapter
  implements MembershipLookupPort
{
  private readonly overrides = new Map<string, EmploymentOverride>();

  constructor(
    private readonly listActiveUsers: () => Promise<
      Array<Pick<User, "id">>
    >
  ) {}

  async listByOrganization(
    _organizationId: string
  ): Promise<OrgMembershipView[]> {
    const users = await this.listActiveUsers();
    return users.map((user) => this.membershipFor(user.id));
  }

  async findByOrganizationAndUser(
    _organizationId: string,
    userId: string
  ): Promise<OrgMembershipView | null> {
    const users = await this.listActiveUsers();
    const found = users.find((user) => user.id === userId);
    if (!found) return null;
    return this.membershipFor(userId);
  }

  async setLineManagerIds(
    _organizationId: string,
    userId: string,
    lineManagerIds: string[]
  ): Promise<OrgMembershipView | null> {
    const users = await this.listActiveUsers();
    if (!users.some((user) => user.id === userId)) return null;
    const prev = this.overrides.get(userId) ?? {};
    this.overrides.set(userId, {
      ...prev,
      lineManagerIds: [...new Set(lineManagerIds.filter(Boolean))],
    });
    return this.membershipFor(userId);
  }

  async updateEmployment(
    _organizationId: string,
    userId: string,
    input: UpdateEmploymentInput
  ): Promise<OrgMembershipView | null> {
    const users = await this.listActiveUsers();
    if (!users.some((user) => user.id === userId)) return null;
    const prev = this.overrides.get(userId) ?? {};
    this.overrides.set(userId, {
      ...prev,
      jobTitle: input.jobTitle,
      workLocationType: input.workLocationType,
      salary: input.salary ?? 0,
      country: input.countryName,
      countryCode: input.countryCode,
      leaveDaysEntitled: input.leaveDaysEntitled ?? 0,
      lineManagerIds: input.lineManagerIds
        ? [...new Set(input.lineManagerIds.filter(Boolean))]
        : prev.lineManagerIds,
      workShift: input.workShift ?? prev.workShift ?? null,
    });
    return this.membershipFor(userId);
  }

  private membershipFor(userId: string): OrgMembershipView {
    const meta = DEMO_MEMBERSHIP_META[userId];
    const overridden = this.overrides.get(userId);
    return {
      userId,
      role: meta?.role ?? "Basic User",
      jobTitle: overridden?.jobTitle ?? meta?.jobTitle ?? "Not set",
      salary: overridden?.salary ?? 0,
      workLocationType: overridden?.workLocationType ?? "On-site",
      country: overridden?.country ?? "United Kingdom",
      countryCode: overridden?.countryCode ?? "GB",
      leaveDaysEntitled: overridden?.leaveDaysEntitled ?? 0,
      toilBalance: overridden?.toilBalance ?? 0,
      groupIds: meta?.groupIds ?? [],
      lineManagerIds: overridden?.lineManagerIds
        ? [...overridden.lineManagerIds]
        : meta?.lineManagerIds
          ? [...meta.lineManagerIds]
          : [],
      workShift: overridden?.workShift ?? {
        timezone: "UTC",
        monday: { start: "09:00", end: "17:00" },
        tuesday: { start: "09:00", end: "17:00" },
        wednesday: { start: "09:00", end: "17:00" },
        thursday: { start: "09:00", end: "17:00" },
        friday: { start: "09:00", end: "17:00" },
        saturday: null,
        sunday: null,
      },
    };
  }
}

export interface SessionPort {
  clearSessionsForUser(userId: string): Promise<void>;
}

/** Development adapter — session clearing belongs to Authentication. */
export class NoOpSessionAdapter implements SessionPort {
  async clearSessionsForUser(_userId: string): Promise<void> {
    return;
  }
}

export interface UserNotificationPort {
  sendWelcome(
    email: string,
    name: string,
    organizationId?: string
  ): Promise<void>;
  sendAccessRevoked(
    email: string,
    name: string,
    organizationId?: string
  ): Promise<void>;
  resendEmailVerification(
    email: string,
    name: string,
    organizationId?: string
  ): Promise<void>;
}

/** Development adapter — email delivery not available yet. */
export class NoOpUserNotificationAdapter implements UserNotificationPort {
  async sendWelcome(
    _email: string,
    _name: string,
    _organizationId?: string
  ): Promise<void> {
    return;
  }
  async sendAccessRevoked(
    _email: string,
    _name: string,
    _organizationId?: string
  ): Promise<void> {
    return;
  }
  async resendEmailVerification(
    _email: string,
    _name: string,
    _organizationId?: string
  ): Promise<void> {
    return;
  }
}

export interface OwnershipIntegrityPort {
  check(input: {
    organizationId: string;
    userId: string;
  }): Promise<OwnershipCheckResult>;
  transfer(input: {
    organizationId: string;
    sourceUserId: string;
    destinationUserId: string;
    initiatorUserId: string;
  }): Promise<void>;
}

/**
 * Development adapter — multi-module ownership integrity is deferred.
 * Reports no owned data so soft-delete can proceed in isolation.
 */
export class NoOpOwnershipIntegrityAdapter
  implements OwnershipIntegrityPort
{
  async check(_input: {
    organizationId: string;
    userId: string;
  }): Promise<OwnershipCheckResult> {
    return { hasOwnedData: false, inProgress: false, modules: [] };
  }

  async transfer(_input: {
    organizationId: string;
    sourceUserId: string;
    destinationUserId: string;
    initiatorUserId: string;
  }): Promise<void> {
    return;
  }
}

export interface ComplianceToolkitPort {
  assignToolkits(input: {
    organizationId: string;
    userId: string;
    toolkitIds: string[];
  }): Promise<void>;
}

/** Development adapter — Organisation / IAM toolkit licensing deferred. */
export class NoOpComplianceToolkitAdapter implements ComplianceToolkitPort {
  async assignToolkits(_input: {
    organizationId: string;
    userId: string;
    toolkitIds: string[];
  }): Promise<void> {
    return;
  }
}
