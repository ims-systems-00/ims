import { Router } from "express";
import type { MongoConnection } from "../../../infrastructure/mongodb/connection";
import type { SecurityPorts } from "../../../security";
import { createAssetsModule } from "../../../modules/assets";
import {
  createAuditModule,
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
  type IncidentTaskPort,
} from "../../../modules/incidents";
import {
  createManagementReviewModule,
  MANAGEMENT_REVIEWS_SOURCE_MODULE,
  type ManagementReviewTaskPort,
} from "../../../modules/management-reviews";
import {
  createOfiModule,
  OFI_SOURCE_MODULE,
  type OfiTaskPort,
} from "../../../modules/ofi";
import {
  createSupplierModule,
  SUPPLIERS_SOURCE_MODULE,
  type SupplierIncidentStatsPort,
  type SupplierTaskPort,
} from "../../../modules/suppliers";
import {
  createCustomerModule,
  CUSTOMERS_SOURCE_MODULE,
  type CustomerIncidentStatsPort,
  type CustomerTaskPort,
} from "../../../modules/customers";
import {
  createRiskModule,
  type RiskTaskPort,
} from "../../../modules/risks";
import {
  createTaskModule,
  createTasksSourceCleanupAdapter,
} from "../../../modules/tasks";
import { createUsersModule } from "../../../modules/users";
import {
  createNotificationsModule,
  createNotificationsUsersAdapter,
} from "../../../modules/notifications";
import { createChartsModule } from "../../../modules/charts";
import { createHealthRouter } from "./health";

export type V1RouterDeps = {
  mongo: MongoConnection;
  security: SecurityPorts;
};

/**
 * Centralized /api/v1 route registration (D-03).
 * Business modules mount here; keep this as the single version root.
 */
export function createV1Router(deps: V1RouterDeps): Router {
  const { mongo, security } = deps;
  const router = Router();
  router.use(createHealthRouter(mongo));

  const functionalUnits = createFunctionalUnitModule({
    authorizer: security.authorizer,
    dashboardInit: createLiveDashboardInitAdapter(),
  });
  const assets = createAssetsModule({ authorizer: security.authorizer });
  const businessPremises = createBusinessPremiseModule({
    authorizer: security.authorizer,
  });
  const users = createUsersModule({ authorizer: security.authorizer });

  const notifications = createNotificationsModule({
    authorizer: security.authorizer,
    users: createNotificationsUsersAdapter(users.service),
  });

  const charts = createChartsModule({
    authorizer: security.authorizer,
  });

  router.use("/functional-units", functionalUnits.router);
  router.use("/assets", assets.router);
  router.use("/business-premises", businessPremises.router);
  router.use("/users", users.router);
  router.use("/notifications", notifications.router);
  router.use("/charts", charts.router);

  const calendar = createCalendarModule({
    authorizer: security.authorizer,
  });

  const tasks = createTaskModule({
    authorizer: security.authorizer,
    calendar: createTaskCalendarAdapter(calendar.service),
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

  const risks = createRiskModule({
    authorizer: security.authorizer,
    tasks: riskTasksAdapter,
  });

  const incidents = createIncidentModule({
    authorizer: security.authorizer,
    tasks: incidentTasksAdapter,
    calendar: createIncidentCalendarAdapter(calendar.service),
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

  const ofis = createOfiModule({
    authorizer: security.authorizer,
    tasks: ofiTasksAdapter,
  });

  const suppliers = createSupplierModule({
    authorizer: security.authorizer,
    tasks: supplierTasksAdapter,
    incidentStats: supplierIncidentStatsAdapter,
    calendar: createSupplierCalendarAdapter(calendar.service),
  });

  const customers = createCustomerModule({
    authorizer: security.authorizer,
    tasks: customerTasksAdapter,
    incidents: customerIncidentStatsAdapter,
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
  });

  const managementReviews = createManagementReviewModule({
    authorizer: security.authorizer,
    tasks: managementReviewTasksAdapter,
    calendar: createManagementReviewCalendarAdapter(calendar.service),
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
  router.use("/suppliers", suppliers.router);
  router.use("/customers", customers.router);
  router.use("/tasks", tasks.router);
  return router;
}
