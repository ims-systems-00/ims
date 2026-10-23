/**
 * Insert transformed import rows via the target module create services.
 */

import type { AssetsService } from "../../assets";
import type { CustomerService } from "../../customers";
import type { IncidentService } from "../../incidents";
import type { KpiObjectivesService } from "../../kpi-objectives";
import type { RiskService } from "../../risks";
import type { CreateCustomerInput } from "../../customers/types";
import type { CreateIncidentInput } from "../../incidents/types";
import type {
  CreateKpiObjectiveInput,
  KpiPrivacy,
} from "../../kpi-objectives/types";
import type { CreateRiskInput, RiskType } from "../../risks/types";
import type {
  CreateHardwareInput,
  CreateInformationInput,
  CreatePeopleInput,
  CreatePremiseInput,
  CreateSoftwareInput,
} from "../../assets/types";
import type { DataImportTargetWriterPort } from "../ports";
import type { ImportableModule } from "../types";
import { ValidationAppError } from "../../../shared/errors/app-error";

export type DataImportTargetServices = {
  customers: CustomerService;
  risks: RiskService;
  incidents: IncidentService;
  assets: AssetsService;
  kpiObjectives: KpiObjectivesService;
};

function asString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

function asNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function asDate(value: unknown): Date | undefined {
  if (value instanceof Date) return value;
  return undefined;
}

function requireString(row: Record<string, unknown>, key: string): string {
  const value = asString(row[key]);
  if (!value) {
    throw new ValidationAppError(`Missing required field "${key}"`);
  }
  return value;
}

export function createDataImportTargetWriterAdapter(
  services: DataImportTargetServices
): DataImportTargetWriterPort {
  return {
    async insertRow({ identity, module, row }) {
      switch (module as ImportableModule) {
        case "customers": {
          const input: CreateCustomerInput = {
            name: requireString(row, "name"),
            primaryEmail: requireString(row, "primaryEmail"),
            businessUnitId: asString(row.businessUnitId),
            companyNumber: asString(row.companyNumber),
            stage: asString(row.stage) as CreateCustomerInput["stage"],
            phoneNumber: asString(row.phoneNumber),
            buildingName: asString(row.buildingName),
            streetName: asString(row.streetName),
            town: asString(row.town),
            postCode: asString(row.postCode),
            accountManager: asString(row.accountManager),
            primaryContact: asString(row.primaryContact),
            secondaryContact: asString(row.secondaryContact),
            secondaryEmail: asString(row.secondaryEmail),
            serviceProvision: asString(row.serviceProvision),
            contractValue: asNumber(row.contractValue),
            contractStartDate: asDate(row.contractStartDate) ?? null,
            contractEndDate: asDate(row.contractEndDate) ?? null,
            reviewDate: asDate(row.reviewDate) ?? null,
            notes: asString(row.notes),
            source: asString(row.source),
          };
          await services.customers.create(identity, input);
          return;
        }
        case "risks": {
          const input: CreateRiskInput = {
            title: requireString(row, "title"),
            description: requireString(row, "description"),
            type: requireString(row, "type") as RiskType,
            businessUnitId: asString(row.businessUnitId),
            ownerId: asString(row.ownerId),
            likelihood: asNumber(row.likelihood) ?? 1,
            consequence: asNumber(row.consequence) ?? 1,
          };
          const created = await services.risks.create(identity, input);
          const mitigationText = asString(row.mitigationText);
          const acceptanceRationale = asString(row.acceptanceRationale);
          const decisionMaker = asString(row.decisionMaker);
          if (mitigationText || acceptanceRationale || decisionMaker) {
            await services.risks.update(identity, created.id, {
              mitigationText: mitigationText ?? null,
              acceptanceRationale: acceptanceRationale ?? null,
              decisionMaker: decisionMaker ?? null,
            });
          }
          return;
        }
        case "incidents": {
          const input: CreateIncidentInput = {
            title: requireString(row, "title"),
            description: requireString(row, "description"),
            businessUnitId: asString(row.businessUnitId),
            ownerId: asString(row.ownerId),
            priority: asString(row.priority) as CreateIncidentInput["priority"],
            methodOfNotification: asString(row.methodOfNotification),
            affectedService: asString(row.affectedService),
          };
          const created = await services.incidents.create(identity, input);
          const resolution = asString(row.resolution);
          if (resolution) {
            await services.incidents.update(identity, created.id, {
              resolution,
            });
          }
          return;
        }
        case "hardwareassets": {
          const input: CreateHardwareInput = {
            name: requireString(row, "name"),
            ownerId: requireString(row, "ownerId"),
            businessUnitId: asString(row.businessUnitId),
            tag: asString(row.tag),
            assignedDate: asDate(row.assignedDate),
            returnDate: asDate(row.returnDate),
            destructionDate: asDate(row.destructionDate),
            cost: asNumber(row.cost),
          };
          await services.assets.createHardware(identity, input);
          return;
        }
        case "softwareassets": {
          const input: CreateSoftwareInput = {
            name: requireString(row, "name"),
            businessUnitId: asString(row.businessUnitId),
            licenceCount: asNumber(row.licenceCount),
            installCount: asNumber(row.installCount),
            cost: asNumber(row.cost),
          };
          await services.assets.createSoftware(identity, input);
          return;
        }
        case "peopleassets": {
          const input: CreatePeopleInput = {
            name: requireString(row, "name"),
            role: requireString(row, "role"),
            skill: requireString(row, "skill"),
            responsibility: asString(row.responsibility),
            businessUnitId: asString(row.businessUnitId),
            cost: asNumber(row.cost),
          };
          await services.assets.createPeople(identity, input);
          return;
        }
        case "premiseassets": {
          const input: CreatePremiseInput = {
            name: requireString(row, "name"),
            location: requireString(row, "location"),
            address: requireString(row, "address"),
            businessUnitId: asString(row.businessUnitId),
            cost: asNumber(row.cost),
          };
          await services.assets.createPremise(identity, input);
          return;
        }
        case "informationassets": {
          const input: CreateInformationInput = {
            title: requireString(row, "title"),
            informationInventory: asString(row.informationInventory),
            ownerId: asString(row.ownerId),
            storageLocation: asString(row.storageLocation),
            format: asString(row.format),
            link: asString(row.link),
            businessUnitId: asString(row.businessUnitId),
            cost: asNumber(row.cost),
          };
          await services.assets.createInformation(identity, input);
          return;
        }
        case "kpiobjectives": {
          const input: CreateKpiObjectiveInput = {
            value: requireString(row, "value"),
            privacy: (asString(row.privacy) as KpiPrivacy | undefined) ??
              "Organisational",
            businessUnitId: asString(row.businessUnitId) ?? null,
            targetValue: asNumber(row.targetValue),
            unit: asString(row.unit),
          };
          const created = await services.kpiObjectives.create(identity, input);
          const currentValue = asNumber(row.currentValue);
          if (currentValue !== undefined) {
            await services.kpiObjectives.update(identity, created.id, {
              currentValue,
            });
          }
          return;
        }
        default: {
          throw new ValidationAppError(`Unsupported import module: ${module}`);
        }
      }
    },
  };
}
