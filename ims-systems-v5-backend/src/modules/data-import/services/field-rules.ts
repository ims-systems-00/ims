/**
 * Per-field business rules for import validation (Zod), keyed by module + path.
 */

import { z, type ZodTypeAny } from "zod";
import { CUSTOMER_STAGES } from "../../customers/types";
import { INCIDENT_PRIORITIES } from "../../incidents/types";
import { KPI_PRIVACY } from "../../kpi-objectives/types";
import { RISK_TYPES } from "../../risks/types";
import type { ImportableModule } from "../types";

const objectId = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "must be a valid id");

const score = z.coerce.number().int().min(1).max(5);

const RULES: Record<ImportableModule, Record<string, ZodTypeAny>> = {
  customers: {
    businessUnitId: objectId,
    name: z.string().trim().min(1),
    primaryEmail: z.string().trim().email(),
    companyNumber: z.string().trim().optional(),
    stage: z.enum(CUSTOMER_STAGES),
    phoneNumber: z.string().trim().optional(),
    buildingName: z.string().trim().optional(),
    streetName: z.string().trim().optional(),
    town: z.string().trim().optional(),
    postCode: z.string().trim().optional(),
    accountManager: objectId,
    primaryContact: z.string().trim().optional(),
    secondaryContact: z.string().trim().optional(),
    secondaryEmail: z.string().trim().email(),
    serviceProvision: z.string().trim().optional(),
    contractValue: z.coerce.number(),
    contractStartDate: z.date(),
    contractEndDate: z.date(),
    reviewDate: z.date(),
    notes: z.string().trim().optional(),
    source: z.string().trim().optional(),
  },
  risks: {
    businessUnitId: objectId,
    title: z.string().trim().min(1),
    type: z.enum(RISK_TYPES),
    description: z.string().trim().min(1),
    ownerId: objectId,
    likelihood: score,
    consequence: score,
    mitigationText: z.string().trim().optional(),
    acceptanceRationale: z.string().trim().optional(),
    decisionMaker: z.string().trim().optional(),
  },
  incidents: {
    businessUnitId: objectId,
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    ownerId: objectId,
    priority: z.enum(INCIDENT_PRIORITIES),
    methodOfNotification: z.string().trim().optional(),
    affectedService: z.string().trim().optional(),
    resolution: z.string().trim().optional(),
  },
  hardwareassets: {
    businessUnitId: objectId,
    name: z.string().trim().min(1),
    ownerId: objectId,
    tag: z.string().trim().optional(),
    assignedDate: z.date(),
    returnDate: z.date(),
    destructionDate: z.date(),
    cost: z.coerce.number(),
  },
  informationassets: {
    businessUnitId: objectId,
    title: z.string().trim().min(1),
    informationInventory: z.string().trim().optional(),
    ownerId: objectId,
    storageLocation: z.string().trim().optional(),
    format: z.string().trim().optional(),
    link: z.string().trim().optional(),
    cost: z.coerce.number(),
  },
  peopleassets: {
    businessUnitId: objectId,
    name: z.string().trim().min(1),
    role: z.string().trim().min(1),
    skill: z.string().trim().min(1),
    responsibility: z.string().trim().optional(),
    cost: z.coerce.number(),
  },
  premiseassets: {
    businessUnitId: objectId,
    name: z.string().trim().min(1),
    location: z.string().trim().min(1),
    address: z.string().trim().min(1),
    cost: z.coerce.number(),
  },
  softwareassets: {
    businessUnitId: objectId,
    name: z.string().trim().min(1),
    licenceCount: z.coerce.number().int().nonnegative(),
    installCount: z.coerce.number().int().nonnegative(),
    cost: z.coerce.number(),
  },
  kpiobjectives: {
    value: z.string().trim().min(1),
    targetValue: z.coerce.number().min(0),
    currentValue: z.coerce.number().min(0),
    unit: z.string().trim().max(100).optional(),
    privacy: z.enum(KPI_PRIVACY),
    businessUnitId: objectId,
  },
};

export function getFieldRule(
  module: ImportableModule,
  path: string
): ZodTypeAny | undefined {
  return RULES[module][path];
}
