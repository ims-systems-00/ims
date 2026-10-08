import { Router } from "express";
import type { AppConfig } from "../../../config";
import type { Logger } from "../../../infrastructure/logging/logger";
import type { MongoConnection } from "../../../infrastructure/mongodb/connection";
import type { EmailSystem } from "../../../infrastructure/queue";
import { createObjectStorageFromConfig } from "../../../infrastructure/s3/object-storage";
import type { ObjectStoragePort } from "../../../infrastructure/s3/object-storage";
import type { SecurityPorts } from "../../../security";
import { createFilesModule } from "../../../modules/files";
import {
  createDocumentManagementModule,
  createDocumentActivityAdapter,
  createDocumentFilesAdapter,
  createDocumentNotificationAdapter,
  startDocumentReviewReminderSchedule,
} from "../../../modules/document-management";
import { createReportBugModule } from "../../../modules/report-bug";
import { createOrganisationModule } from "../../../modules/organisation";
import { createAssetsModule } from "../../../modules/assets";
import {
  createAuditModule,
  createAuditNotificationAdapter,
  type AuditCipPromotionPort,
  type AuditIncidentPromotionPort,
  type AuditRiskPromotionPort,
  type AuditTaskPort,
} from "../../../modules/audits";
import { createBusinessPremiseModule } from "../../../modules/business-premise";
import {
  createCalendarModule,
  createAuditCalendarAdapter,
  createIncidentCalendarAdapter,
  createManagementReviewCalendarAdapter,
  createSupplierCalendarAdapter,
  createTaskCalendarAdapter,
} from "../../../modules/calendar";
import {
  createDashboardModule,
  createDashboardPortsFromModules,
  createLiveDashboardInitAdapter,
} from "../../../modules/dashboard";
import {
  createStatsModule,
  createStatsPortsFromModules,
} from "../../../modules/stats";
import { createFunctionalUnitModule } from "../../../modules/functional-units";
import {
  createIncidentModule,
  createIncidentNotificationAdapter,
  NoOpIncidentComplianceLinkAdapter,
  type IncidentComplianceLinkPort,
  type IncidentTaskPort,
} from "../../../modules/incidents";
import {
  createManagementReviewModule,
  createManagementReviewNotificationAdapter,
  MANAGEMENT_REVIEWS_SOURCE_MODULE,
  type ManagementReviewTaskPort,
} from "../../../modules/management-reviews";
import {
  createOfiModule,
  createOfiNotificationAdapter,
  NoOpOfiComplianceLinkAdapter,
  OFI_SOURCE_MODULE,
  type OfiComplianceLinkPort,
  type OfiTaskPort,
} from "../../../modules/ofi";
import {
  createSupplierModule,
  createSupplierNotificationAdapter,
  SUPPLIERS_SOURCE_MODULE,
  type SupplierIncidentStatsPort,
  type SupplierTaskPort,
} from "../../../modules/suppliers";
import {
  createCustomerModule,
  createCustomerNotificationAdapter,
  CUSTOMERS_SOURCE_MODULE,
  type CustomerIncidentStatsPort,
  type CustomerTaskPort,
} from "../../../modules/customers";
import {
  createRiskModule,
  createRiskNotificationAdapter,
  NoOpRiskComplianceLinkAdapter,
  type RiskComplianceLinkPort,
  type RiskTaskPort,
} from "../../../modules/risks";
import {
  createTaskModule,
  createTaskNotificationAdapter,
  createTasksSourceCleanupAdapter,
} from "../../../modules/tasks";
import { createUsersModule } from "../../../modules/users";
import {
  createNotificationsModule,
  createNotificationsUsersAdapter,
} from "../../../modules/notifications";
import { createChartsModule } from "../../../modules/charts";
import {
  createKpiObjectivesModule,
  createKpiBusinessUnitAdapter,
  createKpiObjectiveNotificationAdapter,
} from "../../../modules/kpi-objectives";
import { createTagsAndCategoriesModule } from "../../../modules/tags-and-categories";
import {
  createActivitiesModule,
  createActivityOfiFollowUpAdapter,
} from "../../../modules/activities";
import {
  createComplianceModule,
  createComplianceActivityAdapter,
  createComplianceEvidenceLinkAdapter,
  createComplianceIncidentMirrorAdapter,
  createComplianceNotificationAdapter,
  createComplianceOfiMirrorAdapter,
  createComplianceRiskMirrorAdapter,
  createIncidentComplianceLinkAdapter,
  createOfiComplianceLinkAdapter,
  createRiskComplianceLinkAdapter,
} from "../../../modules/compliance";
import { createHealthRouter } from "./health";

