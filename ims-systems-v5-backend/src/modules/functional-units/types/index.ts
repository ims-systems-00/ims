export const ACCESS_TYPES = [
  "Internal business function",
  "External function",
  "Internal compliance function",
  "External compliance function",
] as const;

export type AccessType = (typeof ACCESS_TYPES)[number];

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
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
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

export type ListFunctionalUnitsQuery = {
  page: number;
  pageSize: number;
  search?: string;
  accessType?: AccessType;
};

export type PaginatedFunctionalUnits = {
  items: FunctionalUnit[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
