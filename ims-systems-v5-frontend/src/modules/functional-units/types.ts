export type AccessType =
  | "Internal business function"
  | "External function"
  | "Internal compliance function"
  | "External compliance function";

export const ACCESS_TYPES: AccessType[] = [
  "Internal business function",
  "External function",
  "Internal compliance function",
  "External compliance function",
];

export const BUSINESS_ACCESS_TYPES: AccessType[] = [
  "Internal business function",
  "External function",
];

export const COMPLIANCE_ACCESS_TYPES: AccessType[] = [
  "Internal compliance function",
  "External compliance function",
];

export function isBusinessAccessType(type: AccessType): boolean {
  return (BUSINESS_ACCESS_TYPES as readonly string[]).includes(type);
}

export function isComplianceAccessType(type: AccessType): boolean {
  return (COMPLIANCE_ACCESS_TYPES as readonly string[]).includes(type);
}

export type RoleLicenceCounter = {
  allocated: number;
  used: number;
};

export type FunctionalUnit = {
  id: string;
  organizationId: string;
  reference: string;
  name: string;
  accessType: AccessType;
  responsibility: string;
  operatingLocation?: string;
  standards?: string;
  totalMembers: number;
  policyId?: string;
  complianceToolkits: string[];
  userLicences: {
    superUser: RoleLicenceCounter;
    hosUser: RoleLicenceCounter;
    basicUser: RoleLicenceCounter;
    auditorUser: RoleLicenceCounter;
  };
  isSystemDefault: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedFunctionalUnits = {
  items: FunctionalUnit[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CreateFunctionalUnitInput = {
  name: string;
  accessType: AccessType;
  responsibility: string;
  operatingLocation?: string;
  standards?: string;
};

export type UpdateFunctionalUnitInput = {
  name?: string;
  responsibility?: string;
  operatingLocation?: string;
  standards?: string;
};

export type ListFunctionalUnitsParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  accessType?: AccessType;
};

export type UnitMember = {
  id: string;
  reference: string;
  name: string;
  email: string;
  jobTitle: string | null;
  role: string | null;
  systemAccessStatus: string;
  profileImageUrl: string;
  lastLoggedIn: string | null;
};

export type UnitMembersResponse = {
  items: UnitMember[];
};
