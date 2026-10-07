export type SystemAccessStatus = "Active" | "Blocked" | "Deactivated" | string;
export type UserType = "Internal" | "External" | string;
export type EmailVerificationStatus = "pending" | "verified" | string;

export type UserListItem = {
  id: string;
  reference: string;
  name: string;
  email: string;
  systemAccess: {
    status: string;
  };
  loggedIn: {
    status: string | null;
    on: string | null;
  };
};

export type OrgMembershipSummary = {
  userId: string;
  role: string;
  jobTitle?: string | null;
};

export type UserDirectoryRow = {
  user: UserListItem;
  membership: OrgMembershipSummary | null;
};

export type PaginatedUsers = {
  items: UserDirectoryRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ListUsersParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

/** Full user identity returned by GET /users/:id (classified-info). */
export type User = {
  id: string;
  reference: string;
  type: UserType;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  emailVerified: {
    status: EmailVerificationStatus;
    on: string | null;
  };
  phone: string;
  phoneVerified: {
    status: EmailVerificationStatus;
    on: string | null;
  };
  systemPasswordStatus: string;
  systemAccess: {
    status: SystemAccessStatus;
    period: string;
    expires: string | null;
    updatedOn: string | null;
  };
  accessPolicies: Array<{ groupId: string; roleId?: string }>;
  profileImage: {
    url: string;
    fileName?: string;
    storageKey?: string;
  };
  signatureInfo: {
    url?: string;
    fileName?: string;
    storageKey?: string;
  };
  preferences: {
    darkMode: boolean;
    activeTheme: string;
  };
  country: {
    name: string;
    code: string;
  };
  locations: Array<{
    id: string;
    type: string;
    address: string;
  }>;
  loggedIn: {
    status: string | null;
    on: string | null;
  };
  createdBy: string | null;
  createdOn: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Organisation membership projection from Users detail APIs.
 * Salary is intentionally not rendered in the UI (sensitive).
 */
export type OrgMembershipView = {
  userId: string;
  role: string;
  jobTitle?: string | null;
  salary?: number | null;
  workLocationType?: string | null;
  country?: string | null;
  leaveDaysEntitled?: number | null;
  toilBalance?: number | null;
  lineManagerIds?: string[];
  groupIds?: string[];
};

export type UserWithMembership = {
  user: User;
  membership: OrgMembershipView | null;
};

export type UpdateUserProfileInput = {
  firstName?: string;
  lastName?: string;
};
