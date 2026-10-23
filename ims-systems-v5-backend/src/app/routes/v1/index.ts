import { Router } from "express";
import type { AppConfig } from "../../../config";
import {
  createLogger,
  type Logger,
} from "../../../infrastructure/logging/logger";
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
  createDocumentEmailAdapter,
  createDocumentMembershipAdapter,
  startDocumentReviewReminderSchedule,
} from "../../../modules/document-management";
import { createReportBugModule } from "../../../modules/report-bug";
import { createContactImsModule } from "../../../modules/contact-ims";
import { createRegisterPublicInterestModule } from "../../../modules/register-public-interest";
import {
  composeGoLiveSideEffects,
  createOrganisationModule,
  NoOpOrganisationGoLiveSideEffectsAdapter,
  type OrganisationGoLiveSideEffectsPort,
} from "../../../modules/organisation";
import {
  createLicenceRequestModule,
  createLicenceRequestRecipientsAdapter,
} from "../../../modules/licence-requests";
import { createPartnershipModule } from "../../../modules/partnerships";
import type { OrganisationBillingPort } from "../../../modules/payments";
import {
  createAssetsModule,
  createAssetBusinessUnitLookupAdapter,
  createAssetCategoryLookupAdapter,
  createAssetUserLookupAdapter,
} from "../../../modules/assets";
import {
  createAuditModule,
  createAuditNotificationAdapter,
  createAuditReportAdapter,
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
  createLeaveCalendarAdapter,
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
import {
  createFunctionalUnitModule,
  createOrganisationGroupLicenceAdapter,
} from "../../../modules/functional-units";
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
  createCustomerInteractionStatsAdapter,
  createCustomerInvoiceStatsAdapter,
  createCustomerNotificationAdapter,
  createOrganisationCrmLicenceAdapter,
  CUSTOMERS_SOURCE_MODULE,
  type CustomerIncidentStatsPort,
  type CustomerTaskPort,
} from "../../../modules/customers";
import {
  createEmailCampaignModule,
  createCustomerCampaignStatsAdapter,
} from "../../../modules/email-campaign";
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
import {
  createComplianceToolkitAdapter,
  createAuth0SessionAdapter,
  createOrganisationMembershipLookupAdapter,
  createOwnershipIntegrityAdapter,
  createUserNotificationAdapter,
  createUsersModule,
} from "../../../modules/users";
import { createInvitationModule } from "../../../modules/invitations";
import { createSearchModule } from "../../../modules/search";
import { createListScopePorts } from "../../../security/list-scope/create-list-scope.adapter";
import {
  createLeavesModule,
  createLeavesMembershipAdapter,
  createLeavesNotificationAdapter,
} from "../../../modules/leaves";
import { createInvoiceModule } from "../../../modules/invoices";
import { createInvoiceNotificationAdapter } from "../../../modules/invoices/adapters/notification.adapter";
import { createOrganisationRepository } from "../../../modules/organisation/repositories/organisation.repository";
import { createAuth0ManagementApiFromConfig } from "../../../security/auth0/auth0-management-api";
import { createComplianceAutomationQueue } from "../../../infrastructure/queue/automation-queue";
import { createDataImportQueue } from "../../../infrastructure/queue/data-import-queue";
import {
  createDataImportModule,
  createDataImportMigrator,
  createDataImportNotificationAdapter,
  createDataImportTargetWriterAdapter,
  InlineDataImportQueueAdapter,
} from "../../../modules/data-import";
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
  createComplianceIamGrantAdapter,
  createAutomationRunRepository,
  createComplianceAutomationAdapter,
  createComplianceAutomationRunner,
  createComplianceIncidentMirrorAdapter,
  createComplianceNotificationAdapter,
  createComplianceGoLiveProvisionAdapter,
  createComplianceOfiMirrorAdapter,
  createComplianceRiskMirrorAdapter,
  createIncidentComplianceLinkAdapter,
  createOfiComplianceLinkAdapter,
  createOrganisationComplianceLicenceAdapter,
  createRiskComplianceLinkAdapter,
} from "../../../modules/compliance";
import { createHealthRouter } from "./health";
import { createSecurityRouter } from "./security";
import { createAuthRouter } from "./auth";
import type { Auth0AuthenticationApi } from "../../../security/auth0/auth0-authentication-api";


