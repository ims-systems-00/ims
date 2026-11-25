import type {
  InventoryCalibrationLab,
  InventoryIncidentPort,
  InventorySupplierPort,
  InventoryTaskPort,
} from "../ports";

const INVENTORY_SOURCE_MODULE = "inventory";

export function createInventoryTaskAdapter(deps: {
  createTask: (input: {
    organizationId: string;
    title: string;
    description: string;
    createdBy: string;
    moduleType: string;
    moduleId: string;
  }) => Promise<{ id: string }>;
}): InventoryTaskPort {
  return {
    async createPurchaseTask(input) {
      return deps.createTask({
        organizationId: input.organizationId,
        title: input.title,
        description: input.description,
        createdBy: input.createdBy,
        moduleType: INVENTORY_SOURCE_MODULE,
        moduleId: input.stockId,
      });
    },
  };
}

export function createInventoryIncidentAdapter(deps: {
  createIncident: (input: {
    organizationId: string;
    title: string;
    description: string;
    createdBy: string;
    moduleType: string;
    moduleId: string;
  }) => Promise<{ id: string }>;
}): InventoryIncidentPort {
  return {
    async createFailOrFaultIncident(input) {
      return deps.createIncident({
        organizationId: input.organizationId,
        title: input.title,
        description: input.description,
        createdBy: input.createdBy,
        moduleType: INVENTORY_SOURCE_MODULE,
        moduleId: input.assetId,
      });
    },
  };
}

export function createInventorySupplierAdapter(deps: {
  listCalibrationLabs: (
    organizationId: string
  ) => Promise<InventoryCalibrationLab[]>;
}): InventorySupplierPort {
  return {
    async listCalibrationLabs(organizationId) {
      return deps.listCalibrationLabs(organizationId);
    },
  };
}
