import type { Model } from "mongoose";
import { getHardwareAssetModel } from "../../../src/modules/assets/repositories/hardware.model";
import { getSoftwareAssetModel } from "../../../src/modules/assets/repositories/software.model";
import { getInformationAssetModel } from "../../../src/modules/assets/repositories/information.model";
import { getPeopleAssetModel } from "../../../src/modules/assets/repositories/people.model";
import { getPremiseAssetModel } from "../../../src/modules/assets/repositories/premise.model";
import { getCustomerModel } from "../../../src/modules/customers/repositories/customer.model";
import { getSupplierModel } from "../../../src/modules/suppliers/repositories/supplier.model";
import { InvoiceModel } from "../../../src/modules/invoices/repositories/invoice.model";
import { getEmailCampaignModel } from "../../../src/modules/email-campaign/repositories/email-campaign.model";
import { getCampaignDeliveryModel } from "../../../src/modules/email-campaign/repositories/campaign-delivery.model";
import { getRiskModel } from "../../../src/modules/risks/repositories/risk.model";
import { getIncidentModel } from "../../../src/modules/incidents/repositories/incident.model";
import { getOfiModel } from "../../../src/modules/ofi/repositories/ofi.model";
import { getTaskModel } from "../../../src/modules/tasks/repositories/task.model";
import { getAuditModel } from "../../../src/modules/audits/repositories/audit.model";
import { getActivityModel } from "../../../src/modules/activities/repositories/activity.model";
import { getCalendarEventModel } from "../../../src/modules/calendar/repositories/calendar-event.model";
import { getNotificationModel } from "../../../src/modules/notifications/repositories/notification.model";
import { getChartModel } from "../../../src/modules/charts/repositories/chart.model";
import { getManagementReviewModel } from "../../../src/modules/management-reviews/repositories/management-review.model";
import { getKpiObjectiveModel } from "../../../src/modules/kpi-objectives/repositories/kpi-objective.model";
import { getLeaveModel } from "../../../src/modules/leaves/repositories/leave.model";
import { getDocumentRepositoryModel } from "../../../src/modules/document-management/repositories/document-repository.model";
import { getDocumentTreeModel } from "../../../src/modules/document-management/repositories/document-tree.model";
import { getDocumentSignatureModel } from "../../../src/modules/document-management/repositories/document-signature.model";
import { getDocumentReviewReminderModel } from "../../../src/modules/document-management/repositories/document-review-reminder.model";
import type { EntityStat, MigrateContext, TenantHandle, WaveReport } from "../types";
import { emptyEntityStat } from "../report";
import { countCollection, iterateCollection } from "../v4-connection";
import { upsertById } from "../upsert";
import { asId } from "../transforms/common";
import {
  transformActivity,
  transformAudit,
  transformCalendarEvent,
  transformCampaignDelivery,
  transformChart,
  transformCustomer,
  transformDocumentRepository,
  transformDocumentReviewReminder,
  transformDocumentSignature,
  transformDocumentTree,
  transformEmailCampaign,
  transformHardwareAsset,
  transformIncident,
  transformInformationAsset,
  transformInvoice,
  transformKpi,
  transformLeave,
  transformManagementReview,
  transformNotification,
  transformOfi,
  transformPeopleAsset,
  transformPremiseAsset,
  transformRisk,
  transformSoftwareAsset,
  transformSupplier,
  transformTask,
} from "../transforms/wave2-3";
import { attachValidation } from "../validation";

type Job = {
  v4: string;
  model: () => Model<any>;
  transform: (
    doc: Record<string, unknown>,
    organizationId: string,
    ctx: MigrateContext
  ) => Record<string, unknown> | null;
};

