/**
 * Demo seed for local UI testing.
 *
 * Idempotent upserts into the V5 MongoDB used by the development stub org.
 * Safe to re-run. Does not touch V4 databases.
 *
 * Usage (from ims-systems-v5-backend):
 *   pnpm seed:demo
 */
import { config as loadDotenv } from "dotenv";
import mongoose from "mongoose";
import { loadConfig } from "../src/config";
import { hashPassword } from "../src/modules/users/services/password";
import { getUserModel } from "../src/modules/users/repositories/user.model";
import { getUnitMembershipModel } from "../src/modules/users/repositories/unit-membership.model";
import { getFunctionalUnitModel } from "../src/modules/functional-units/repositories/functional-unit.model";
import { getHardwareAssetModel } from "../src/modules/assets/repositories/hardware.model";
import { getSoftwareAssetModel } from "../src/modules/assets/repositories/software.model";
import { getPeopleAssetModel } from "../src/modules/assets/repositories/people.model";
import { getPremiseAssetModel } from "../src/modules/assets/repositories/premise.model";
import { getInformationAssetModel } from "../src/modules/assets/repositories/information.model";
import { getRiskModel } from "../src/modules/risks/repositories/risk.model";
import { getTaskModel } from "../src/modules/tasks/repositories/task.model";
import { getIncidentModel } from "../src/modules/incidents/repositories/incident.model";
import { getAuditModel } from "../src/modules/audits/repositories/audit.model";
import { getManagementReviewModel } from "../src/modules/management-reviews/repositories/management-review.model";
import { getCustomerModel } from "../src/modules/customers/repositories/customer.model";
import { DEFAULT_CUSTOMER_LOGO_SRC } from "../src/modules/customers/types";
import { getOfiModel } from "../src/modules/ofi/repositories/ofi.model";
import { getSupplierModel } from "../src/modules/suppliers/repositories/supplier.model";

loadDotenv();

/** Matches frontend / backend development stub organisation. */
const ORG_ID = "000000000000000000000001";
const CREATED_BY = "demo-seed";
/** Session subject used by the development security stub — required for task visibility. */
const STUB_SUBJECT = "dev-stub-user";

const ids = {
  users: {
    ada: "100000000000000000000001",
    alan: "100000000000000000000002",
    grace: "100000000000000000000003",
    katherine: "100000000000000000000004",
    tim: "100000000000000000000005",
    margaret: "100000000000000000000006",
  },
  units: {
    operations: "200000000000000000000001",
    it: "200000000000000000000002",
    compliance: "200000000000000000000003",
    externalAudit: "200000000000000000000004",
    partners: "200000000000000000000005",
  },
  hardware: {
    laptop: "300000000000000000000001",
    monitor: "300000000000000000000002",
    phone: "300000000000000000000003",
  },
  software: {
    office: "310000000000000000000001",
    slack: "310000000000000000000002",
    jira: "310000000000000000000003",
  },
  people: {
    dpo: "320000000000000000000001",
    auditor: "320000000000000000000002",
  },
  premise: {
    hq: "330000000000000000000001",
    warehouse: "330000000000000000000002",
  },
  information: {
    policies: "340000000000000000000001",
    customerDb: "340000000000000000000002",
  },
  risks: {
    unpatched: "400000000000000000000001",
    phishing: "400000000000000000000002",
    fireExit: "400000000000000000000003",
    vendorSla: "400000000000000000000004",
    clinical: "400000000000000000000005",
    accessReview: "400000000000000000000006",
  },
  tasks: {
    patchServers: "500000000000000000000001",
    accessReview: "500000000000000000000002",
    fireDrill: "500000000000000000000003",
    phishingTraining: "500000000000000000000004",
    policyUpdate: "500000000000000000000005",
    vendorFollowUp: "500000000000000000000006",
  },
  incidents: {
    waterLeak: "600000000000000000000001",
    phishing: "600000000000000000000002",
    accessOutage: "600000000000000000000003",
    lostBadge: "600000000000000000000004",
    supplierBreach: "600000000000000000000005",
    dataExport: "600000000000000000000006",
  },
  audits: {
    isoInternalQ1: "700000000000000000000001",
    isoInternalQ2: "700000000000000000000002",
    accessControl: "700000000000000000000003",
    supplierExternal: "700000000000000000000004",
    premisesHse: "700000000000000000000005",
    completedInternal: "700000000000000000000006",
  },
  managementReviews: {
    leadershipQ1: "800000000000000000000001",
    leadershipQ2: "800000000000000000000002",
    itMonthly: "800000000000000000000003",
    opsBu: "800000000000000000000004",
    annualIsms: "800000000000000000000005",
    completedHalfYear: "800000000000000000000006",
  },
  reviewTasks: {
    followUpActions: "500000000000000000000007",
  },
  customers: {
    northwind: "900000000000000000000001",
    contoso: "900000000000000000000002",
    fabrikam: "900000000000000000000003",
    adventure: "900000000000000000000004",
    alpine: "900000000000000000000005",
    wideworld: "900000000000000000000006",
    lostDeal: "900000000000000000000007",
  },
  ofis: {
    accessLogs: "a00000000000000000000001",
    backupRestore: "a00000000000000000000002",
    vendorOnboarding: "a00000000000000000000003",
    deskClear: "a00000000000000000000004",
    phishingSim: "a00000000000000000000005",
    changeWindow: "a00000000000000000000006",
  },
  suppliers: {
    cloudflare: "b00000000000000000000001",
    digicert: "b00000000000000000000002",
    officeClean: "b00000000000000000000003",
    penTest: "b00000000000000000000004",
    logistics: "b00000000000000000000005",
    legacyIsp: "b00000000000000000000006",
  },
} as const;

