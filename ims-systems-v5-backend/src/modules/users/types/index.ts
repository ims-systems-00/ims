/**
 * Users module domain types (global identity).
 * Organisation employment context lives on Membership (separate module).
 */

export const USER_TYPES = ["Internal", "External"] as const;
export type UserType = (typeof USER_TYPES)[number];

export const SYSTEM_ACCESS_STATUSES = [
  "Active",
  "Blocked",
  "Deactivated",
] as const;
export type SystemAccessStatus = (typeof SYSTEM_ACCESS_STATUSES)[number];

export const EMAIL_VERIFICATION_STATUSES = ["pending", "verified"] as const;
export type EmailVerificationStatus =
  (typeof EMAIL_VERIFICATION_STATUSES)[number];

export const SYSTEM_PASSWORD_STATUSES = ["active", "blocked"] as const;
export type SystemPasswordStatus = (typeof SYSTEM_PASSWORD_STATUSES)[number];

export type AccessPolicyBinding = {
  groupId: string;
  roleId?: string;
};

export type UserPreferences = {
  darkMode: boolean;
  activeTheme: string;
};

export type UserCountry = {
  name: string;
  code: string;
};

export type ProfileImage = {
  url: string;
  fileName?: string;
  storageKey?: string;
};

export type SignatureInfo = {
  url?: string;
  fileName?: string;
  storageKey?: string;
};

export type WorkingLocation = {
  id: string;
  type: string;
  address: string;
};

export type SystemAccess = {
  status: SystemAccessStatus;
  /** "Full time" or day-count string used to compute expiry on activation. */
  period: string;
  expires: Date | null;
  updatedOn: Date | null;
};

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
    on: Date | null;
  };
  phone: string;
  phoneVerified: {
    status: EmailVerificationStatus;
    on: Date | null;
  };
  systemPasswordStatus: SystemPasswordStatus;
  systemAccess: SystemAccess;
  accessPolicies: AccessPolicyBinding[];
  profileImage: ProfileImage;
  signatureInfo: SignatureInfo;
  preferences: UserPreferences;
  country: UserCountry;
  locations: WorkingLocation[];
  loggedIn: {
    status: string | null;
    on: Date | null;
  };
  createdBy: string | null;
  createdOn: Date | null;
  badAttempts: number;
  lockedUntil: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Public list/detail projection — never includes password or tokens. */
export type UserPublic = User;

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
  user: UserPublic;
  membership: OrgMembershipView | null;
};

export type ProvisionUserInput = {
  type: UserType;
  firstName: string;
  lastName: string;
  email: string;
  /** Plain password; generated when omitted. */
  password?: string;
  systemAccessPeriod?: string;
  createdBy?: string | null;
};

export type UpdateUserProfileInput = {
  firstName?: string;
  lastName?: string;
};

export type UpdatePreferencesInput = {
  darkMode?: boolean;
  activeTheme?: string;
};

export type UpdateSystemAccessInput = {
  status: "Active" | "Blocked";
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export type UpdateProfileImageInput = {
  url: string;
  fileName?: string;
  storageKey?: string;
};

export type UpdateSignatureInput = {
  url?: string;
  fileName?: string;
  storageKey?: string;
};

export type AddWorkingLocationInput = {
  type: string;
  address: string;
};

export type ListUsersQuery = {
  page: number;
  pageSize: number;
  search?: string;
};

export type PaginatedUsers = {
  items: UserWithMembership[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type OwnershipCheckResult = {
  hasOwnedData: boolean;
  inProgress: boolean;
  modules: string[];
};

export const USERS_RESOURCE = "users";
