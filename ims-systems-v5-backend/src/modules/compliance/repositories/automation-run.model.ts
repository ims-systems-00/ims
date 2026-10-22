import mongoose, { Schema } from "mongoose";

export type AutomationRunDocument = mongoose.Document & {
  organizationId: string;
  toolkitName: string;
  actorId: string;
  scannedModules: { module: string; recordCount: number }[];
  modulesWithRecords: string[];
  createdOn: Date;
  createdAt: Date;
  updatedAt: Date;
};

const automationRunSchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    toolkitName: { type: String, required: true },
    actorId: { type: String, required: true },
    scannedModules: {
      type: [{ module: String, recordCount: Number }],
      default: [],
    },
    modulesWithRecords: { type: [String], default: [] },
    createdOn: { type: Date, required: true },
  },
  { timestamps: true },
);

export const ComplianceAutomationRunModel =
  (mongoose.models.ComplianceAutomationRun as mongoose.Model<AutomationRunDocument>) ??
  mongoose.model<AutomationRunDocument>(
    "ComplianceAutomationRun",
    automationRunSchema,
    "compliance_automation_runs",
  );

export function createAutomationRunRepository() {
  return {
    async record(data: {
      organizationId: string;
      toolkitName: string;
      actorId: string;
      scannedModules: { module: string; recordCount: number }[];
      modulesWithRecords: string[];
    }) {
      const doc = await ComplianceAutomationRunModel.create({
        ...data,
        createdOn: new Date(),
      });
      return { id: String(doc._id), ...data };
    },
    async listByOrganization(organizationId: string) {
      const docs = await ComplianceAutomationRunModel.find({ organizationId })
        .sort({ createdOn: -1 })
        .limit(50)
        .lean();
      return docs.map((d) => ({
        id: String(d._id),
        organizationId: d.organizationId,
        toolkitName: d.toolkitName,
        actorId: d.actorId,
        scannedModules: d.scannedModules,
        modulesWithRecords: d.modulesWithRecords,
        createdOn: d.createdOn,
      }));
    },
  };
}

export type AutomationRunRepository = ReturnType<typeof createAutomationRunRepository>;