async function main(): Promise<void> {
  const config = loadConfig();
  await mongoose.connect(config.MONGODB_URI);
  console.log(`Connected: ${config.MONGODB_URI}`);

  const passwordHash = await hashPassword("DemoPass123!");
  const User = getUserModel();
  const Unit = getFunctionalUnitModel();
  const UnitMembership = getUnitMembershipModel();
  const Hardware = getHardwareAssetModel();
  const Software = getSoftwareAssetModel();
  const People = getPeopleAssetModel();
  const Premise = getPremiseAssetModel();
  const Information = getInformationAssetModel();
  const Risk = getRiskModel();
  const Task = getTaskModel();
  const Incident = getIncidentModel();
  const Audit = getAuditModel();
  const ManagementReview = getManagementReviewModel();
  const Customer = getCustomerModel();
  const Ofi = getOfiModel();
  const Supplier = getSupplierModel();

  const users = [
    {
      id: ids.users.ada,
      reference: "USR-DEMO-001",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada.lovelace@demo.local",
    },
    {
      id: ids.users.alan,
      reference: "USR-DEMO-002",
      firstName: "Alan",
      lastName: "Turing",
      email: "alan.turing@demo.local",
    },
    {
      id: ids.users.grace,
      reference: "USR-DEMO-003",
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace.hopper@demo.local",
    },
    {
      id: ids.users.katherine,
      reference: "USR-DEMO-004",
      firstName: "Katherine",
      lastName: "Johnson",
      email: "katherine.johnson@demo.local",
    },
    {
      id: ids.users.tim,
      reference: "USR-DEMO-005",
      firstName: "Tim",
      lastName: "Berners-Lee",
      email: "tim.berners-lee@demo.local",
    },
    {
      id: ids.users.margaret,
      reference: "USR-DEMO-006",
      firstName: "Margaret",
      lastName: "Hamilton",
      email: "margaret.hamilton@demo.local",
    },
  ];

  for (const user of users) {
    await User.findByIdAndUpdate(
      user.id,
      {
        $set: {
          reference: user.reference,
          type: "Internal",
          firstName: user.firstName,
          lastName: user.lastName,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email.toLowerCase(),
          passwordHash,
          phone: "",
          emailVerified: { status: "verified", on: new Date() },
          phoneVerified: { status: "pending", on: null },
          systemPassword: { status: "active" },
          systemAccess: {
            status: "Active",
            period: "Full time",
            expires: null,
            updatedOn: new Date(),
          },
          accessPolicies: [],
          preferences: { darkMode: false, activeTheme: "slate" },
          country: { name: "United Kingdom", code: "GB" },
          locations: [],
          createdBy: CREATED_BY,
          createdOn: new Date(),
          deletedAt: null,
          badAttempts: 0,
          lockedUntil: null,
        },
        $setOnInsert: { _id: user.id },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  console.log(`Users: ${users.length}`);

  const units = [
    {
      id: ids.units.operations,
      reference: "FU-DEMO-OPS",
      name: "Operations",
      accessType: "Internal business function",
      responsibility: "Day-to-day delivery and operational excellence.",
      operatingLocation: "London HQ",
      totalMembers: 3,
    },
    {
      id: ids.units.it,
      reference: "FU-DEMO-IT",
      name: "Information Technology",
      accessType: "Internal business function",
      responsibility: "Platform, infrastructure, and developer tooling.",
      operatingLocation: "Remote / London",
      totalMembers: 2,
    },
    {
      id: ids.units.compliance,
      reference: "FU-DEMO-COMP",
      name: "Internal Compliance",
      accessType: "Internal compliance function",
      responsibility: "Policy ownership and control assurance.",
      standards: "ISO 27001, GDPR",
      totalMembers: 2,
    },
    {
      id: ids.units.externalAudit,
      reference: "FU-DEMO-EXT",
      name: "External Audit Partners",
      accessType: "External compliance function",
      responsibility: "Independent assurance and certification reviews.",
      standards: "ISO 27001",
      totalMembers: 1,
    },
    {
      id: ids.units.partners,
      reference: "FU-DEMO-PART",
      name: "Delivery Partners",
      accessType: "External function",
      responsibility: "External contractors supporting project delivery.",
      operatingLocation: "Multiple sites",
      totalMembers: 1,
    },
  ];

  for (const unit of units) {
    await Unit.findByIdAndUpdate(
      unit.id,
      {
        $set: {
          organizationId: ORG_ID,
          reference: unit.reference,
          name: unit.name,
          accessType: unit.accessType,
          responsibility: unit.responsibility,
          operatingLocation: unit.operatingLocation,
          standards: unit.standards,
          totalMembers: unit.totalMembers,
          complianceToolkits: [],
          isSystemDefault: false,
          deletedAt: null,
        },
        $setOnInsert: { _id: unit.id },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  console.log(`Functional units: ${units.length}`);

  const memberships: Array<{
    userId: string;
    functionalUnitId: string;
  }> = [
    { userId: ids.users.ada, functionalUnitId: ids.units.operations },
    { userId: ids.users.alan, functionalUnitId: ids.units.operations },
    { userId: ids.users.grace, functionalUnitId: ids.units.operations },
    { userId: ids.users.tim, functionalUnitId: ids.units.it },
    { userId: ids.users.margaret, functionalUnitId: ids.units.it },
    { userId: ids.users.katherine, functionalUnitId: ids.units.compliance },
    { userId: ids.users.ada, functionalUnitId: ids.units.compliance },
    { userId: ids.users.grace, functionalUnitId: ids.units.externalAudit },
    { userId: ids.users.alan, functionalUnitId: ids.units.partners },
  ];

  for (const membership of memberships) {
    await UnitMembership.updateOne(
      {
        organizationId: ORG_ID,
        userId: membership.userId,
        functionalUnitId: membership.functionalUnitId,
      },
      {
        $setOnInsert: {
          organizationId: ORG_ID,
          userId: membership.userId,
          functionalUnitId: membership.functionalUnitId,
        },
      },
      { upsert: true }
    );
  }
  console.log(`Unit memberships: ${memberships.length}`);

  await Hardware.findByIdAndUpdate(
    ids.hardware.laptop,
    {
      $set: {
        organizationId: ORG_ID,
        reference: "HD-DEMO-001",
        name: "MacBook Pro 14",
        tag: "ASSET-LAP-01",
        ownerId: ids.users.ada,
        businessUnitId: ids.units.it,
        assignedDate: new Date("2025-01-15"),
        cost: 2499,
        createdBy: CREATED_BY,
        deletedAt: null,
      },
      $setOnInsert: { _id: ids.hardware.laptop },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );
  await Hardware.findByIdAndUpdate(
    ids.hardware.monitor,
    {
      $set: {
        organizationId: ORG_ID,
        reference: "HD-DEMO-002",
        name: "Dell UltraSharp 27",
        tag: "ASSET-MON-02",
        ownerId: ids.users.alan,
        businessUnitId: ids.units.operations,
        assignedDate: new Date("2024-11-01"),
        cost: 450,
        createdBy: CREATED_BY,
        deletedAt: null,
      },
      $setOnInsert: { _id: ids.hardware.monitor },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );
  await Hardware.findByIdAndUpdate(
    ids.hardware.phone,
    {
      $set: {
        organizationId: ORG_ID,
        reference: "HD-DEMO-003",
        name: "iPhone 15",
        tag: "ASSET-PHN-03",
        ownerId: ids.users.grace,
        businessUnitId: ids.units.operations,
        assignedDate: new Date("2025-03-20"),
        cost: 999,
        createdBy: CREATED_BY,
        deletedAt: null,
      },
      $setOnInsert: { _id: ids.hardware.phone },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  await Software.findByIdAndUpdate(
    ids.software.office,
    {
      $set: {
        organizationId: ORG_ID,
        reference: "SW-DEMO-001",
        name: "Microsoft 365 Business",
        businessUnitId: ids.units.it,
        licenceCount: 50,
        installCount: 42,
        cost: 7200,
        keys: [],
        documents: [],
        createdBy: CREATED_BY,
        deletedAt: null,
      },
      $setOnInsert: { _id: ids.software.office },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );
  await Software.findByIdAndUpdate(
    ids.software.slack,
    {
      $set: {
        organizationId: ORG_ID,
        reference: "SW-DEMO-002",
        name: "Slack Pro",
        businessUnitId: ids.units.operations,
        licenceCount: 40,
        installCount: 38,
        cost: 3600,
        keys: [],
        documents: [],
        createdBy: CREATED_BY,
        deletedAt: null,
      },
      $setOnInsert: { _id: ids.software.slack },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );
  await Software.findByIdAndUpdate(
    ids.software.jira,
    {
      $set: {
        organizationId: ORG_ID,
        reference: "SW-DEMO-003",
        name: "Jira Cloud",
        businessUnitId: ids.units.it,
        licenceCount: 25,
        installCount: 25,
        cost: 2100,
        keys: [],
        documents: [],
        createdBy: CREATED_BY,
        deletedAt: null,
      },
      $setOnInsert: { _id: ids.software.jira },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  await People.findByIdAndUpdate(
    ids.people.dpo,
    {
      $set: {
        organizationId: ORG_ID,
        reference: "PP-DEMO-001",
        name: "Data Protection Officer",
        role: "DPO",
        skill: "Privacy & GDPR",
        responsibility: "Oversee personal data processing and DPIAs.",
        businessUnitId: ids.units.compliance,
        cost: 85000,
        createdBy: CREATED_BY,
        deletedAt: null,
      },
      $setOnInsert: { _id: ids.people.dpo },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );
  await People.findByIdAndUpdate(
    ids.people.auditor,
    {
      $set: {
        organizationId: ORG_ID,
        reference: "PP-DEMO-002",
        name: "Internal Auditor",
        role: "Auditor",
        skill: "ISMS audit",
        responsibility: "Plan and execute internal compliance audits.",
        businessUnitId: ids.units.compliance,
        cost: 65000,
        createdBy: CREATED_BY,
        deletedAt: null,
      },
      $setOnInsert: { _id: ids.people.auditor },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  await Premise.findByIdAndUpdate(
    ids.premise.hq,
    {
      $set: {
        organizationId: ORG_ID,
        reference: "PR-DEMO-001",
        name: "London Headquarters",
        location: "London",
        address: "1 Demo Street, London EC2A 4BX",
        businessUnitId: ids.units.operations,
        cost: 450000,
        createdBy: CREATED_BY,
        deletedAt: null,
      },
      $setOnInsert: { _id: ids.premise.hq },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );
  await Premise.findByIdAndUpdate(
    ids.premise.warehouse,
    {
      $set: {
        organizationId: ORG_ID,
        reference: "PR-DEMO-002",
        name: "Northern Warehouse",
        location: "Manchester",
        address: "22 Logistics Park, Manchester M17 1AB",
        businessUnitId: ids.units.operations,
        cost: 180000,
        createdBy: CREATED_BY,
        deletedAt: null,
      },
      $setOnInsert: { _id: ids.premise.warehouse },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  await Information.findByIdAndUpdate(
    ids.information.policies,
    {
      $set: {
        organizationId: ORG_ID,
        reference: "IN-DEMO-001",
        title: "Information Security Policy Set",
        informationInventory: "Corporate policies",
        ownerId: ids.users.katherine,
        storageLocation: "SharePoint / Policies",
        format: "PDF",
        link: "https://example.local/policies",
        businessUnitId: ids.units.compliance,
        cost: 0,
        createdBy: CREATED_BY,
        deletedAt: null,
      },
      $setOnInsert: { _id: ids.information.policies },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );
  await Information.findByIdAndUpdate(
    ids.information.customerDb,
    {
      $set: {
        organizationId: ORG_ID,
        reference: "IN-DEMO-002",
        title: "Customer CRM Database",
        informationInventory: "Customer records",
        ownerId: ids.users.tim,
        storageLocation: "AWS RDS eu-west-2",
        format: "Database",
        link: "",
        businessUnitId: ids.units.it,
        cost: 12000,
        createdBy: CREATED_BY,
        deletedAt: null,
      },
      $setOnInsert: { _id: ids.information.customerDb },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  console.log("Assets: hardware 3, software 3, people 2, premise 2, information 2");

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  const demoRisks = [
    {
      id: ids.risks.unpatched,
      reference: "RK-DEMO-001",
      title: "Unpatched production servers",
      description:
        "Critical security patches are outstanding on several production hosts, increasing exposure to known CVEs.",
      type: "Hardware",
      businessUnitId: ids.units.it,
      assetId: ids.hardware.laptop,
      ownerId: ids.users.ada,
      initialScore: { likelihood: 4, consequence: 5, total: 20 },
      currentScore: { likelihood: 4, consequence: 5, total: 20 },
      raisedOn: daysAgo(12),
      mitigated: { status: false, by: null, on: null },
      accepted: { status: false, by: null, on: null },
      escalated: { status: true, by: ids.users.alan, on: daysAgo(3) },
      activity: [
        {
          id: "act-demo-001a",
          type: "raised",
          message: "Risk raised",
          actorId: ids.users.ada,
          at: daysAgo(12),
        },
        {
          id: "act-demo-001b",
          type: "escalated",
          message: "Risk escalated",
          actorId: ids.users.alan,
          at: daysAgo(3),
        },
      ],
    },
    {
      id: ids.risks.phishing,
      reference: "RK-DEMO-002",
      title: "Phishing campaign targeting finance",
      description:
        "Repeated phishing attempts have been reported against finance mailbox users.",
      type: "People",
      businessUnitId: ids.units.operations,
      ownerId: ids.users.grace,
      initialScore: { likelihood: 3, consequence: 4, total: 12 },
      currentScore: { likelihood: 2, consequence: 4, total: 8 },
      raisedOn: daysAgo(20),
      mitigationText: "Mandatory awareness training completed; mail filters tightened.",
      mitigated: {
        status: true,
        by: ids.users.grace,
        on: daysAgo(2),
      },
      accepted: { status: false, by: null, on: null },
      escalated: { status: false, by: null, on: null },
      activity: [
        {
          id: "act-demo-002a",
          type: "raised",
          message: "Risk raised",
          actorId: ids.users.grace,
          at: daysAgo(20),
        },
        {
          id: "act-demo-002b",
          type: "mitigated",
          message: "Risk mitigated",
          actorId: ids.users.grace,
          at: daysAgo(2),
        },
      ],
    },
    {
      id: ids.risks.fireExit,
      reference: "RK-DEMO-003",
      title: "Blocked fire exit at HQ",
      description:
        "Secondary fire exit on floor 2 is intermittently obstructed by stored equipment.",
      type: "Premise",
      businessUnitId: ids.units.operations,
      assetId: ids.premise.hq,
      ownerId: ids.users.margaret,
      initialScore: { likelihood: 2, consequence: 5, total: 10 },
      currentScore: { likelihood: 2, consequence: 5, total: 10 },
      raisedOn: daysAgo(8),
      mitigated: { status: false, by: null, on: null },
      accepted: { status: false, by: null, on: null },
      escalated: { status: false, by: null, on: null },
      activity: [
        {
          id: "act-demo-003a",
          type: "raised",
          message: "Risk raised",
          actorId: ids.users.margaret,
          at: daysAgo(8),
        },
      ],
    },
    {
      id: ids.risks.vendorSla,
      reference: "RK-DEMO-004",
      title: "Key SaaS vendor SLA breaches",
      description:
        "Primary collaboration platform has missed contractual uptime targets for two consecutive months.",
      type: "Software",
      businessUnitId: ids.units.it,
      assetId: ids.software.slack,
      ownerId: ids.users.tim,
      initialScore: { likelihood: 3, consequence: 3, total: 9 },
      currentScore: { likelihood: 3, consequence: 3, total: 9 },
      raisedOn: daysAgo(15),
      acceptanceRationale:
        "Accepted pending contract renewal; monitoring dashboard in place.",
      decisionMaker: "Head of IT",
      mitigated: { status: false, by: null, on: null },
      accepted: {
        status: true,
        by: ids.users.alan,
        on: daysAgo(5),
      },
      escalated: { status: false, by: null, on: null },
      activity: [
        {
          id: "act-demo-004a",
          type: "raised",
          message: "Risk raised",
          actorId: ids.users.tim,
          at: daysAgo(15),
        },
        {
          id: "act-demo-004b",
          type: "accepted",
          message: "Risk accepted",
          actorId: ids.users.alan,
          at: daysAgo(5),
        },
      ],
    },
    {
      id: ids.risks.clinical,
      reference: "RK-DEMO-005",
      title: "Clinical protocol variance",
      description:
        "Observed variance between documented clinical protocols and practice on two wards.",
      type: "Clinical",
      businessUnitId: ids.units.compliance,
      ownerId: ids.users.katherine,
      initialScore: { likelihood: 3, consequence: 5, total: 15 },
      currentScore: { likelihood: 3, consequence: 5, total: 15 },
      raisedOn: daysAgo(6),
      mitigated: { status: false, by: null, on: null },
      accepted: { status: false, by: null, on: null },
      escalated: {
        status: true,
        by: ids.users.katherine,
        on: daysAgo(1),
      },
      activity: [
        {
          id: "act-demo-005a",
          type: "raised",
          message: "Risk raised",
          actorId: ids.users.katherine,
          at: daysAgo(6),
        },
        {
          id: "act-demo-005b",
          type: "escalated",
          message: "Risk escalated",
          actorId: ids.users.katherine,
          at: daysAgo(1),
        },
      ],
    },
    {
      id: ids.risks.accessReview,
      reference: "RK-DEMO-006",
      title: "Delayed privileged access review",
      description:
        "Quarterly privileged access review is overdue for the finance and HR systems.",
      type: "Organisational",
      businessUnitId: ids.units.compliance,
      ownerId: ids.users.ada,
      initialScore: { likelihood: 2, consequence: 3, total: 6 },
      currentScore: { likelihood: 2, consequence: 3, total: 6 },
      raisedOn: daysAgo(4),
      mitigated: { status: false, by: null, on: null },
      accepted: { status: false, by: null, on: null },
      escalated: { status: false, by: null, on: null },
      activity: [
        {
          id: "act-demo-006a",
          type: "raised",
          message: "Risk raised",
          actorId: ids.users.ada,
          at: daysAgo(4),
        },
      ],
    },
  ] as const;

  for (const risk of demoRisks) {
    await Risk.findByIdAndUpdate(
      risk.id,
      {
        $set: {
          organizationId: ORG_ID,
          reference: risk.reference,
          title: risk.title,
          description: risk.description,
          type: risk.type,
          businessUnitId: risk.businessUnitId,
          assetId: "assetId" in risk ? risk.assetId : undefined,
          ownerId: risk.ownerId,
          initialScore: risk.initialScore,
          currentScore: risk.currentScore,
          mitigationText:
            "mitigationText" in risk ? risk.mitigationText : undefined,
          acceptanceRationale:
            "acceptanceRationale" in risk
              ? risk.acceptanceRationale
              : undefined,
          decisionMaker:
            "decisionMaker" in risk ? risk.decisionMaker : undefined,
          mitigated: risk.mitigated,
          accepted: risk.accepted,
          escalated: risk.escalated,
          attachments: [],
          complianceLinks: [],
          activity: [...risk.activity],
          raisedBy: risk.ownerId,
          raisedOn: risk.raisedOn,
          updatedBy: null,
          updatedOn: null,
          nextNudgeAt: null,
          deletedAt: null,
        },
        $setOnInsert: { _id: risk.id },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  console.log(`Risks: ${demoRisks.length} demo risks`);

  const daysFromNow = (n: number) =>
    new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

  /**
   * Tasks are visibility-scoped to creator OR assignee.
   * Seed with createdBy / assignees including STUB_SUBJECT so the
   * development-stub session can see and exercise lifecycle actions.
   */
  const demoTasks = [
    {
      id: ids.tasks.patchServers,
      reference: "TSK-DEMO-001",
      name: "Patch unpatched production servers",
      description:
        "Apply outstanding critical security patches to the production VM fleet and confirm reboot windows with Operations.",
      dueDate: daysFromNow(3),
      priority: "High" as const,
      teamPriority: false,
      assignees: [
        { userId: STUB_SUBJECT, acceptance: "Pending" as const },
        { userId: ids.users.alan, acceptance: "Pending" as const },
      ],
      status: "Pending" as const,
      completedBy: null,
      completedOn: null,
      attachments: [
        {
          id: "att-demo-001",
          fileName: "patch-window.pdf",
          mimeType: "application/pdf",
          sizeBytes: 42000,
          url: "https://example.local/docs/patch-window.pdf",
          uploadedBy: STUB_SUBJECT,
          uploadedAt: daysAgo(1),
        },
      ],
      source: {
        moduleType: "risks",
        moduleId: ids.risks.unpatched,
      },
      activity: [
        {
          id: "task-act-001a",
          type: "created",
          message: "Task created",
          actorId: STUB_SUBJECT,
          at: daysAgo(1),
        },
      ],
      createdBy: STUB_SUBJECT,
      createdOn: daysAgo(1),
      nextNudgeAt: null,
    },
    {
      id: ids.tasks.accessReview,
      reference: "TSK-DEMO-002",
      name: "Complete privileged access review",
      description:
        "Finish the overdue quarterly privileged access review for finance and HR systems.",
      dueDate: daysAgo(2),
      priority: "High" as const,
      teamPriority: false,
      assignees: [
        { userId: STUB_SUBJECT, acceptance: "Accepted" as const },
        { userId: ids.users.ada, acceptance: "Accepted" as const },
      ],
      status: "In progress" as const,
      completedBy: null,
      completedOn: null,
      attachments: [],
      source: {
        moduleType: "risks",
        moduleId: ids.risks.accessReview,
      },
      activity: [
        {
          id: "task-act-002a",
          type: "created",
          message: "Task created",
          actorId: STUB_SUBJECT,
          at: daysAgo(5),
        },
        {
          id: "task-act-002b",
          type: "accepted",
          message: "Assignment accepted",
          actorId: STUB_SUBJECT,
          at: daysAgo(4),
        },
      ],
      createdBy: STUB_SUBJECT,
      createdOn: daysAgo(5),
      nextNudgeAt: null,
    },
    {
      id: ids.tasks.fireDrill,
      reference: "TSK-DEMO-003",
      name: "Schedule warehouse fire-exit drill",
      description:
        "Coordinate with Facilities to run a supervised fire-exit drill at the warehouse site.",
      dueDate: daysFromNow(10),
      priority: "Medium" as const,
      teamPriority: true,
      businessUnitId: ids.units.operations,
      assignees: [
        { userId: STUB_SUBJECT, acceptance: "Pending" as const },
        { userId: ids.users.margaret, acceptance: "Pending" as const },
        { userId: ids.users.tim, acceptance: "Accepted" as const },
      ],
      status: "In progress" as const,
      completedBy: null,
      completedOn: null,
      attachments: [],
      source: {
        moduleType: "risks",
        moduleId: ids.risks.fireExit,
      },
      activity: [
        {
          id: "task-act-003a",
          type: "created",
          message: "Task created",
          actorId: STUB_SUBJECT,
          at: daysAgo(3),
        },
        {
          id: "task-act-003b",
          type: "accepted",
          message: "Assignment accepted",
          actorId: ids.users.tim,
          at: daysAgo(2),
        },
      ],
      createdBy: STUB_SUBJECT,
      createdOn: daysAgo(3),
      nextNudgeAt: null,
    },
    {
      id: ids.tasks.phishingTraining,
      reference: "TSK-DEMO-004",
      name: "Roll out phishing awareness module",
      description:
        "Publish the refreshed phishing awareness module to all internal users and track completion.",
      dueDate: daysFromNow(14),
      priority: "Medium" as const,
      teamPriority: false,
      assignees: [
        { userId: ids.users.grace, acceptance: "Accepted" as const },
        { userId: STUB_SUBJECT, acceptance: "Declined" as const },
      ],
      status: "In progress" as const,
      completedBy: null,
      completedOn: null,
      attachments: [],
      source: {
        moduleType: "risks",
        moduleId: ids.risks.phishing,
      },
      activity: [
        {
          id: "task-act-004a",
          type: "created",
          message: "Task created",
          actorId: STUB_SUBJECT,
          at: daysAgo(7),
        },
        {
          id: "task-act-004b",
          type: "accepted",
          message: "Assignment accepted",
          actorId: ids.users.grace,
          at: daysAgo(6),
        },
        {
          id: "task-act-004c",
          type: "declined",
          message: "Assignment declined",
          actorId: STUB_SUBJECT,
          at: daysAgo(6),
        },
      ],
      createdBy: STUB_SUBJECT,
      createdOn: daysAgo(7),
      nextNudgeAt: null,
    },
    {
      id: ids.tasks.policyUpdate,
      reference: "TSK-DEMO-005",
      name: "Publish updated access-control policy",
      description:
        "Finalise and publish the updated access-control policy after compliance review.",
      dueDate: daysAgo(1),
      priority: "Low" as const,
      teamPriority: false,
      assignees: [
        { userId: ids.users.katherine, acceptance: "Accepted" as const },
        { userId: STUB_SUBJECT, acceptance: "Accepted" as const },
      ],
      status: "Complete" as const,
      completedBy: STUB_SUBJECT,
      completedOn: daysAgo(1),
      attachments: [],
      activity: [
        {
          id: "task-act-005a",
          type: "created",
          message: "Task created",
          actorId: STUB_SUBJECT,
          at: daysAgo(12),
        },
        {
          id: "task-act-005b",
          type: "completed",
          message: "Task completed",
          actorId: STUB_SUBJECT,
          at: daysAgo(1),
        },
      ],
      createdBy: STUB_SUBJECT,
      createdOn: daysAgo(12),
      nextNudgeAt: null,
    },
    {
      id: ids.tasks.vendorFollowUp,
      reference: "TSK-DEMO-006",
      name: "Follow up on vendor SLA remediation",
      description:
        "Confirm the vendor has closed the SLA breach items and attach their written response.",
      dueDate: daysFromNow(7),
      priority: "High" as const,
      teamPriority: false,
      assignees: [{ userId: STUB_SUBJECT, acceptance: "Pending" as const }],
      status: "Pending" as const,
      completedBy: null,
      completedOn: null,
      attachments: [],
      source: {
        moduleType: "risks",
        moduleId: ids.risks.vendorSla,
      },
      activity: [
        {
          id: "task-act-006a",
          type: "created",
          message: "Task created",
          actorId: STUB_SUBJECT,
          at: daysAgo(0),
        },
      ],
      createdBy: STUB_SUBJECT,
      createdOn: daysAgo(0),
      nextNudgeAt: null,
    },
  ];

  for (const task of demoTasks) {
    await Task.findByIdAndUpdate(
      task.id,
      {
        $set: {
          organizationId: ORG_ID,
          reference: task.reference,
          name: task.name,
          description: task.description,
          dueDate: task.dueDate,
          priority: task.priority,
          teamPriority: task.teamPriority,
          businessUnitId:
            "businessUnitId" in task ? task.businessUnitId : undefined,
          assignees: [...task.assignees],
          status: task.status,
          completedBy: task.completedBy,
          completedOn: task.completedOn,
          attachments: [...task.attachments],
          source: "source" in task ? task.source : undefined,
          activity: [...task.activity],
          createdBy: task.createdBy,
          createdOn: task.createdOn,
          updatedBy: null,
          updatedOn: null,
          nextNudgeAt: task.nextNudgeAt,
          deletedAt: null,
        },
        $setOnInsert: { _id: task.id },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  console.log(`Tasks: ${demoTasks.length} demo tasks`);

  const emptyLifecycle = { status: false, by: null, on: null };

  const demoIncidents = [
    {
      id: ids.incidents.waterLeak,
      reference: "INC-DEMO-001",
      title: "Server room water leak",
      description:
        "Water detected under the CRAC unit in DC cage B. Immediate containment applied; facilities notified.",
      businessUnitId: ids.units.it,
      priority: "P1",
      ownerId: ids.users.ada,
      methodOfNotification: "Phone",
      affectedService: "Hosting / colocation",
      privacy: "Organisational",
      raisedBy: STUB_SUBJECT,
      raisedOn: daysAgo(2),
      resolved: emptyLifecycle,
      resolutionTimeMs: null,
      escalated: {
        status: true,
        by: ids.users.alan,
        on: daysAgo(1),
      },
      activity: [
        {
          id: "inc-act-001a",
          type: "raised",
          message: "Incident raised",
          actorId: STUB_SUBJECT,
          at: daysAgo(2),
        },
        {
          id: "inc-act-001b",
          type: "escalated",
          message: "Incident escalated",
          actorId: ids.users.alan,
          at: daysAgo(1),
        },
      ],
    },
    {
      id: ids.incidents.phishing,
      reference: "INC-DEMO-002",
      title: "Phishing report from finance staff",
      description:
        "Multiple staff reported a credential-harvesting email impersonating payroll.",
      businessUnitId: ids.units.operations,
      priority: "P2",
      ownerId: ids.users.grace,
      methodOfNotification: "Email",
      affectedService: "Corporate email",
      privacy: "Business unit",
      raisedBy: ids.users.grace,
      raisedOn: daysAgo(5),
      resolved: emptyLifecycle,
      resolutionTimeMs: null,
      escalated: emptyLifecycle,
      activity: [
        {
          id: "inc-act-002a",
          type: "raised",
          message: "Incident raised",
          actorId: ids.users.grace,
          at: daysAgo(5),
        },
      ],
    },
    {
      id: ids.incidents.accessOutage,
      reference: "INC-DEMO-003",
      title: "SSO outage during morning peak",
      description:
        "Identity provider unavailable for ~18 minutes; staff unable to access SaaS tools.",
      businessUnitId: ids.units.it,
      priority: "P1",
      ownerId: ids.users.tim,
      methodOfNotification: "Monitoring alert",
      affectedService: "Single sign-on",
      privacy: "Organisational",
      raisedBy: ids.users.tim,
      raisedOn: daysAgo(10),
      resolution: "Vendor restored IdP; post-incident review scheduled.",
      resolved: {
        status: true,
        by: ids.users.tim,
        on: daysAgo(9),
      },
      resolutionTimeMs: 24 * 60 * 60 * 1000,
      escalated: emptyLifecycle,
      activity: [
        {
          id: "inc-act-003a",
          type: "raised",
          message: "Incident raised",
          actorId: ids.users.tim,
          at: daysAgo(10),
        },
        {
          id: "inc-act-003b",
          type: "resolved",
          message: "Incident resolved",
          actorId: ids.users.tim,
          at: daysAgo(9),
        },
      ],
    },
    {
      id: ids.incidents.lostBadge,
      reference: "INC-DEMO-004",
      title: "Lost access badge reported",
      description:
        "Contractor reported a missing site access badge for HQ floor 2.",
      businessUnitId: ids.units.operations,
      priority: "P3",
      ownerId: ids.users.margaret,
      methodOfNotification: "In person",
      affectedService: "Physical access",
      privacy: "Business unit",
      raisedBy: STUB_SUBJECT,
      raisedOn: daysAgo(1),
      resolved: emptyLifecycle,
      resolutionTimeMs: null,
      escalated: emptyLifecycle,
      activity: [
        {
          id: "inc-act-004a",
          type: "raised",
          message: "Incident raised",
          actorId: STUB_SUBJECT,
          at: daysAgo(1),
        },
      ],
    },
    {
      id: ids.incidents.supplierBreach,
      reference: "INC-DEMO-005",
      title: "Supplier reports limited data exposure",
      description:
        "Logistics partner notified of unauthorised access to a staging dataset containing shipment metadata.",
      businessUnitId: ids.units.partners,
      priority: "P2",
      ownerId: ids.users.katherine,
      methodOfNotification: "Email",
      affectedService: "Supplier portal",
      privacy: "Organisational",
      raisedBy: ids.users.katherine,
      raisedOn: daysAgo(7),
      resolved: emptyLifecycle,
      resolutionTimeMs: null,
      escalated: {
        status: true,
        by: ids.users.alan,
        on: daysAgo(6),
      },
      activity: [
        {
          id: "inc-act-005a",
          type: "raised",
          message: "Incident raised",
          actorId: ids.users.katherine,
          at: daysAgo(7),
        },
        {
          id: "inc-act-005b",
          type: "escalated",
          message: "Incident escalated",
          actorId: ids.users.alan,
          at: daysAgo(6),
        },
      ],
    },
    {
      id: ids.incidents.dataExport,
      reference: "INC-DEMO-006",
      title: "Unexpected bulk customer export",
      description:
        "Audit log shows an atypical CSV export of customer contact records outside change window.",
      businessUnitId: ids.units.compliance,
      priority: "P2",
      ownerId: ids.users.ada,
      methodOfNotification: "Security monitoring",
      affectedService: "CRM",
      privacy: "Organisational",
      raisedBy: STUB_SUBJECT,
      raisedOn: daysAgo(3),
      resolved: emptyLifecycle,
      resolutionTimeMs: null,
      escalated: emptyLifecycle,
      activity: [
        {
          id: "inc-act-006a",
          type: "raised",
          message: "Incident raised",
          actorId: STUB_SUBJECT,
          at: daysAgo(3),
        },
      ],
    },
  ] as const;

  for (const incident of demoIncidents) {
    await Incident.findByIdAndUpdate(
      incident.id,
      {
        $set: {
          organizationId: ORG_ID,
          reference: incident.reference,
          title: incident.title,
          description: incident.description,
          businessUnitId: incident.businessUnitId,
          priority: incident.priority,
          ownerId: incident.ownerId,
          methodOfNotification: incident.methodOfNotification,
          affectedService: incident.affectedService,
          privacy: incident.privacy,
          resolution:
            "resolution" in incident ? incident.resolution : undefined,
          resolved: incident.resolved,
          resolutionTimeMs: incident.resolutionTimeMs,
          escalated: incident.escalated,
          attachments: [],
          complianceLinks: [],
          activity: [...incident.activity],
          raisedBy: incident.raisedBy,
          raisedOn: incident.raisedOn,
          updatedBy: null,
          updatedOn: null,
          nextNudgeAt: null,
          deletedAt: null,
        },
        $unset: { source: 1 },
        $setOnInsert: { _id: incident.id },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  console.log(`Incidents: ${demoIncidents.length} demo incidents`);

  const demoAudits = [
    {
      id: ids.audits.isoInternalQ1,
      reference: "AUD-DEMO-001",
      title: "ISO 27001 internal review — Q1",
      type: "Internal",
      focusArea: "Access control and privileged accounts",
      businessUnitId: ids.units.it,
      complianceBodyId: ids.units.compliance,
      auditorId: ids.users.katherine,
      startDate: daysAgo(14),
      time: "09:30",
      interval: "Quarterly",
      comment: "",
      identifications: [
        {
          id: "aud-nc-001a",
          nonConformity: "Privileged access review overdue for finance systems",
          rootCause: "Review calendar not enforced after ownership change",
        },
      ],
      risks: [
        {
          id: "aud-rk-001a",
          title: "Stale admin accounts",
          description: "Former contractor accounts still active in IdP",
          likelihood: 3,
          consequence: 4,
          total: 12,
        },
      ],
      ofis: [
        {
          id: "aud-ofi-001a",
          title: "Centralise access review evidence",
          opportunityForImprovement:
            "Store quarterly review packs in a single controlled folder",
        },
      ],
      complianceLinks: [
        { toolkitId: "iso27001", clauseIds: ["A.5.15", "A.8.2"] },
      ],
      completed: emptyLifecycle,
      createdBy: STUB_SUBJECT,
      createdOn: daysAgo(30),
    },
    {
      id: ids.audits.isoInternalQ2,
      reference: "AUD-DEMO-002",
      title: "ISO 27001 internal review — Q2",
      type: "Internal",
      focusArea: "Operations security",
      businessUnitId: ids.units.it,
      complianceBodyId: ids.units.compliance,
      auditorId: ids.users.katherine,
      startDate: daysFromNow(45),
      time: "10:00",
      interval: "Quarterly",
      comment: "",
      identifications: [],
      risks: [],
      ofis: [],
      complianceLinks: [],
      completed: emptyLifecycle,
      createdBy: STUB_SUBJECT,
      createdOn: daysAgo(30),
    },
    {
      id: ids.audits.accessControl,
      reference: "AUD-DEMO-003",
      title: "Access control process audit",
      type: "Internal",
      focusArea: "Joiner / mover / leaver controls",
      businessUnitId: ids.units.operations,
      complianceBodyId: ids.units.compliance,
      auditorId: ids.users.ada,
      startDate: daysFromNow(7),
      time: "14:00",
      interval: "Yearly",
      comment: "",
      identifications: [],
      risks: [],
      ofis: [],
      complianceLinks: [{ toolkitId: "iso27001", clauseIds: ["A.5.18"] }],
      completed: emptyLifecycle,
      createdBy: ids.users.alan,
      createdOn: daysAgo(5),
    },
    {
      id: ids.audits.supplierExternal,
      reference: "AUD-DEMO-004",
      title: "Supplier security assessment",
      type: "External",
      focusArea: "Third-party data handling",
      businessUnitId: ids.units.partners,
      complianceBodyId: ids.units.externalAudit,
      auditorId: ids.users.grace,
      startDate: daysFromNow(21),
      time: "11:00",
      interval: "Half yearly",
      comment: "",
      identifications: [],
      risks: [
        {
          id: "aud-rk-004a",
          title: "Incomplete DPIA package from supplier",
          description: "DPIA evidence incomplete for new data flows",
          likelihood: 2,
          consequence: 4,
          total: 8,
        },
      ],
      ofis: [],
      complianceLinks: [],
      completed: emptyLifecycle,
      createdBy: STUB_SUBJECT,
      createdOn: daysAgo(8),
    },
    {
      id: ids.audits.premisesHse,
      reference: "AUD-DEMO-005",
      title: "Premises HSE walkthrough",
      type: "External",
      focusArea: "Emergency exits and storage safety",
      businessUnitId: ids.units.operations,
      complianceBodyId: ids.units.externalAudit,
      auditorId: ids.users.margaret,
      startDate: daysAgo(3),
      time: "08:30",
      interval: "Yearly",
      comment: "Site walk completed; awaiting photo evidence pack.",
      identifications: [
        {
          id: "aud-nc-005a",
          nonConformity: "Secondary fire exit intermittently obstructed",
          rootCause: "Temporary equipment staging without clearance process",
        },
      ],
      risks: [],
      ofis: [
        {
          id: "aud-ofi-005a",
          title: "Mark clear egress zones",
          opportunityForImprovement:
            "Paint and sign egress corridors near secondary exits",
        },
      ],
      complianceLinks: [],
      completed: emptyLifecycle,
      createdBy: ids.users.margaret,
      createdOn: daysAgo(20),
    },
    {
      id: ids.audits.completedInternal,
      reference: "AUD-DEMO-006",
      title: "Document control internal audit",
      type: "Internal",
      focusArea: "Controlled documents and versioning",
      businessUnitId: ids.units.compliance,
      complianceBodyId: ids.units.compliance,
      auditorId: ids.users.katherine,
      startDate: daysAgo(40),
      time: "09:00",
      interval: "Yearly",
      comment: "No major non-conformities; minor OFI on naming conventions.",
      identifications: [],
      risks: [],
      ofis: [
        {
          id: "aud-ofi-006a",
          title: "Standardise document naming",
          opportunityForImprovement:
            "Adopt a single naming pattern across policy folders",
        },
      ],
      complianceLinks: [
        { toolkitId: "iso27001", clauseIds: ["A.5.33"] },
      ],
      completed: {
        status: true,
        by: ids.users.katherine,
        on: daysAgo(35),
      },
      createdBy: STUB_SUBJECT,
      createdOn: daysAgo(50),
    },
  ] as const;

  for (const audit of demoAudits) {
    await Audit.findByIdAndUpdate(
      audit.id,
      {
        $set: {
          organizationId: ORG_ID,
          reference: audit.reference,
          title: audit.title,
          type: audit.type,
          focusArea: audit.focusArea,
          businessUnitId: audit.businessUnitId,
          complianceBodyId: audit.complianceBodyId,
          auditorId: audit.auditorId,
          startDate: audit.startDate,
          time: audit.time,
          interval: audit.interval,
          comment: audit.comment,
          identifications: [...audit.identifications],
          risks: [...audit.risks],
          ofis: [...audit.ofis],
          attachments: [],
          complianceLinks: [...audit.complianceLinks],
          completed: audit.completed,
          createdBy: audit.createdBy,
          createdOn: audit.createdOn,
          updatedBy: null,
          updatedOn: null,
          deletedAt: null,
        },
        $setOnInsert: { _id: audit.id },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  console.log(`Audits: ${demoAudits.length} demo audits`);

  const demoManagementReviews = [
    {
      id: ids.managementReviews.leadershipQ1,
      reference: "MR-DEMO-001",
      title: "Leadership management review — Q1",
      date: daysAgo(20),
      time: "10:00",
      interval: "Quarterly",
      privacy: "Organisational",
      attendees: [
        ids.users.alan,
        ids.users.ada,
        ids.users.katherine,
        STUB_SUBJECT,
      ],
      agenda: [
        {
          id: "mr-agenda-001a",
          fileName: "q1-leadership-agenda.pdf",
          mimeType: "application/pdf",
          uploadedBy: STUB_SUBJECT,
          uploadedAt: daysAgo(25),
        },
      ],
      minutes: [
        {
          id: "mr-minutes-001a",
          fileName: "q1-leadership-minutes.pdf",
          mimeType: "application/pdf",
          uploadedBy: ids.users.katherine,
          uploadedAt: daysAgo(18),
        },
      ],
      completed: emptyLifecycle,
      createdBy: STUB_SUBJECT,
      createdOn: daysAgo(40),
    },
    {
      id: ids.managementReviews.leadershipQ2,
      reference: "MR-DEMO-002",
      title: "Leadership management review — Q2",
      date: daysFromNow(35),
      time: "10:00",
      interval: "Quarterly",
      privacy: "Organisational",
      attendees: [ids.users.alan, ids.users.ada, ids.users.grace],
      agenda: [],
      minutes: [],
      completed: emptyLifecycle,
      createdBy: STUB_SUBJECT,
      createdOn: daysAgo(40),
    },
    {
      id: ids.managementReviews.itMonthly,
      reference: "MR-DEMO-003",
      title: "IT service performance review",
      date: daysFromNow(12),
      time: "15:00",
      interval: "Monthly",
      privacy: "Business unit",
      businessUnitId: ids.units.it,
      attendees: [ids.users.ada, ids.users.tim, STUB_SUBJECT],
      agenda: [
        {
          id: "mr-agenda-003a",
          fileName: "it-monthly-agenda.docx",
          mimeType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          uploadedBy: ids.users.ada,
          uploadedAt: daysAgo(2),
        },
      ],
      minutes: [],
      completed: emptyLifecycle,
      createdBy: ids.users.ada,
      createdOn: daysAgo(5),
    },
    {
      id: ids.managementReviews.opsBu,
      reference: "MR-DEMO-004",
      title: "Operations capacity & resilience review",
      date: daysFromNow(5),
      time: "09:30",
      interval: "Half yearly",
      privacy: "Business unit",
      businessUnitId: ids.units.operations,
      attendees: [ids.users.margaret, ids.users.tim, ids.users.grace],
      agenda: [],
      minutes: [],
      completed: emptyLifecycle,
      createdBy: ids.users.margaret,
      createdOn: daysAgo(10),
    },
    {
      id: ids.managementReviews.annualIsms,
      reference: "MR-DEMO-005",
      title: "Annual ISMS effectiveness review",
      date: daysFromNow(60),
      time: "11:00",
      interval: "Yearly",
      privacy: "Organisational",
      attendees: [
        ids.users.alan,
        ids.users.katherine,
        ids.users.ada,
        ids.users.grace,
      ],
      agenda: [],
      minutes: [],
      completed: emptyLifecycle,
      createdBy: STUB_SUBJECT,
      createdOn: daysAgo(15),
    },
    {
      id: ids.managementReviews.completedHalfYear,
      reference: "MR-DEMO-006",
      title: "Mid-year compliance & risk review",
      date: daysAgo(45),
      time: "13:00",
      interval: "Half yearly",
      privacy: "Organisational",
      attendees: [ids.users.katherine, ids.users.alan, STUB_SUBJECT],
      agenda: [
        {
          id: "mr-agenda-006a",
          fileName: "midyear-review-agenda.pdf",
          mimeType: "application/pdf",
          uploadedBy: ids.users.katherine,
          uploadedAt: daysAgo(50),
        },
      ],
      minutes: [
        {
          id: "mr-minutes-006a",
          fileName: "midyear-review-minutes.pdf",
          mimeType: "application/pdf",
          uploadedBy: ids.users.katherine,
          uploadedAt: daysAgo(44),
        },
      ],
      completed: {
        status: true,
        by: ids.users.katherine,
        on: daysAgo(44),
      },
      createdBy: STUB_SUBJECT,
      createdOn: daysAgo(70),
    },
  ] as const;

  for (const review of demoManagementReviews) {
    await ManagementReview.findByIdAndUpdate(
      review.id,
      {
        $set: {
          organizationId: ORG_ID,
          reference: review.reference,
          title: review.title,
          date: review.date,
          time: review.time,
          interval: review.interval,
          privacy: review.privacy,
          businessUnitId:
            "businessUnitId" in review ? review.businessUnitId : undefined,
          attendees: [...review.attendees],
          agenda: [...review.agenda],
          minutes: [...review.minutes],
          completed: review.completed,
          createdBy: review.createdBy,
          createdOn: review.createdOn,
          updatedBy: null,
          updatedOn: null,
          deletedAt: null,
        },
        $setOnInsert: { _id: review.id },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  console.log(
    `Management reviews: ${demoManagementReviews.length} demo reviews`
  );

  await Task.findByIdAndUpdate(
    ids.reviewTasks.followUpActions,
    {
      $set: {
        organizationId: ORG_ID,
        reference: "TSK-DEMO-007",
        name: "Track Q1 management review action items",
        description:
          "Follow up on actions agreed in the Q1 leadership management review and confirm owners have closed evidence.",
        dueDate: daysFromNow(14),
        priority: "Medium",
        teamPriority: false,
        assignees: [
          { userId: STUB_SUBJECT, acceptance: "Accepted" },
          { userId: ids.users.katherine, acceptance: "Pending" },
        ],
        status: "In progress",
        completedBy: null,
        completedOn: null,
        attachments: [],
        source: {
          moduleType: "managementreviews",
          moduleId: ids.managementReviews.leadershipQ1,
        },
        activity: [
          {
            id: "task-act-007a",
            type: "created",
            message: "Task created",
            actorId: STUB_SUBJECT,
            at: daysAgo(18),
          },
          {
            id: "task-act-007b",
            type: "accepted",
            message: "Assignment accepted",
            actorId: STUB_SUBJECT,
            at: daysAgo(17),
          },
        ],
        createdBy: STUB_SUBJECT,
        createdOn: daysAgo(18),
        updatedBy: null,
        updatedOn: null,
        nextNudgeAt: null,
        deletedAt: null,
      },
      $setOnInsert: { _id: ids.reviewTasks.followUpActions },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  console.log("Tasks: +1 management-review follow-up task");

  const defaultLogo = { src: DEFAULT_CUSTOMER_LOGO_SRC };

  const demoCustomers = [
    {
      id: ids.customers.northwind,
      reference: "CUS-DEMO-001",
      name: "Northwind Health Ltd",
      companyNumber: "NW-10421",
      businessUnitId: ids.units.operations,
      stage: "Live" as const,
      status: "Open" as const,
      probability: 90,
      source: "Referral",
      phoneNumber: "+44 20 7946 0101",
      buildingName: "Harbour House",
      streetName: "12 Quay Street",
      town: "London",
      postCode: "E1 8GS",
      primaryContact: "Sarah Chen",
      primaryEmail: "sarah.chen@northwind-health.demo",
      secondaryContact: "James Okonkwo",
      secondaryEmail: "james.okonkwo@northwind-health.demo",
      serviceProvision: "Managed ISO 27001 support and continuous monitoring",
      contractValue: 84000,
      accountManager: STUB_SUBJECT,
      accountNumber: "ACC-NW-001",
      contractStartDate: daysAgo(90),
      contractEndDate: daysFromNow(275),
      reviewDate: daysFromNow(20),
      notes: "Strategic healthcare account. Quarterly executive reviews.",
      reasonForLoss: undefined as string | undefined,
      isChampion: true,
      createdBy: STUB_SUBJECT,
      createdOn: daysAgo(120),
    },
    {
      id: ids.customers.contoso,
      reference: "CUS-DEMO-002",
      name: "Contoso Retail Group",
      companyNumber: "CR-88210",
      businessUnitId: ids.units.operations,
      stage: "Live" as const,
      status: "Open" as const,
      probability: 90,
      source: "Inbound",
      phoneNumber: "+44 161 496 0202",
      buildingName: "Spinningfields",
      streetName: "1 Hardman Square",
      town: "Manchester",
      postCode: "M3 3EB",
      primaryContact: "Priya Nair",
      primaryEmail: "priya.nair@contoso-retail.demo",
      secondaryContact: undefined as string | undefined,
      secondaryEmail: undefined as string | undefined,
      serviceProvision: "Incident response retainer and awareness training",
      contractValue: 42000,
      accountManager: STUB_SUBJECT,
      accountNumber: "ACC-CR-002",
      contractStartDate: daysAgo(30),
      contractEndDate: daysFromNow(335),
      reviewDate: daysFromNow(45),
      notes: "New Live account — onboarding still in progress.",
      reasonForLoss: undefined as string | undefined,
      isChampion: false,
      createdBy: ids.users.ada,
      createdOn: daysAgo(60),
    },
    {
      id: ids.customers.fabrikam,
      reference: "CUS-DEMO-003",
      name: "Fabrikam Manufacturing",
      companyNumber: "FM-55102",
      businessUnitId: ids.units.it,
      stage: "Proposal" as const,
      status: "Open" as const,
      probability: 70,
      source: "Partner",
      phoneNumber: "+44 121 496 0303",
      buildingName: "Factory Gate",
      streetName: "88 Industrial Way",
      town: "Birmingham",
      postCode: "B1 1AA",
      primaryContact: "Marcus Webb",
      primaryEmail: "marcus.webb@fabrikam-mfg.demo",
      secondaryContact: undefined as string | undefined,
      secondaryEmail: undefined as string | undefined,
      serviceProvision: "OT security assessment and remediation plan",
      contractValue: 65000,
      accountManager: ids.users.ada,
      accountNumber: "ACC-FM-003",
      contractStartDate: null as Date | null,
      contractEndDate: null as Date | null,
      reviewDate: daysFromNow(7),
      notes: "Proposal sent; awaiting board sign-off.",
      reasonForLoss: undefined as string | undefined,
      isChampion: false,
      createdBy: ids.users.ada,
      createdOn: daysAgo(25),
    },
    {
      id: ids.customers.adventure,
      reference: "CUS-DEMO-004",
      name: "Adventure Works Tours",
      companyNumber: "AW-33011",
      businessUnitId: ids.units.operations,
      stage: "Qualified" as const,
      status: "Open" as const,
      probability: 50,
      source: "Website",
      phoneNumber: "+44 117 496 0404",
      buildingName: undefined as string | undefined,
      streetName: "4 Harbour Road",
      town: "Bristol",
      postCode: "BS1 5TY",
      primaryContact: "Elena Rossi",
      primaryEmail: "elena.rossi@adventureworks.demo",
      secondaryContact: undefined as string | undefined,
      secondaryEmail: undefined as string | undefined,
      serviceProvision: "GDPR readiness and staff privacy training",
      contractValue: 18000,
      accountManager: STUB_SUBJECT,
      accountNumber: "ACC-AW-004",
      contractStartDate: null as Date | null,
      contractEndDate: null as Date | null,
      reviewDate: null as Date | null,
      notes: "Qualified after discovery workshop.",
      reasonForLoss: undefined as string | undefined,
      isChampion: false,
      createdBy: STUB_SUBJECT,
      createdOn: daysAgo(18),
    },
    {
      id: ids.customers.alpine,
      reference: "CUS-DEMO-005",
      name: "Alpine Ski School",
      companyNumber: "AS-22090",
      businessUnitId: ids.units.compliance,
      stage: "Warm lead" as const,
      status: "Open" as const,
      probability: 30,
      source: "Event",
      phoneNumber: "+44 131 496 0505",
      buildingName: undefined as string | undefined,
      streetName: "22 Princes Street",
      town: "Edinburgh",
      postCode: "EH2 2AN",
      primaryContact: "Tom Hughes",
      primaryEmail: "tom.hughes@alpineski.demo",
      secondaryContact: undefined as string | undefined,
      secondaryEmail: undefined as string | undefined,
      serviceProvision: "Basic ISMS starter package",
      contractValue: 9500,
      accountManager: ids.users.grace,
      accountNumber: "ACC-AS-005",
      contractStartDate: null as Date | null,
      contractEndDate: null as Date | null,
      reviewDate: null as Date | null,
      notes: "Met at compliance conference; follow up after peak season.",
      reasonForLoss: undefined as string | undefined,
      isChampion: false,
      createdBy: ids.users.grace,
      createdOn: daysAgo(10),
    },
    {
      id: ids.customers.wideworld,
      reference: "CUS-DEMO-006",
      name: "Wide World Importers",
      companyNumber: "WW-77001",
      businessUnitId: ids.units.operations,
      stage: "Prospect" as const,
      status: "Open" as const,
      probability: 10,
      source: "Cold outreach",
      phoneNumber: "+44 20 7946 0606",
      buildingName: "Docklands Tower",
      streetName: "100 Marsh Wall",
      town: "London",
      postCode: "E14 9SH",
      primaryContact: "Aisha Rahman",
      primaryEmail: "aisha.rahman@wideworld.demo",
      secondaryContact: undefined as string | undefined,
      secondaryEmail: undefined as string | undefined,
      serviceProvision: "Supplier risk screening",
      contractValue: 12000,
      accountManager: STUB_SUBJECT,
      accountNumber: "ACC-WW-006",
      contractStartDate: null as Date | null,
      contractEndDate: null as Date | null,
      reviewDate: null as Date | null,
      notes: "Early prospect — discovery call booked.",
      reasonForLoss: undefined as string | undefined,
      isChampion: false,
      createdBy: STUB_SUBJECT,
      createdOn: daysAgo(5),
    },
    {
      id: ids.customers.lostDeal,
      reference: "CUS-DEMO-007",
      name: "Litware Financial Services",
      companyNumber: "LF-99001",
      businessUnitId: ids.units.compliance,
      stage: "Qualified" as const,
      status: "Lost" as const,
      probability: 40,
      source: "Partner",
      phoneNumber: "+44 20 7946 0707",
      buildingName: "City Gate",
      streetName: "1 Bishopsgate",
      town: "London",
      postCode: "EC2N 4BQ",
      primaryContact: "David Park",
      primaryEmail: "david.park@litware-fs.demo",
      secondaryContact: undefined as string | undefined,
      secondaryEmail: undefined as string | undefined,
      serviceProvision: "PCI DSS advisory",
      contractValue: 55000,
      accountManager: ids.users.alan,
      accountNumber: "ACC-LF-007",
      contractStartDate: null as Date | null,
      contractEndDate: null as Date | null,
      reviewDate: null as Date | null,
      notes: "Competitor undercut on price.",
      reasonForLoss: "Chose incumbent consultancy on price",
      isChampion: false,
      createdBy: ids.users.alan,
      createdOn: daysAgo(40),
    },
  ];

  for (const customer of demoCustomers) {
    await Customer.findByIdAndUpdate(
      customer.id,
      {
        $set: {
          organizationId: ORG_ID,
          reference: customer.reference,
          name: customer.name,
          companyNumber: customer.companyNumber,
          businessUnitId: customer.businessUnitId,
          stage: customer.stage,
          status: customer.status,
          probability: customer.probability,
          source: customer.source,
          phoneNumber: customer.phoneNumber,
          buildingName: customer.buildingName,
          streetName: customer.streetName,
          town: customer.town,
          postCode: customer.postCode,
          primaryContact: customer.primaryContact,
          primaryEmail: customer.primaryEmail,
          secondaryContact: customer.secondaryContact,
          secondaryEmail: customer.secondaryEmail,
          serviceProvision: customer.serviceProvision,
          contractValue: customer.contractValue,
          accountManager: customer.accountManager,
          accountNumber: customer.accountNumber,
          contractStartDate: customer.contractStartDate,
          contractEndDate: customer.contractEndDate,
          reviewDate: customer.reviewDate,
          notes: customer.notes,
          reasonForLoss: customer.reasonForLoss,
          isChampion: customer.isChampion,
          logo: defaultLogo,
          attachments: [],
          createdBy: customer.createdBy,
          createdOn: customer.createdOn,
          updatedBy: null,
          updatedOn: null,
          deletedAt: null,
        },
        $setOnInsert: { _id: customer.id },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }
  console.log(`Customers (CRM): ${demoCustomers.length} demo customers`);

  const demoOfis = [
    {
      id: ids.ofis.accessLogs,
      reference: "OFI-DEMO-001",
      title: "Centralise privileged access review evidence",
      opportunityForImprovement:
        "Privileged access reviews are scattered across spreadsheets. Consolidate evidence into a single quarterly pack with clear owners.",
      ownerId: STUB_SUBJECT,
      businessUnitId: ids.units.it,
      cost: 2500,
      implemented: { status: "Pending" as const, by: null, on: null },
      source: {
        moduleType: "audits",
        moduleId: ids.audits.accessControl,
      },
      activity: [
        {
          id: "ofi-act-001a",
          type: "created",
          message: "OFI raised from access-control audit",
          actorId: ids.users.katherine,
          at: daysAgo(14),
        },
      ],
      createdBy: ids.users.katherine,
      createdOn: daysAgo(14),
    },
    {
      id: ids.ofis.backupRestore,
      reference: "OFI-DEMO-002",
      title: "Schedule quarterly backup restore tests",
      opportunityForImprovement:
        "Documented restore tests are overdue. Introduce a calendar-driven restore drill for critical systems with recorded outcomes.",
      ownerId: ids.users.ada,
      businessUnitId: ids.units.it,
      cost: 1800,
      implemented: {
        status: "In Progress" as const,
        by: ids.users.ada,
        on: daysAgo(3),
      },
      source: undefined as
        | { moduleType: string; moduleId: string }
        | undefined,
      activity: [
        {
          id: "ofi-act-002a",
          type: "created",
          message: "OFI created",
          actorId: STUB_SUBJECT,
          at: daysAgo(21),
        },
        {
          id: "ofi-act-002b",
          type: "status",
          message: "Status moved to In Progress",
          actorId: ids.users.ada,
          at: daysAgo(3),
        },
      ],
      createdBy: STUB_SUBJECT,
      createdOn: daysAgo(21),
    },
    {
      id: ids.ofis.vendorOnboarding,
      reference: "OFI-DEMO-003",
      title: "Standardise supplier onboarding checklist",
      opportunityForImprovement:
        "New suppliers sometimes miss DPIA and SLA uploads. Publish a mandatory onboarding checklist before contract go-live.",
      ownerId: ids.users.margaret,
      businessUnitId: ids.units.operations,
      cost: 900,
      implemented: {
        status: "Implemented" as const,
        by: ids.users.margaret,
        on: daysAgo(2),
      },
      source: {
        moduleType: "audits",
        moduleId: ids.audits.supplierExternal,
      },
      activity: [
        {
          id: "ofi-act-003a",
          type: "created",
          message: "OFI promoted from supplier external audit",
          actorId: ids.users.alan,
          at: daysAgo(30),
        },
        {
          id: "ofi-act-003b",
          type: "status",
          message: "Marked Implemented after checklist published",
          actorId: ids.users.margaret,
          at: daysAgo(2),
        },
      ],
      createdBy: ids.users.alan,
      createdOn: daysAgo(30),
    },
    {
      id: ids.ofis.deskClear,
      reference: "OFI-DEMO-004",
      title: "Reinforce clear-desk reminders for hybrid staff",
      opportunityForImprovement:
        "Hybrid staff leave printed customer data on shared desks. Add monthly clear-desk reminders and spot checks.",
      ownerId: ids.users.grace,
      businessUnitId: ids.units.compliance,
      cost: 400,
      implemented: { status: "Pending" as const, by: null, on: null },
      source: undefined as
        | { moduleType: string; moduleId: string }
        | undefined,
      activity: [
        {
          id: "ofi-act-004a",
          type: "created",
          message: "OFI created",
          actorId: ids.users.grace,
          at: daysAgo(8),
        },
      ],
      createdBy: ids.users.grace,
      createdOn: daysAgo(8),
    },
    {
      id: ids.ofis.phishingSim,
      reference: "OFI-DEMO-005",
      title: "Increase phishing simulation frequency",
      opportunityForImprovement:
        "Annual phishing simulations are too infrequent given recent campaign volume. Move to quarterly simulations with targeted follow-up.",
      ownerId: STUB_SUBJECT,
      businessUnitId: ids.units.it,
      cost: 3200,
      implemented: {
        status: "In Progress" as const,
        by: STUB_SUBJECT,
        on: daysAgo(1),
      },
      source: {
        moduleType: "incidents",
        moduleId: ids.incidents.phishing,
      },
      activity: [
        {
          id: "ofi-act-005a",
          type: "created",
          message: "OFI linked from phishing incident",
          actorId: STUB_SUBJECT,
          at: daysAgo(12),
        },
        {
          id: "ofi-act-005b",
          type: "status",
          message: "Simulation vendor selected",
          actorId: STUB_SUBJECT,
          at: daysAgo(1),
        },
      ],
      createdBy: STUB_SUBJECT,
      createdOn: daysAgo(12),
    },
    {
      id: ids.ofis.changeWindow,
      reference: "OFI-DEMO-006",
      title: "Publish frozen-change calendar for peak retail",
      opportunityForImprovement:
        "Unplanned changes during Contoso peak weekends caused service noise. Publish a freeze calendar agreed with Operations.",
      ownerId: ids.users.tim,
      businessUnitId: ids.units.operations,
      cost: 600,
      implemented: { status: "Pending" as const, by: null, on: null },
      source: {
        moduleType: "customers",
        moduleId: ids.customers.contoso,
      },
      activity: [
        {
          id: "ofi-act-006a",
          type: "created",
          message: "OFI raised after Contoso weekend incident review",
          actorId: ids.users.ada,
          at: daysAgo(4),
        },
      ],
      createdBy: ids.users.ada,
      createdOn: daysAgo(4),
    },
  ];

  for (const ofi of demoOfis) {
    await Ofi.findByIdAndUpdate(
      ofi.id,
      {
        $set: {
          organizationId: ORG_ID,
          reference: ofi.reference,
          title: ofi.title,
          opportunityForImprovement: ofi.opportunityForImprovement,
          ownerId: ofi.ownerId,
          businessUnitId: ofi.businessUnitId,
          cost: ofi.cost,
          implemented: ofi.implemented,
          attachments: [],
          complianceLinks: [],
          source: ofi.source,
          activity: [...ofi.activity],
          createdBy: ofi.createdBy,
          createdOn: ofi.createdOn,
          updatedBy: null,
          updatedOn: null,
          nextNudgeAt: null,
          deletedAt: null,
        },
        $setOnInsert: { _id: ofi.id },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }
  console.log(`OFIs: ${demoOfis.length} demo opportunities`);

  const demoSuppliers = [
    {
      id: ids.suppliers.cloudflare,
      reference: "SUP-DEMO-001",
      name: "Cloudflare Edge Services",
      businessUnitId: ids.units.it,
      accountManager: "Alex Morgan",
      accountNumber: "CF-UK-44821",
      email: "accounts@cloudflare-demo.example",
      buyerId: STUB_SUBJECT,
      serviceProvision: "CDN, WAF, and DDoS mitigation for public sites",
      contractValue: 36000,
      contractStartDate: daysAgo(200),
      contractEndDate: daysFromNow(165),
      reviewDate: daysFromNow(30),
      slaFiles: [
        {
          id: "sup-sla-001a",
          fileName: "cloudflare-sla-2025.pdf",
          mimeType: "application/pdf",
          uploadedBy: STUB_SUBJECT,
          uploadedAt: daysAgo(200),
        },
      ],
      contractFiles: [
        {
          id: "sup-ctr-001a",
          fileName: "cloudflare-msa.pdf",
          mimeType: "application/pdf",
          uploadedBy: STUB_SUBJECT,
          uploadedAt: daysAgo(200),
        },
      ],
      onboardingFiles: [],
      kpiObjectives: [
        { id: "sup-kpi-001a", value: "99.9% availability monthly" },
        { id: "sup-kpi-001b", value: "Critical incident response < 15 min" },
      ],
      isCompliant: true,
      createdBy: STUB_SUBJECT,
      createdOn: daysAgo(210),
    },
    {
      id: ids.suppliers.digicert,
      reference: "SUP-DEMO-002",
      name: "DigiCert Certificates",
      businessUnitId: ids.units.it,
      accountManager: "Jordan Lee",
      accountNumber: "DC-EU-99102",
      email: "enterprise@digicert-demo.example",
      buyerId: ids.users.ada,
      serviceProvision: "TLS certificates and private CA services",
      contractValue: 8500,
      contractStartDate: daysAgo(100),
      contractEndDate: daysFromNow(265),
      reviewDate: daysFromNow(60),
      slaFiles: [
        {
          id: "sup-sla-002a",
          fileName: "digicert-sla.pdf",
          mimeType: "application/pdf",
          uploadedBy: ids.users.ada,
          uploadedAt: daysAgo(100),
        },
      ],
      contractFiles: [],
      onboardingFiles: [],
      kpiObjectives: [
        { id: "sup-kpi-002a", value: "Certificate issuance < 24h" },
      ],
      isCompliant: true,
      createdBy: ids.users.ada,
      createdOn: daysAgo(110),
    },
    {
      id: ids.suppliers.officeClean,
      reference: "SUP-DEMO-003",
      name: "CleanSpace Facilities Ltd",
      businessUnitId: ids.units.operations,
      accountManager: "Sam Patel",
      accountNumber: "CS-LON-2201",
      email: "contracts@cleanspace-demo.example",
      buyerId: ids.users.margaret,
      serviceProvision: "Office cleaning and secure waste disposal",
      contractValue: 24000,
      contractStartDate: daysAgo(40),
      contractEndDate: daysFromNow(325),
      reviewDate: daysFromNow(90),
      slaFiles: [],
      contractFiles: [
        {
          id: "sup-ctr-003a",
          fileName: "cleanspace-contract.pdf",
          mimeType: "application/pdf",
          uploadedBy: ids.users.margaret,
          uploadedAt: daysAgo(40),
        },
      ],
      onboardingFiles: [
        {
          id: "sup-onb-003a",
          fileName: "cleanspace-insurance.pdf",
          mimeType: "application/pdf",
          uploadedBy: ids.users.margaret,
          uploadedAt: daysAgo(38),
        },
      ],
      kpiObjectives: [],
      isCompliant: true,
      createdBy: ids.users.margaret,
      createdOn: daysAgo(45),
    },
    {
      id: ids.suppliers.penTest,
      reference: "SUP-DEMO-004",
      name: "RedTeam Assurance",
      businessUnitId: ids.units.compliance,
      accountManager: "Casey Brooks",
      accountNumber: "RT-ASS-550",
      email: "delivery@redteam-demo.example",
      buyerId: ids.users.katherine,
      serviceProvision: "Annual penetration testing and retest days",
      contractValue: 28000,
      contractStartDate: daysAgo(15),
      contractEndDate: daysFromNow(350),
      reviewDate: daysFromNow(14),
      slaFiles: [
        {
          id: "sup-sla-004a",
          fileName: "redteam-sla.pdf",
          mimeType: "application/pdf",
          uploadedBy: ids.users.katherine,
          uploadedAt: daysAgo(15),
        },
      ],
      contractFiles: [
        {
          id: "sup-ctr-004a",
          fileName: "redteam-sow.pdf",
          mimeType: "application/pdf",
          uploadedBy: ids.users.katherine,
          uploadedAt: daysAgo(15),
        },
      ],
      onboardingFiles: [],
      kpiObjectives: [
        { id: "sup-kpi-004a", value: "Draft report within 10 business days" },
      ],
      isCompliant: true,
      createdBy: ids.users.katherine,
      createdOn: daysAgo(20),
    },
    {
      id: ids.suppliers.logistics,
      reference: "SUP-DEMO-005",
      name: "SwiftParcel Logistics",
      businessUnitId: ids.units.operations,
      accountManager: "Riley Quinn",
      accountNumber: "SP-LOG-778",
      email: "b2b@swiftparcel-demo.example",
      buyerId: STUB_SUBJECT,
      serviceProvision: "Secure courier for hardware and media transfers",
      contractValue: 15000,
      contractStartDate: daysAgo(5),
      contractEndDate: daysFromNow(360),
      reviewDate: daysFromNow(120),
      slaFiles: [],
      contractFiles: [],
      onboardingFiles: [],
      kpiObjectives: [],
      isCompliant: false,
      createdBy: STUB_SUBJECT,
      createdOn: daysAgo(5),
    },
    {
      id: ids.suppliers.legacyIsp,
      reference: "SUP-DEMO-006",
      name: "LegacyLink ISP",
      businessUnitId: ids.units.it,
      accountManager: "Morgan Ellis",
      accountNumber: "LL-ISP-101",
      email: "support@legacylink-demo.example",
      buyerId: ids.users.tim,
      serviceProvision: "Backup MPLS circuit for warehouse site",
      contractValue: 11000,
      contractStartDate: daysAgo(400),
      contractEndDate: daysFromNow(10),
      reviewDate: daysAgo(5),
      slaFiles: [],
      contractFiles: [
        {
          id: "sup-ctr-006a",
          fileName: "legacylink-renewal.pdf",
          mimeType: "application/pdf",
          uploadedBy: ids.users.tim,
          uploadedAt: daysAgo(400),
        },
      ],
      onboardingFiles: [],
      kpiObjectives: [
        { id: "sup-kpi-006a", value: "Circuit restoration < 4 hours" },
      ],
      isCompliant: true,
      createdBy: ids.users.tim,
      createdOn: daysAgo(410),
    },
  ];

  for (const supplier of demoSuppliers) {
    await Supplier.findByIdAndUpdate(
      supplier.id,
      {
        $set: {
          organizationId: ORG_ID,
          reference: supplier.reference,
          name: supplier.name,
          businessUnitId: supplier.businessUnitId,
          accountManager: supplier.accountManager,
          accountNumber: supplier.accountNumber,
          email: supplier.email,
          buyerId: supplier.buyerId,
          serviceProvision: supplier.serviceProvision,
          contractValue: supplier.contractValue,
          contractStartDate: supplier.contractStartDate,
          contractEndDate: supplier.contractEndDate,
          reviewDate: supplier.reviewDate,
          slaFiles: [...supplier.slaFiles],
          contractFiles: [...supplier.contractFiles],
          onboardingFiles: [...supplier.onboardingFiles],
          kpiObjectives: [...supplier.kpiObjectives],
          isCompliant: supplier.isCompliant,
          createdBy: supplier.createdBy,
          createdOn: supplier.createdOn,
          updatedBy: null,
          updatedOn: null,
          deletedAt: null,
        },
        $setOnInsert: { _id: supplier.id },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }
  console.log(`Suppliers: ${demoSuppliers.length} demo suppliers`);

  console.log("Demo seed complete. Refresh the UI to see the data.");

  await mongoose.disconnect();
}

main().catch(async (error: unknown) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
