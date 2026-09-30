/**
 * Cross-module ports required by Users.
 * Real Membership / Auth / Notification / Ownership modules replace stubs later.
 */

import type {
  OrgMembershipView,
  OwnershipCheckResult,
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
}

/**
 * Development adapter — Membership module is not implemented yet.
 * Treats every Active, non-deleted user as a member of the caller's
 * organisation so directory APIs remain testable.
 *
 * Demo job titles/roles are assigned for known seed user ids so the
 * Users UI is readable during local UI review.
 */
const DEMO_MEMBERSHIP_META: Record<
  string,
  { role: string; jobTitle: string }
> = {
  "100000000000000000000001": {
    role: "Super User",
    jobTitle: "Head of Operations",
  },
  "100000000000000000000002": {
    role: "Basic User",
    jobTitle: "Operations Analyst",
  },
  "100000000000000000000003": {
    role: "Hos User",
    jobTitle: "Delivery Lead",
  },
  "100000000000000000000004": {
    role: "Auditor User",
    jobTitle: "Compliance Manager",
  },
  "100000000000000000000005": {
    role: "Super User",
    jobTitle: "Engineering Lead",
  },
  "100000000000000000000006": {
    role: "Basic User",
    jobTitle: "Software Engineer",
  },
};

export class DevAllActiveUsersMembershipAdapter
  implements MembershipLookupPort
{
  constructor(
    private readonly listActiveUsers: () => Promise<
      Array<Pick<User, "id">>
    >
  ) {}

  async listByOrganization(
    _organizationId: string
  ): Promise<OrgMembershipView[]> {
    const users = await this.listActiveUsers();
    return users.map((user) => membershipFor(user.id));
  }

  async findByOrganizationAndUser(
    _organizationId: string,
    userId: string
  ): Promise<OrgMembershipView | null> {
    const users = await this.listActiveUsers();
    const found = users.find((user) => user.id === userId);
    if (!found) return null;
    return membershipFor(userId);
  }
}

function membershipFor(userId: string): OrgMembershipView {
  const meta = DEMO_MEMBERSHIP_META[userId];
  return {
    userId,
    role: meta?.role ?? "Basic User",
    jobTitle: meta?.jobTitle ?? null,
    salary: null,
    groupIds: [],
    lineManagerIds: [],
  };
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
  sendWelcome(email: string, name: string): Promise<void>;
  sendAccessRevoked(email: string, name: string): Promise<void>;
  resendEmailVerification(email: string, name: string): Promise<void>;
}

/** Development adapter — email delivery not available yet. */
export class NoOpUserNotificationAdapter implements UserNotificationPort {
  async sendWelcome(_email: string, _name: string): Promise<void> {
    return;
  }
  async sendAccessRevoked(_email: string, _name: string): Promise<void> {
    return;
  }
  async resendEmailVerification(
    _email: string,
    _name: string
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