export type V1RouterDeps = {
  mongo: MongoConnection;
  security: SecurityPorts;
  email?: EmailSystem;
  config?: AppConfig;
  logger?: Logger;
};

export type CreatedV1Router = {
  router: Router;
  /** Optional background jobs (document review reminders). */
  startBackgroundJobs?: () => () => void;
};

/**
 * Centralized /api/v1 route registration (D-03).
 * Business modules mount here; keep this as the single version root.
 */
export function createV1Router(deps: V1RouterDeps): CreatedV1Router {
  const { mongo, security, email, config, logger } = deps;
  const router = Router();
  router.use(createHealthRouter(mongo));

  const reportBug = createReportBugModule({
    email,
    supportEmails: config?.REPORT_BUG_SUPPORT_EMAILS ?? [
      "support@imssystems.tech",
    ],
    // Mailtrap free testing limits ~1 msg/sec; skip delay in automated tests.
    confirmationDelayMs: config?.NODE_ENV === "test" ? 0 : 1_200,
  });
  router.use("/report-bug", reportBug.router);

  let objectStorage: ObjectStoragePort | undefined;
  if (config && logger) {
    objectStorage = createObjectStorageFromConfig({ config, logger });
    const files = createFilesModule({
      storage: objectStorage,
      config: {
        enabled: config.FILES_ENABLED,
        provider: config.FILES_PROVIDER,
        nodeEnv: config.NODE_ENV,
        privateBucket: config.AWS_PRIVATE_BUCKET,
        bucketSuffix: config.AWS_BUCKET_SUFFIX,
        publicBucket: config.AWS_PUBLIC_BUCKET,
        uploadUrlTtlSeconds: config.FILES_UPLOAD_URL_TTL_SECONDS,
        viewUrlTtlSeconds: config.FILES_VIEW_URL_TTL_SECONDS,
        allowedPaths: config.ALLOWED_FILE_PATHS,
      },
    });
    router.use("/files", files.router);
  }

  const organisations = createOrganisationModule({
    authorizer: security.authorizer,
  });
  router.use("/organisations", organisations.router);

  const functionalUnits = createFunctionalUnitModule({
    authorizer: security.authorizer,
    dashboardInit: createLiveDashboardInitAdapter(),
  });
  const assets = createAssetsModule({ authorizer: security.authorizer });
  const businessPremises = createBusinessPremiseModule({
    authorizer: security.authorizer,
  });
  const users = createUsersModule({ authorizer: security.authorizer });

  const notificationsUsers = createNotificationsUsersAdapter(users.service);

  const notifications = createNotificationsModule({
    authorizer: security.authorizer,
    users: notificationsUsers,
  });

  const charts = createChartsModule({
    authorizer: security.authorizer,
  });

  const kpiObjectives = createKpiObjectivesModule({
    authorizer: security.authorizer,
    businessUnits: createKpiBusinessUnitAdapter(functionalUnits.service),
    notifications: createKpiObjectiveNotificationAdapter({
      notifications: notifications.application,
      unitUsers: functionalUnits.unitUsers,
    }),
  });

  const tagsAndCategories = createTagsAndCategoriesModule({
    authorizer: security.authorizer,
  });

  router.use("/functional-units", functionalUnits.router);
  router.use("/assets", assets.router);
  router.use("/business-premises", businessPremises.router);
  router.use("/users", users.router);
  router.use("/notifications", notifications.router);
  router.use("/charts", charts.router);
  router.use("/kpi-objectives", kpiObjectives.router);
  router.use("/tags-and-categories", tagsAndCategories.router);

  const calendar = createCalendarModule({
    authorizer: security.authorizer,
  });

  const tasks = createTaskModule({
    authorizer: security.authorizer,
    calendar: createTaskCalendarAdapter(calendar.service),
    notifications: createTaskNotificationAdapter(notifications.application),
  });
  const tasksCleanup = createTasksSourceCleanupAdapter(tasks.service);

  const riskTasksAdapter: RiskTaskPort = {
    async removeTasksSourcedFromRisk(input) {
      await tasksCleanup.removeTasksSourcedFrom({
        organizationId: input.organizationId,
        moduleType: "risks",
        moduleId: input.riskId,
      });
    },
  };

  const incidentTasksAdapter: IncidentTaskPort = {
    async removeTasksSourcedFromIncident(input) {
      await tasksCleanup.removeTasksSourcedFrom({
        organizationId: input.organizationId,
        moduleType: "incidents",
        moduleId: input.incidentId,
      });
    },
  };

  const auditTasksAdapter: AuditTaskPort = {
    async removeTasksSourcedFromAudit(input) {
      await tasksCleanup.removeTasksSourcedFrom({
        organizationId: input.organizationId,
        moduleType: "audits",
        moduleId: input.auditId,
      });
    },
  };

  const managementReviewTasksAdapter: ManagementReviewTaskPort = {
    async removeTasksSourcedFromReview(input) {
      await tasksCleanup.removeTasksSourcedFrom({
        organizationId: input.organizationId,
        moduleType: MANAGEMENT_REVIEWS_SOURCE_MODULE,
        moduleId: input.reviewId,
      });
    },
  };

  const ofiTasksAdapter: OfiTaskPort = {
    async removeTasksSourcedFromOfi(input) {
      await tasksCleanup.removeTasksSourcedFrom({
        organizationId: input.organizationId,
        moduleType: OFI_SOURCE_MODULE,
        moduleId: input.ofiId,
      });
    },
  };

  const supplierTasksAdapter: SupplierTaskPort = {
    async removeTasksSourcedFromSupplier(input) {
      await tasksCleanup.removeTasksSourcedFrom({
        organizationId: input.organizationId,
        moduleType: SUPPLIERS_SOURCE_MODULE,
        moduleId: input.supplierId,
      });
    },
  };

  const customerTasksAdapter: CustomerTaskPort = {
    async removeTasksSourcedFromCustomer(input) {
      await tasksCleanup.removeTasksSourcedFrom({
        organizationId: input.organizationId,
        moduleType: CUSTOMERS_SOURCE_MODULE,
        moduleId: input.customerId,
      });
    },
  };

  const riskComplianceLinkHolder: { current: RiskComplianceLinkPort } = {
    current: new NoOpRiskComplianceLinkAdapter(),
  };

  const incidentComplianceLinkHolder: {
    current: IncidentComplianceLinkPort;
  } = {
    current: new NoOpIncidentComplianceLinkAdapter(),
  };

  const risks = createRiskModule({
    authorizer: security.authorizer,
    tasks: riskTasksAdapter,
    notifications: createRiskNotificationAdapter({
      notifications: notifications.application,
      users: notificationsUsers,
    }),
    complianceLinks: {
      syncRiskLinks: (input) =>
        riskComplianceLinkHolder.current.syncRiskLinks(input),
      clearRiskLinks: (input) =>
        riskComplianceLinkHolder.current.clearRiskLinks(input),
    },
  });

  const incidents = createIncidentModule({
    authorizer: security.authorizer,
    tasks: incidentTasksAdapter,
    calendar: createIncidentCalendarAdapter(calendar.service),
    notifications: createIncidentNotificationAdapter({
      notifications: notifications.application,
      users: notificationsUsers,
    }),
    complianceLinks: {
      syncIncidentLinks: (input) =>
        incidentComplianceLinkHolder.current.syncIncidentLinks(input),
      clearIncidentLinks: (input) =>
        incidentComplianceLinkHolder.current.clearIncidentLinks(input),
    },
  });

  const supplierIncidentStatsAdapter: SupplierIncidentStatsPort = {
    async countLinkedIncidents({ identity }) {
      let page = 1;
      let totalPages = 1;
      let totalIncidents = 0;
      let openIncidents = 0;
      let resolvedIncidents = 0;

      do {
        const listed = await incidents.service.list(identity, {
          page,
          pageSize: 100,
          sourceModuleType: SUPPLIERS_SOURCE_MODULE,
          sort: "raisedOn",
          sortDir: "desc",
        });
        totalIncidents = listed.total;
        totalPages = listed.totalPages;
        for (const incident of listed.items) {
          if (incident.resolved.status) resolvedIncidents += 1;
          else openIncidents += 1;
        }
        page += 1;
      } while (page <= totalPages);

      return { totalIncidents, openIncidents, resolvedIncidents };
    },
  };

  const customerIncidentStatsAdapter: CustomerIncidentStatsPort = {
    async countLinkedIncidents({ customerId, identity }) {
      let page = 1;
      let totalPages = 1;
      let open = 0;
      let resolved = 0;

      do {
        const listed = await incidents.service.list(identity, {
          page,
          pageSize: 100,
          sourceModuleType: CUSTOMERS_SOURCE_MODULE,
          sourceModuleId: customerId,
          sort: "raisedOn",
          sortDir: "desc",
        });
        totalPages = listed.totalPages;
        for (const incident of listed.items) {
          if (incident.resolved.status) resolved += 1;
          else open += 1;
        }
        page += 1;
      } while (page <= totalPages);

      const buckets = [];
      if (open > 0) buckets.push({ resolved: false, count: open });
      if (resolved > 0) buckets.push({ resolved: true, count: resolved });
      return buckets;
    },
  };

  const ofiComplianceLinkHolder: { current: OfiComplianceLinkPort } = {
    current: new NoOpOfiComplianceLinkAdapter(),
  };

  const ofis = createOfiModule({
    authorizer: security.authorizer,
    tasks: ofiTasksAdapter,
    notifications: createOfiNotificationAdapter({
      notifications: notifications.application,
      users: notificationsUsers,
    }),
    complianceLinks: {
      syncOfiLinks: (input) =>
        ofiComplianceLinkHolder.current.syncOfiLinks(input),
      clearOfiLinks: (input) =>
        ofiComplianceLinkHolder.current.clearOfiLinks(input),
    },
  });

  const activities = createActivitiesModule({
    authorizer: security.authorizer,
    ofiFollowUp: createActivityOfiFollowUpAdapter({
      markInProgressIfPending: (organizationId, ofiId) =>
        ofis.service.markInProgressIfPending(organizationId, ofiId),
    }),
  });

  const documentManagement = createDocumentManagementModule({
    authorizer: security.authorizer,
    files: objectStorage
      ? createDocumentFilesAdapter(objectStorage)
      : undefined,
    activities: createDocumentActivityAdapter(activities.application),
    notifications: createDocumentNotificationAdapter(notifications.application),
  });
  router.use("/document-management", documentManagement.managementRouter);
  router.use("/document-repositories", documentManagement.repositoriesRouter);
  router.use("/document-trees", documentManagement.treesRouter);

  const compliance = createComplianceModule({
    authorizer: security.authorizer,
    activities: createComplianceActivityAdapter(activities.application),
    notifications: createComplianceNotificationAdapter({
      notifications: notifications.application,
      users: notificationsUsers,
    }),
    evidenceLinks: createComplianceEvidenceLinkAdapter({
      risks: risks.service,
      incidents: incidents.service,
      ofi: ofis.service,
    }),
    riskMirror: createComplianceRiskMirrorAdapter(risks.service),
    incidentMirror: createComplianceIncidentMirrorAdapter(incidents.service),
    ofiMirror: createComplianceOfiMirrorAdapter(ofis.service),
  });

  riskComplianceLinkHolder.current = createRiskComplianceLinkAdapter(
    compliance.application
  );
  incidentComplianceLinkHolder.current = createIncidentComplianceLinkAdapter(
    compliance.application
  );
  ofiComplianceLinkHolder.current = createOfiComplianceLinkAdapter(
    compliance.application
  );

  const suppliers = createSupplierModule({
    authorizer: security.authorizer,
    tasks: supplierTasksAdapter,
    incidentStats: supplierIncidentStatsAdapter,
    calendar: createSupplierCalendarAdapter(calendar.service),
    notifications: createSupplierNotificationAdapter({
      notifications: notifications.application,
      users: notificationsUsers,
    }),
  });

  const customers = createCustomerModule({
    authorizer: security.authorizer,
    tasks: customerTasksAdapter,
    incidents: customerIncidentStatsAdapter,
    notifications: createCustomerNotificationAdapter(
      notifications.application
    ),
  });

  const auditIncidentPromotion: AuditIncidentPromotionPort = {
    async promoteNonConformity(input) {
      const created = await incidents.service.create(input.identity, {
        title: input.identification.nonConformity,
        description: input.identification.rootCause,
        businessUnitId: input.businessUnitId,
        ownerId: input.auditorId,
        source: { moduleType: "audits", moduleId: input.auditId },
      });
      return { id: created.id };
    },
  };

  const auditRiskPromotion: AuditRiskPromotionPort = {
    async promoteEmbeddedRisk(input) {
      const created = await risks.service.create(input.identity, {
        title: input.risk.title,
        description: input.risk.description,
        type: "Organisational",
        businessUnitId: input.businessUnitId,
        ownerId: input.auditorId,
        likelihood: input.risk.likelihood,
        consequence: input.risk.consequence,
        source: { moduleType: "audits", moduleId: input.auditId },
      });
      return { id: created.id };
    },
  };

  const auditCipPromotion: AuditCipPromotionPort = {
    async promoteOfi(input) {
      const created = await ofis.service.createFromAuditPromotion(
        input.identity,
        {
          id: input.ofi.id,
          title: input.ofi.title,
          opportunityForImprovement: input.ofi.opportunityForImprovement,
          businessUnitId: input.businessUnitId,
          createdBy: input.auditorId,
          auditId: input.auditId,
        }
      );
      return { id: created.id };
    },
  };

  const audits = createAuditModule({
    authorizer: security.authorizer,
    tasks: auditTasksAdapter,
    incidents: auditIncidentPromotion,
    risks: auditRiskPromotion,
    cips: auditCipPromotion,
    calendar: createAuditCalendarAdapter(calendar.service),
    notifications: createAuditNotificationAdapter(notifications.application),
  });

  const managementReviews = createManagementReviewModule({
    authorizer: security.authorizer,
    tasks: managementReviewTasksAdapter,
    calendar: createManagementReviewCalendarAdapter(calendar.service),
    notifications: createManagementReviewNotificationAdapter(
      notifications.application
    ),
  });

  const dashboard = createDashboardModule({
    authorizer: security.authorizer,
    ports: createDashboardPortsFromModules({
      risks: risks.service,
      incidents: incidents.service,
      audits: audits.service,
      ofi: ofis.service,
      suppliers: suppliers.service,
      inventory: assets.service,
      managementReviews: managementReviews.service,
      functionalUnits: functionalUnits.service,
      users: users.service,
      businessPremises: businessPremises.service,
      tasks: tasks.service,
    }),
  });

  const stats = createStatsModule({
    authorizer: security.authorizer,
    ports: createStatsPortsFromModules({
      risks: risks.service,
      incidents: incidents.service,
      audits: audits.service,
      ofi: ofis.service,
      suppliers: suppliers.service,
      inventory: assets.service,
      managementReviews: managementReviews.service,
      functionalUnits: functionalUnits.service,
      users: users.service,
      customers: customers.service,
      compliance: compliance.application,
    }),
  });

  router.use("/calendar", calendar.router);
  router.use("/dashboard", dashboard.router);
  router.use("/stats", stats.router);
  router.use("/risks", risks.router);
  router.use("/incidents", incidents.router);
  router.use("/audits", audits.router);
  router.use("/management-reviews", managementReviews.router);
  router.use("/ofi", ofis.router);
  router.use("/activities", activities.router);
  router.use("/compliance", compliance.router);
  router.use("/suppliers", suppliers.router);
  router.use("/customers", customers.router);
  router.use("/tasks", tasks.router);

  return {
    router,
    startBackgroundJobs: () =>
      startDocumentReviewReminderSchedule({
        service: documentManagement.reviewReminders,
        logger,
      }),
  };
}
