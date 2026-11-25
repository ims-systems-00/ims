import type { DocumentModuleLibraryPort } from "../document-management";

export type { DocumentModuleLibraryPort };

export type InventoryTaskPort = {
  createPurchaseTask(input: {
    organizationId: string;
    stockId: string;
    stockCode: string;
    stockName: string;
    title: string;
    description: string;
    createdBy: string;
  }): Promise<{ id: string } | null>;
};

export type InventoryIncidentPort = {
  createFailOrFaultIncident(input: {
    organizationId: string;
    assetId: string;
    assetTag: string;
    assetName: string;
    title: string;
    description: string;
    createdBy: string;
  }): Promise<{ id: string } | null>;
};

export type InventoryCalibrationLab = {
  id: string;
  name: string;
};

export type InventorySupplierPort = {
  listCalibrationLabs(
    organizationId: string
  ): Promise<InventoryCalibrationLab[]>;
};

export class NoOpInventoryTaskAdapter implements InventoryTaskPort {
  async createPurchaseTask(): Promise<{ id: string } | null> {
    return null;
  }
}

export class NoOpInventoryIncidentAdapter implements InventoryIncidentPort {
  async createFailOrFaultIncident(): Promise<{ id: string } | null> {
    return null;
  }
}

export class NoOpInventorySupplierAdapter implements InventorySupplierPort {
  async listCalibrationLabs(): Promise<InventoryCalibrationLab[]> {
    return [];
  }
}
