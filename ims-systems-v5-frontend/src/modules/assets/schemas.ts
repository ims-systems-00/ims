import { z } from "zod";

const optionalTrimmed = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalObjectId = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => !value || /^[a-fA-F0-9]{24}$/.test(value),
    "Must be a valid 24-character id"
  )
  .transform((value) => (value && value.length > 0 ? value : undefined));

const costField = z
  .union([z.string(), z.number()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === "") return undefined;
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : undefined;
  })
  .refine((value) => value === undefined || value >= 0, {
    message: "Cost must be zero or greater",
  });

export const hardwareFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  ownerId: z.string().trim().min(1, "Owner is required"),
  tag: optionalTrimmed,
  businessUnitId: optionalObjectId,
  categoryId: optionalObjectId,
  assignedDate: optionalTrimmed,
  returnDate: optionalTrimmed,
  destructionDate: optionalTrimmed,
  cost: costField,
});

export const softwareFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  businessUnitId: optionalObjectId,
  categoryId: optionalObjectId,
  licenceCount: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === "") return undefined;
      const n = typeof value === "number" ? value : Number(value);
      return Number.isFinite(n) ? Math.trunc(n) : undefined;
    })
    .refine((value) => value === undefined || value >= 0, {
      message: "Licence count must be zero or greater",
    }),
  installCount: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === "") return undefined;
      const n = typeof value === "number" ? value : Number(value);
      return Number.isFinite(n) ? Math.trunc(n) : undefined;
    })
    .refine((value) => value === undefined || value >= 0, {
      message: "Install count must be zero or greater",
    }),
  cost: costField,
});

export const peopleFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  role: z.string().trim().min(1, "Role is required"),
  skill: z.string().trim().min(1, "Skill is required"),
  responsibility: optionalTrimmed,
  businessUnitId: optionalObjectId,
  categoryId: optionalObjectId,
  cost: costField,
});

export const premiseFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  location: z.string().trim().min(1, "Location is required"),
  address: z.string().trim().min(1, "Address is required"),
  businessUnitId: optionalObjectId,
  categoryId: optionalObjectId,
  cost: costField,
});

export const informationFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  informationInventory: optionalTrimmed,
  ownerId: optionalTrimmed,
  storageLocation: optionalTrimmed,
  format: optionalTrimmed,
  link: optionalTrimmed,
  businessUnitId: optionalObjectId,
  categoryId: optionalObjectId,
  cost: costField,
});

export type HardwareFormValues = z.input<typeof hardwareFormSchema>;
export type SoftwareFormValues = z.input<typeof softwareFormSchema>;
export type PeopleFormValues = z.input<typeof peopleFormSchema>;
export type PremiseFormValues = z.input<typeof premiseFormSchema>;
export type InformationFormValues = z.input<typeof informationFormSchema>;