export type V1RouterDeps = {
  mongo: MongoConnection;
  security: SecurityPorts;
  email?: EmailSystem;
  config?: AppConfig;
  logger?: Logger;
  /** Test injection for Auth0 BFF client. */
  auth0Api?: Auth0AuthenticationApi;
  /** Stripe Go Live checkout when STRIPE_ENABLED. */
  goLiveSideEffects?: OrganisationGoLiveSideEffectsPort;
  /** Stripe card/portal/upgrade when STRIPE_ENABLED. */
  billing?: OrganisationBillingPort;
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
  const {
    mongo,
    security,
    email,
    config,
    logger,
    auth0Api,
    goLiveSideEffects,
    billing,
  } = deps;
  const router = Router();
  router.use(createHealthRouter(mongo));
  router.use("/security", createSecurityRouter(security.authorizer));
  if (config) {
    router.use("/auth", createAuthRouter({ config, auth0Api }));
  }

  const reportBug = createReportBugModule({
    email,
    supportEmails: config?.REPORT_BUG_SUPPORT_EMAILS ?? [
      "support@imssystems.tech",
    ],
    // Mailtrap free testing limits ~1 msg/sec; skip delay in automated tests.
    confirmationDelayMs: config?.NODE_ENV === "test" ? 0 : 1_200,
  });
  router.use("/report-bug", reportBug.router);

  // Public marketing endpoints (no authorizer): email-only enquiries and
  // persisted product-interest registrations.
  const contactIms = createContactImsModule({
    email,
    supportEmails: config?.CONTACT_IMS_SUPPORT_EMAILS ?? [
      "support@imssystems.tech",
    ],
    confirmationDelayMs: config?.NODE_ENV === "test" ? 0 : 1_200,
  });
  router.use("/contact-ims", contactIms.router);

  const registerPublicInterest = createRegisterPublicInterestModule({ email });
  router.use("/register-public-interest", registerPublicInterest.router);

  // N-06: wire object storage whenever config is present (silent logger fallback).
  let objectStorage: ObjectStoragePort | undefined;
  if (config) {
    const filesLogger =
      logger ?? createLogger({ level: "silent", name: "files" });
    objectStorage = createObjectStorageFromConfig({
      config,
      logger: filesLogger,
    });
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
        maxUploadBytes: config.FILES_MAX_UPLOAD_BYTES,
      },
    });
    router.use("/files", files.router);
  }

  const organisationMembershipLookup =
    config?.SECURITY_PROVIDER === "auth0-openfga"
      ? createOrganisationMembershipLookupAdapter()
      : undefined;

  // L-01…L-10: real role/BU list scopes in auth0-openfga mode;
  // development-stub keeps the DevAll route defaults.
  const listScopes =
    config?.SECURITY_PROVIDER === "auth0-openfga"
      ? createListScopePorts()
      : undefined;

  // Auth0 Management API (N-13/N-09) — null until the M2M app is configured.
  const auth0Mgmt = config ? createAuth0ManagementApiFromConfig(config) : null;

  // Compliance is composed after Organisations, so Go Live toolkit
  // provisioning goes through a late-bound holder (set below once the
  // compliance service exists).
  const complianceProvisionHolder: {
    current: OrganisationGoLiveSideEffectsPort;
  } = { current: new NoOpOrganisationGoLiveSideEffectsAdapter() };
  const complianceProvisionDelegatingAdapter: OrganisationGoLiveSideEffectsPort =
    {
      provisionComplianceToolkits: (input) =>
        complianceProvisionHolder.current.provisionComplianceToolkits(input),
      createCardCheckoutSession: () => Promise.resolve(null),
      notifyGoLive: () => Promise.resolve(),
    };

  const organisations = createOrganisationModule({
    authorizer: security.authorizer,
    membershipProjection: security.membershipProjection,
    goLiveSideEffects: composeGoLiveSideEffects([
      goLiveSideEffects,
      complianceProvisionDelegatingAdapter,
    ]),
    billing,
    allowStubOrganisationAutoProvision:
      config?.SECURITY_PROVIDER === "development-stub",
  });
  router.use("/organisations", organisations.router);

  const licenceRequests = createLicenceRequestModule({
    allocation: {
      allocateLicences: (identity, input) =>
        organisations.service.requestLicence(identity, input),
    },
    email,
    supportEmails: config?.REPORT_BUG_SUPPORT_EMAILS ?? [
      "support@imssystems.tech",
    ],
    recipients: createLicenceRequestRecipientsAdapter(),
    logger,
  });
  router.use("/licence-requests", licenceRequests.router);

  const partnerships = createPartnershipModule({
    email,
    clientUrl: config?.CLIENT_URL ?? "http://localhost:3000",
    logger,
  });
  router.use("/partnerships", partnerships.router);

  const functionalUnits = createFunctionalUnitModule({
    authorizer: security.authorizer,
    dashboardInit: createLiveDashboardInitAdapter(),
    // FU-01: enforce group licences in auth0-openfga only.
    ...(config?.SECURITY_PROVIDER === "auth0-openfga"
      ? { groupLicence: createOrganisationGroupLicenceAdapter() }
      : {}),
    ...(organisationMembershipLookup
      ? { memberships: organisationMembershipLookup }
      : {}),
  });
  // A-01: real org-scoped lookups in auth0-openfga; AcceptAny stays
  // for development-stub (same pattern as membership lookup above).
  const assets =
    config?.SECURITY_PROVIDER === "auth0-openfga"
      ? createAssetsModule({
          authorizer: security.authorizer,
          users: createAssetUserLookupAdapter(),
          businessUnits: createAssetBusinessUnitLookupAdapter(),
          categories: createAssetCategoryLookupAdapter(),
        })
      : createAssetsModule({ authorizer: security.authorizer });
  const businessPremises = createBusinessPremiseModule({
    authorizer: security.authorizer,
  });
  const users = createUsersModule({
    authorizer: security.authorizer,
    // N-12: account lifecycle emails via EmailSystem (NoOp only if absent).
    notifications: createUserNotificationAdapter(email),
    // N-13: revoke Auth0 grants/sessions on access revoke/delete when
    // the Management API M2M app is configured (else NoOp + preflight warn).
    ...(auth0Mgmt
      ? {
          sessions: createAuth0SessionAdapter({
            mgmt: auth0Mgmt,
            logger,
          }),
        }
      : {}),
    ...(organisationMembershipLookup
      ? { memberships: organisationMembershipLookup }
      : {}),
    // U-07: real per-member toolkit assignment in auth0-openfga only.
    ...(config?.SECURITY_PROVIDER === "auth0-openfga"
      ? { toolkits: createComplianceToolkitAdapter() }
      : {}),
    // U-06: real cross-module ownership check/transfer in auth0-openfga.
    ...(config?.SECURITY_PROVIDER === "auth0-openfga"
      ? { ownership: createOwnershipIntegrityAdapter() }
      : {}),
  });

  const invitations = createInvitationModule({
    authorizer: security.authorizer,
    email,
    membershipProjection: security.membershipProjection,
    clientUrl: config?.CLIENT_URL ?? "http://localhost:3000",
  });
  router.use("/invitations", invitations.router);

  // F-07: global search (org-scoped, authorizer-checked per resource).
  const search = createSearchModule({
    authorizer: security.authorizer,
    useScopedVisibility: config?.SECURITY_PROVIDER === "auth0-openfga",
  });
  router.use("/search", search.router);

  const notificationsUsers = createNotificationsUsersAdapter(users.service);

  const notifications = createNotificationsModule({
    authorizer: security.authorizer,
    users: notificationsUsers,
  });

  // CRM Invoices (spec: docs/module-specifications/invoice.md).
  const invoices = createInvoiceModule({
    authorizer: security.authorizer,
    email,
    notifications: createInvoiceNotificationAdapter(notifications.application),
    issuerName: async (organizationId) => {
      const org = await createOrganisationRepository().findById(organizationId);
      return org?.name ?? "iMS Systems";
    },
  });
  router.use("/invoices", invoices.router);

  const charts = createChartsModule({
    authorizer: security.authorizer,
  });

  const kpiObjectives = createKpiObjectivesModule({
    authorizer: security.authorizer,
    ...(listScopes ? { listScope: listScopes.withOrganisational() } : {}),
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
    ...(listScopes ? { listScope: listScopes.businessUnitsStrict() } : {}),
  });

  const tasks = createTaskModule({
    authorizer: security.authorizer,
    calendar: createTaskCalendarAdapter(calendar.service),
    notifications: createTaskNotificationAdapter(notifications.application),
    ...(organisationMembershipLookup
      ? { memberships: organisationMembershipLookup }
      : {}),
  });
  const leaves = createLeavesModule({
    authorizer: security.authorizer,
    notifications: createLeavesNotificationAdapter(notifications.application),
    calendar: createLeaveCalendarAdapter(calendar.service),
    memberships: createLeavesMembershipAdapter({
      membershipLookup: users.memberships,
    }),
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
    ...(listScopes ? { listScope: listScopes.businessUnitsWithUnassigned() } : {}),
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
    ...(listScopes ? { listScope: listScopes.businessUnitsWithUnassigned() } : {}),
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
    ...(listScopes ? { listScope: listScopes.businessUnitsStrict() } : {}),
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
    ...(listScopes ? { listScope: listScopes.groups() } : {}),
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
    email: createDocumentEmailAdapter(email),
    memberships: createDocumentMembershipAdapter(),
    accessLinkBaseUrl: config?.CLIENT_URL,
  });
  router.use("/document-management", documentManagement.managementRouter);
  router.use("/document-repositories", documentManagement.repositoriesRouter);
  router.use("/document-trees", documentManagement.treesRouter);
  router.use("/document-shares", documentManagement.sharesRouter);
  router.use("/document-signatures", documentManagement.signaturesRouter);

  const complianceLicenceLookup =
    config?.SECURITY_PROVIDER === "auth0-openfga"
      ? createOrganisationComplianceLicenceAdapter()
      : undefined;

  // N-11 automation runner + optional BullMQ queue (Redis via email queue flag).
  const automationRunner = createComplianceAutomationRunner({
    runs: createAutomationRunRepository(),
    notify: async ({ organizationId, actorId, toolkitName, modulesWithRecords }) => {
      await notifications.application.createForRecipients({
        organizationId,
        createdBy: actorId,
        recipients: [
          {
            recipientUserId: actorId,
            title: "Compliance automation scan complete",
            message: modulesWithRecords.length
              ? `${toolkitName}: existing records found in ${modulesWithRecords.join(", ")} — review controls for auto-compliance.`
              : `${toolkitName}: no existing module records found yet.`,
            referenceType: "compliance",
            referenceModuleId: organizationId,
            screenIdentifier: "compliance",
            params: { id: organizationId },
          },
        ],
      });
    },
  });
  const automationQueue =
    config?.EMAIL_QUEUE_ENABLED && config
      ? (() => {
          const q = createComplianceAutomationQueue({
            config,
            logger: logger ?? createLogger({ level: "silent", name: "automation" }),
            handler: async (job) => {
              await automationRunner.runScan(
                job as Parameters<typeof automationRunner.runScan>[0],
              );
            },
          });
          q.startWorker();
          return q;
        })()
      : null;

  const compliance = createComplianceModule({
    authorizer: security.authorizer,
    // N-11: post-provision automation scan — BullMQ queue when the
    // email queue (Redis) is enabled, otherwise inline. Never throws.
    automation: createComplianceAutomationAdapter({
      runner: automationRunner,
      queue: automationQueue,
      logger,
    }),
    // N-10: provisioning a toolkit grants it to the provisioning member.
    iamGrant: createComplianceIamGrantAdapter(),
    ...(complianceLicenceLookup
      ? { licences: complianceLicenceLookup }
      : {}),
    activities: createComplianceActivityAdapter(activities.application),
    notifications: createComplianceNotificationAdapter({
      notifications: notifications.application,
      users: notificationsUsers,
    }),
    evidenceLinks: createComplianceEvidenceLinkAdapter(),
    riskMirror: createComplianceRiskMirrorAdapter(risks.service),
    incidentMirror: createComplianceIncidentMirrorAdapter(incidents.service),
    ofiMirror: createComplianceOfiMirrorAdapter(ofis.service),
  });

  complianceProvisionHolder.current =
    createComplianceGoLiveProvisionAdapter({
      compliance: compliance.service,
      logger,
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
    ...(listScopes ? { listScope: listScopes.businessUnitsStrict() } : {}),
    tasks: supplierTasksAdapter,
    incidentStats: supplierIncidentStatsAdapter,
    calendar: createSupplierCalendarAdapter(calendar.service),
    notifications: createSupplierNotificationAdapter({
      notifications: notifications.application,
      users: notificationsUsers,
    }),
  });

  const emailCampaigns = createEmailCampaignModule({
    authorizer: security.authorizer,
    email,
  });

  const customers = createCustomerModule({
    authorizer: security.authorizer,
    ...(listScopes ? { listScope: listScopes.customers() } : {}),
    tasks: customerTasksAdapter,
    incidents: customerIncidentStatsAdapter,
    // N-16: interaction analytics from the Activities timeline.
    interactions: createCustomerInteractionStatsAdapter(),
    // N-15: real invoice aggregates from the Invoice module.
    invoices: createCustomerInvoiceStatsAdapter(),
    campaigns: createCustomerCampaignStatsAdapter(emailCampaigns.service),
    notifications: createCustomerNotificationAdapter(
      notifications.application
    ),
    ...(config?.SECURITY_PROVIDER === "auth0-openfga"
      ? { licences: createOrganisationCrmLicenceAdapter() }
      : {}),
  });

  // Data Import — schema / validate / queue migration into CRM, risks,
  // incidents, and inventory (spec: docs/module-specifications/data-import.md).
  const dataImportNotifications = createDataImportNotificationAdapter(
    notifications.application
  );
  const dataImportWriter = createDataImportTargetWriterAdapter({
    customers: customers.service,
    risks: risks.service,
    incidents: incidents.service,
    assets: assets.service,
  });
  const dataImportMigrator = createDataImportMigrator({
    writer: dataImportWriter,
    notifications: dataImportNotifications,
    logger,
  });
  const dataImportQueue =
    config?.EMAIL_QUEUE_ENABLED && config
      ? (() => {
          const q = createDataImportQueue({
            config,
            logger:
              logger ?? createLogger({ level: "silent", name: "data-import" }),
            handler: async (job) => {
              await dataImportMigrator.run(job);
            },
          });
          q.startWorker();
          return q;
        })()
      : new InlineDataImportQueueAdapter(
          (job) => dataImportMigrator.run(job),
          (error) => {
            logger?.error(
              {
                err: error instanceof Error ? error.message : String(error),
              },
              "Data import inline migration failed"
            );
          }
        );
  const dataImport = createDataImportModule({
    authorizer: security.authorizer,
    notifications: dataImportNotifications,
    writer: dataImportWriter,
    queue: dataImportQueue,
  });
  router.use("/data-import", dataImport.router);

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
    ...(listScopes ? { listScope: listScopes.businessUnitsWithUnassigned() } : {}),
    tasks: auditTasksAdapter,
    incidents: auditIncidentPromotion,
    risks: auditRiskPromotion,
    cips: auditCipPromotion,
    calendar: createAuditCalendarAdapter(calendar.service),
    notifications: createAuditNotificationAdapter(notifications.application),
    // N-14: extract reports generated + emailed via EmailSystem.
    reports: createAuditReportAdapter(email),
  });

  const managementReviews = createManagementReviewModule({
    authorizer: security.authorizer,
    ...(listScopes ? { listScope: listScopes.withOrganisational() } : {}),
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
      documents: documentManagement.application,
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
  router.use("/email-campaigns", emailCampaigns.router);
  router.use("/tasks", tasks.router);
  router.use("/leaves", leaves.router);

  return {
    router,
    startBackgroundJobs: () =>
      startDocumentReviewReminderSchedule({
        service: documentManagement.reviewReminders,
        logger,
      }),
  };
}
