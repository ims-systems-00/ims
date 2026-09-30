/**
 * Assets (Inventory) frontend types — aligned with backend `/api/v1/assets`.
 */

export const ASSET_CATEGORIES = [
  "hardware",
  "software",
  "people",
  "premise",
  "information",
] as const;

export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

export type SoftwareKey = {
  id: string;
  value: string;
  createdAt: string;
};

export type SoftwareDocument = {
  id: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  storageKey?: string;
  uploadedBy: string;
  uploadedAt: string;
};

type AssetBase = {
  id: string;
  organizationId: string;
  reference: string;
  businessUnitId?: string;
  categoryId?: string;
  createdBy: string;
  cost: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HardwareAsset = AssetBase & {
  name: string;
  tag?: string;
  ownerId: string;
  assignedDate: string;
  returnDate?: string;
  destructionDate?: string;
};

export type SoftwareAsset = AssetBase & {
  name: string;
  licenceCount: number;
  installCount: number;
  keys: SoftwareKey[];
  documents: SoftwareDocument[];
};

export type PeopleAsset = AssetBase & {
  name: string;
  role: string;
  responsibility?: string;
  skill: string;
};

export type PremiseAsset = AssetBase & {
  name: string;
  location: string;
  address: string;
};

export type InformationAsset = AssetBase & {
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

export type PaginatedAssets<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ListAssetsParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  businessUnitIds?: string[];
  ownerIds?: string[];
  categoryIds?: string[];
};

export type CreateHardwareInput = {
  name: string;
  ownerId: string;
  tag?: string;
  businessUnitId?: string;
  categoryId?: string;
  assignedDate?: string;
  returnDate?: string;
  destructionDate?: string;
  cost?: number;
};

export type UpdateHardwareInput = {
  name?: string;
  ownerId?: string;
  tag?: string | null;
  categoryId?: string | null;
  assignedDate?: string;
  returnDate?: string | null;
  destructionDate?: string | null;
  cost?: number;
};

export type CreateSoftwareInput = {
  name: string;
  businessUnitId?: string;
  categoryId?: string;
  licenceCount?: number;
  installCount?: number;
  cost?: number;
};

export type UpdateSoftwareInput = {
  name?: string;
  categoryId?: string | null;
  licenceCount?: number;
  installCount?: number;
  cost?: number;
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

export type AssetCategoryMeta = {
  category: AssetCategory;
  label: string;
  singular: string;
  path: string;
  createLabel: string;
};

export const ASSET_CATEGORY_META: Record<AssetCategory, AssetCategoryMeta> = {
  hardware: {
    category: "hardware",
    label: "Hardware",
    singular: "Hardware asset",
    path: "/assets/hardware",
    createLabel: "Add hardware",
  },
  software: {
    category: "software",
    label: "Software",
    singular: "Software asset",
    path: "/assets/software",
    createLabel: "Add software",
  },
  people: {
    category: "people",
    label: "People",
    singular: "People asset",
    path: "/assets/people",
    createLabel: "Add people asset",
  },
  premise: {
    category: "premise",
    label: "Premises",
    singular: "Premise asset",
    path: "/assets/premise",
    createLabel: "Add premise",
  },
  information: {
    category: "information",
    label: "Information",
    singular: "Information asset",
    path: "/assets/information",
    createLabel: "Add information asset",
  },
};

export function isAssetCategory(value: string): value is AssetCategory {
  return (ASSET_CATEGORIES as readonly string[]).includes(value);
}

export function assetDisplayName(asset: AnyAsset): string {
  if ("title" in asset) return asset.title;
  return asset.name;
}
