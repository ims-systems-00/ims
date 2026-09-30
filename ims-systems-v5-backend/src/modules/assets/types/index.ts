/**
 * Assets (Inventory) domain types.
 * Five independent category registers — no unified Asset parent (assets.md §6).
 */

export const ASSET_CATEGORIES = [
  "hardware",
  "software",
  "people",
  "premise",
  "information",
] as const;

export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

export const ASSET_REFERENCE_PREFIX: Record<AssetCategory, string> = {
  hardware: "HD-",
  software: "SFT-",
  people: "PPL-",
  premise: "PRE-",
  information: "INF-",
};

/** Authorizer resource type — product RBAC uses Inventory (assets.md §9). */
export const INVENTORY_RESOURCE = "inventory";

export type SoftwareKey = {
  id: string;
  value: string;
  createdAt: Date;
};

export type SoftwareDocument = {
  id: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  /** Opaque storage key from a future Files/Storage module (S3). */
  storageKey?: string;
  uploadedBy: string;
  uploadedAt: Date;
};

type AssetTimestamps = {
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type AssetOwnership = {
  id: string;
  organizationId: string;
  reference: string;
  businessUnitId?: string;
  categoryId?: string;
  createdBy: string;
  cost: number;
};

export type HardwareAsset = AssetOwnership &
  AssetTimestamps & {
    name: string;
    tag?: string;
    ownerId: string;
    assignedDate: Date;
    returnDate?: Date;
    destructionDate?: Date;
  };

export type SoftwareAsset = AssetOwnership &
  AssetTimestamps & {
    name: string;
    licenceCount: number;
    installCount: number;
    keys: SoftwareKey[];
    documents: SoftwareDocument[];
  };

export type PeopleAsset = AssetOwnership &
  AssetTimestamps & {
    name: string;
    role: string;
    responsibility?: string;
    skill: string;
  };

export type PremiseAsset = AssetOwnership &
  AssetTimestamps & {
    name: string;
    location: string;
    address: string;
  };

export type InformationAsset = AssetOwnership &
  AssetTimestamps & {
    title: string;
    informationInventory?: string;
    ownerId?: string;
    storageLocation?: string;
    format?: string;
    link?: string;
  };

export type AnyAsset =
  | HardwareAsset
  | SoftwareAsset
  | PeopleAsset
  | PremiseAsset
  | InformationAsset;

export type CreateHardwareInput = {
  name: string;
  ownerId: string;
  tag?: string;
  businessUnitId?: string;
  categoryId?: string;
  assignedDate?: Date;
  returnDate?: Date;
  destructionDate?: Date;
  cost?: number;
};

export type UpdateHardwareInput = {
  name?: string;
  ownerId?: string;
  tag?: string | null;
  categoryId?: string | null;
  assignedDate?: Date;
  returnDate?: Date | null;
  destructionDate?: Date | null;
  cost?: number;
};

export type CreateSoftwareInput = {
  name: string;
  businessUnitId?: string;
  categoryId?: string;
  licenceCount?: number;
  installCount?: number;
  cost?: number;
  /** Optional documents metadata on create (appended). */
  documents?: Array<{
    fileName: string;
    mimeType?: string;
    sizeBytes?: number;
    storageKey?: string;
  }>;
};

export type UpdateSoftwareInput = {
  name?: string;
  categoryId?: string | null;
  licenceCount?: number;
  installCount?: number;
  cost?: number;
  /** Appended on update (assets.md — docs append, not replace). */
  documents?: Array<{
    fileName: string;
    mimeType?: string;
    sizeBytes?: number;
    storageKey?: string;
  }>;
};

export type CreatePeopleInput = {
  name: string;
  role: string;
  skill: string;
  responsibility?: string;
  businessUnitId?: string;
  categoryId?: string;
  cost?: number;
};

export type UpdatePeopleInput = {
  name?: string;
  role?: string;
  skill?: string;
  responsibility?: string | null;
  categoryId?: string | null;
  cost?: number;
};

export type CreatePremiseInput = {
  name: string;
  location: string;
  address: string;
  businessUnitId?: string;
  categoryId?: string;
  cost?: number;
};

export type UpdatePremiseInput = {
  name?: string;
  location?: string;
  address?: string;
  categoryId?: string | null;
  cost?: number;
};

export type CreateInformationInput = {
  title: string;
  informationInventory?: string;
  ownerId?: string;
  storageLocation?: string;
  format?: string;
  link?: string;
  businessUnitId?: string;
  categoryId?: string;
  cost?: number;
};

export type UpdateInformationInput = {
  title?: string;
  informationInventory?: string | null;
  ownerId?: string | null;
  storageLocation?: string | null;
  format?: string | null;
  link?: string | null;
  categoryId?: string | null;
  cost?: number;
};

export type ListAssetsQuery = {
  page: number;
  pageSize: number;
  search?: string;
  businessUnitIds?: string[];
  ownerIds?: string[];
  categoryIds?: string[];
};

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AssetCategoryStats = {
  category: AssetCategory;
  count: number;
  totalCost: number;
};

export type InventoryStats = {
  categories: AssetCategoryStats[];
  totalCount: number;
  totalCost: number;
};