const JOBS: Job[] = [
  {
    v4: "hardwareassets",
    model: getHardwareAssetModel,
    transform: transformHardwareAsset,
  },
  {
    v4: "softwareassets",
    model: getSoftwareAssetModel,
    transform: transformSoftwareAsset,
  },
  {
    v4: "informationassets",
    model: getInformationAssetModel,
    transform: transformInformationAsset,
  },
  {
    v4: "peopleassets",
    model: getPeopleAssetModel,
    transform: transformPeopleAsset,
  },
  {
    v4: "premiseassets",
    model: getPremiseAssetModel,
    transform: transformPremiseAsset,
  },
  { v4: "customers", model: getCustomerModel, transform: transformCustomer },
  { v4: "suppliers", model: getSupplierModel, transform: transformSupplier },
  {
    v4: "invoices",
    model: () => InvoiceModel,
    transform: transformInvoice,
  },
  {
    v4: "emailcampaigns",
    model: getEmailCampaignModel,
    transform: transformEmailCampaign,
  },
  {
    v4: "campaigndeliveries",
    model: getCampaignDeliveryModel,
    transform: (doc, orgId) => transformCampaignDelivery(doc, orgId),
  },
  { v4: "risks", model: getRiskModel, transform: transformRisk },
  { v4: "incidents", model: getIncidentModel, transform: transformIncident },
  { v4: "cips", model: getOfiModel, transform: transformOfi },
  { v4: "tasks", model: getTaskModel, transform: transformTask },
  { v4: "audits", model: getAuditModel, transform: transformAudit },
  { v4: "activities", model: getActivityModel, transform: transformActivity },
  {
    v4: "calenderevents",
    model: getCalendarEventModel,
    transform: transformCalendarEvent,
  },
  {
    v4: "notifications",
    model: getNotificationModel,
    transform: transformNotification,
  },
  { v4: "charts", model: getChartModel, transform: transformChart },
  {
    v4: "managementreviews",
    model: getManagementReviewModel,
    transform: transformManagementReview,
  },
  {
    v4: "kpiobjectives",
    model: getKpiObjectiveModel,
    transform: transformKpi,
  },
  { v4: "leaves", model: getLeaveModel, transform: transformLeave },
  {
    v4: "documentrepositories",
    model: getDocumentRepositoryModel,
    transform: transformDocumentRepository,
  },
  {
    v4: "documenttrees",
    model: getDocumentTreeModel,
    transform: transformDocumentTree,
  },
  {
    v4: "documentsignatures",
    model: getDocumentSignatureModel,
    transform: transformDocumentSignature,
  },
  {
    v4: "documentreviewreminders",
    model: getDocumentReviewReminderModel,
    transform: (doc, orgId) => transformDocumentReviewReminder(doc, orgId),
  },
];

async function runJob(
  tenant: TenantHandle,
  ctx: MigrateContext,
  organizationId: string,
  job: Job
): Promise<EntityStat> {
  const stat = emptyEntityStat(job.v4);
  stat.v4Count = await countCollection(tenant.connection, job.v4);
  const model = job.model();

  for await (const batch of iterateCollection(tenant.connection, job.v4)) {
    for (const raw of batch) {
      try {
        const mapped = job.transform(raw, organizationId, ctx);
        if (!mapped) {
          stat.skipped += 1;
          continue;
        }
        await upsertById(model, mapped, ctx.dryRun);
        stat.migrated += 1;
      } catch (error) {
        stat.failed += 1;
        stat.errors.push(
          `${asId(raw._id)}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }
  return stat;
}

export async function runWave3(
  tenant: TenantHandle,
  ctx: MigrateContext
): Promise<WaveReport> {
  const startedAt = new Date().toISOString();
  if (!tenant.organizationId) {
    return {
      wave: 3,
      tenantDb: tenant.dbName,
      organizationId: null,
      dryRun: ctx.dryRun,
      startedAt,
      finishedAt: new Date().toISOString(),
      entities: [],
      orphanFks: [],
      notes: ["Skipped Wave 3 — no organization"],
    };
  }

  const entities: EntityStat[] = [];
  for (const job of JOBS) {
    entities.push(await runJob(tenant, ctx, tenant.organizationId, job));
  }

  const report: WaveReport = {
    wave: 3,
    tenantDb: tenant.dbName,
    organizationId: tenant.organizationId,
    dryRun: ctx.dryRun,
    startedAt,
    finishedAt: new Date().toISOString(),
    entities,
    orphanFks: [],
    notes: [
      "DocumentAccessToken skipped — regenerate share/sign tokens in V5 as needed.",
    ],
  };

  if (!ctx.dryRun) {
    await attachValidation(report, 3);
  }

  return report;
}
