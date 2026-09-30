import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id format");

const optionalObjectId = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id format")
  .optional();

const nullableObjectId = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id format")
  .nullable()
  .optional();

const costSchema = z.coerce.number().min(0).optional();

const dateCoerce = z.coerce.date().optional();
const nullableDate = z.coerce.date().nullable().optional();

export const idParamSchema = z.object({
  id: objectIdSchema,
});

export const keyIdParamSchema = z.object({
  id: objectIdSchema,
  keyId: objectIdSchema,
});

export const documentIdParamSchema = z.object({
  id: objectIdSchema,
  documentId: objectIdSchema,
});

export const listAssetsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional(),
  businessUnitIds: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      const list = Array.isArray(value) ? value : value.split(",");
      return list.map((v) => v.trim()).filter(Boolean);
    }),
  ownerIds: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      const list = Array.isArray(value) ? value : value.split(",");
      return list.map((v) => v.trim()).filter(Boolean);
    }),
  categoryIds: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      const list = Array.isArray(value) ? value : value.split(",");
      return list.map((v) => v.trim()).filter(Boolean);
    }),
});

const documentMetaSchema = z.object({
  fileName: z.string().trim().min(1, "fileName is required"),
  mimeType: z.string().trim().optional(),
  sizeBytes: z.coerce.number().int().nonnegative().optional(),
  storageKey: z.string().trim().optional(),
});

export const createHardwareBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  ownerId: z.string().trim().min(1, "Owner is required"),
  tag: z.string().trim().optional(),
  businessUnitId: optionalObjectId,
  categoryId: optionalObjectId,
  assignedDate: dateCoerce,
  returnDate: dateCoerce,
  destructionDate: dateCoerce,
  cost: costSchema,
});

export const updateHardwareBodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    ownerId: z.string().trim().min(1).optional(),
    tag: z.string().trim().nullable().optional(),
    categoryId: nullableObjectId,
    assignedDate: dateCoerce,
    returnDate: nullableDate,
    destructionDate: nullableDate,
    cost: costSchema,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export const createSoftwareBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  businessUnitId: optionalObjectId,
  categoryId: optionalObjectId,
  licenceCount: z.coerce.number().int().nonnegative().optional(),
  installCount: z.coerce.number().int().nonnegative().optional(),
  cost: costSchema,
  documents: z.array(documentMetaSchema).optional(),
});

export const updateSoftwareBodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    categoryId: nullableObjectId,
    licenceCount: z.coerce.number().int().nonnegative().optional(),
    installCount: z.coerce.number().int().nonnegative().optional(),
    cost: costSchema,
    documents: z.array(documentMetaSchema).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export const addSoftwareKeyBodySchema = z.object({
  value: z.string().trim().min(1, "Key value is required"),
});

export const addSoftwareDocumentBodySchema = documentMetaSchema;

export const createPeopleBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  role: z.string().trim().min(1, "Role is required"),
  skill: z.string().trim().min(1, "Skill is required"),
  responsibility: z.string().trim().optional(),
  businessUnitId: optionalObjectId,
  categoryId: optionalObjectId,
  cost: costSchema,
});

export const updatePeopleBodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    role: z.string().trim().min(1).optional(),
    skill: z.string().trim().min(1).optional(),
    responsibility: z.string().trim().nullable().optional(),
    categoryId: nullableObjectId,
    cost: costSchema,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export const createPremiseBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  location: z.string().trim().min(1, "Location is required"),
  address: z.string().trim().min(1, "Address is required"),
  businessUnitId: optionalObjectId,
  categoryId: optionalObjectId,
  cost: costSchema,
});

export const updatePremiseBodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    location: z.string().trim().min(1).optional(),
    address: z.string().trim().min(1).optional(),
    categoryId: nullableObjectId,
    cost: costSchema,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export const createInformationBodySchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  informationInventory: z.string().trim().optional(),
  ownerId: z.string().trim().optional(),
  storageLocation: z.string().trim().optional(),
  format: z.string().trim().optional(),
  link: z.string().trim().optional(),
  businessUnitId: optionalObjectId,
  categoryId: optionalObjectId,
  cost: costSchema,
});

export const updateInformationBodySchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    informationInventory: z.string().trim().nullable().optional(),
    ownerId: z.string().trim().nullable().optional(),
    storageLocation: z.string().trim().nullable().optional(),
    format: z.string().trim().nullable().optional(),
    link: z.string().trim().nullable().optional(),
    categoryId: nullableObjectId,
    cost: costSchema,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });
