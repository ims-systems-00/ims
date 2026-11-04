/**
 * Polymorphic moduleType remapping for V4 → V5.
 *
 * Many V5 modules still expect the V4 collection-style string `cips` for OFI
 * (see OFI_SOURCE_MODULE, ACTIVITY_MODULE_TYPES). Charts may use `ofi`.
 */

const IDENTITY = new Set([
  "tasks",
  "leaves",
  "risks",
  "documentrepositories",
  "documenttrees",
  "customers",
  "controlstatuses",
  "compliancecontrols",
  "managementreviews",
  "licenserequests",
  "invoices",
  "activities",
  "audits",
  "suppliers",
  "incidents",
  "kpiobjectives",
  "cips",
  "notifications",
  "attachments",
  "evidences",
  "hardwareassets",
  "softwareassets",
  "informationassets",
  "peopleassets",
  "premiseassets",
]);

/** Parked domains — left as-is if encountered in polymorphic links on migrated docs. */
const PARKED = new Set([
  "cqcsafeguardings",
  "cqcdetails",
  "cqcwhistleblows",
  "cqcsignificantevents",
  "cqcoverviews",
  "complaints",
  "expensereports",
  "imsprojects",
  "imsprojectworkpackages",
  "cccalculations",
  "cccustomfactors",
  "cccarbonreductioninitiatives",
]);

/**
 * Remap a V4 moduleType for a V5 target context.
 * @param context `"default"` keeps `cips`; `"chart"` maps cips → ofi.
 */
export function mapModuleType(
  moduleType: string | null | undefined,
  context: "default" | "chart" = "default"
): string | null {
  if (!moduleType) return null;
  const key = String(moduleType).trim();
  if (!key) return null;

  if (context === "chart" && (key === "cips" || key === "ofi")) {
    return "ofi";
  }

  if (IDENTITY.has(key) || PARKED.has(key)) {
    return key;
  }

  // groups was used rarely as a moduleType; functional units are not a
  // polymorphic source module in V5 — leave literal for diagnostics.
  if (key === "groups") return "groups";
  if (key === "ofi") return context === "chart" ? "ofi" : "cips";

  return key;
}

export const PARKED_COLLECTIONS = [
  "complaints",
  "cqcsafeguardings",
  "cqcwhistleblows",
  "cqcsignificantevents",
  "cqcreports",
  "cqcoverviews",
  "cqcdetails",
  "cqctools",
  "ccparameters",
  "cclocations",
  "cccalculations",
  "cccustomfactors",
  "ccfactors",
  "ccreports",
  "cccarbonreductioninitiatives",
  "imsprojects",
  "imsprojectworkpackages",
  "imsprojectmemberships",
  "imsprojectbudgets",
  "imsprojectmaterials",
  "imsprojectreports",
  "imsprojectemailschedules",
  "imsprojectworkpackageassignments",
  "imsprojectworkpackagerelationships",
  "imsprojectworkpackagedocumentrelationships",
  "imsForms",
  "imsFormElements",
  "imsFormSubmissions",
  "imsFormResponses",
  "expensereports",
  "worklogs",
  "staffalerts",
  "walletunits",
  "dashboards",
  "groupdashboards",
  "customForms",
  "bookings",
  "closeddates",
  "getStarted",
] as const;

export const CORE_COLLECTIONS_BY_WAVE: Record<number, string[]> = {
  1: [
    "organizations",
    "users",
    "memberships",
    "groups",
    "grouppremises",
    "invitations",
    "partnership_programs",
    "licenserequests",
  ],
  2: ["tagsAndCategories"],
  3: [
    "hardwareassets",
    "softwareassets",
    "informationassets",
    "peopleassets",
    "premiseassets",
    "customers",
    "suppliers",
    "invoices",
    "emailcampaigns",
    "campaigndeliveries",
    "risks",
    "incidents",
    "cips",
    "tasks",
    "audits",
    "activities",
    "calenderevents",
    "notifications",
    "charts",
    "managementreviews",
    "kpiobjectives",
    "leaves",
    "documentrepositories",
    "documenttrees",
    "documentsignatures",
    "documentreviewreminders",
  ],
  4: ["controlstatuses", "controlevidences", "complianceoverviews"],
};

/** V5 collection names used for per-org CORE parity checks. */
export const CORE_V5_PARITY: Array<{
  wave: number;
  v4: string;
  v5: string;
  /** V4 org field is ObjectId `organization`; V5 is string `organizationId`. */
  orgFieldV4?: string;
}> = [
  { wave: 1, v4: "groups", v5: "functionalunits" },
  { wave: 1, v4: "memberships", v5: "organisationmemberships" },
  { wave: 1, v4: "grouppremises", v5: "businesspremises" },
  { wave: 3, v4: "risks", v5: "risks" },
  { wave: 3, v4: "incidents", v5: "incidents" },
  { wave: 3, v4: "cips", v5: "ofis" },
  { wave: 3, v4: "tasks", v5: "tasks" },
  { wave: 3, v4: "audits", v5: "audits" },
  { wave: 3, v4: "documentrepositories", v5: "documentrepositories" },
  { wave: 3, v4: "documenttrees", v5: "documenttrees" },
  { wave: 4, v4: "controlstatuses", v5: "controlstatuses" },
  { wave: 4, v4: "complianceoverviews", v5: "complianceoverviews" },
  { wave: 4, v4: "controlevidences", v5: "controlevidences" },
];
