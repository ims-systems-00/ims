/**
 * Seed ASL (Approved Supplier List) demo data for a given organisation.
 *
 * Idempotent upserts by (organizationId, reference). Safe to re-run.
 *
 * Usage (from ims-systems-v5-backend):
 *   pnpm seed:asl
 *   ORG_ID=65cdfa93b05b1d6e6f4a392c pnpm seed:asl
 */
import { config as loadDotenv } from "dotenv";
import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { loadConfig } from "../src/config";
import {
  DEFAULT_ASL_CRITERIA,
  DEFAULT_ASL_INTERVAL,
  weightedScore,
} from "../src/modules/supplier";
import { getAslSettingsModel } from "../src/modules/supplier/repositories/asl-settings.model";
import { getAslSupplierModel } from "../src/modules/supplier/repositories/asl-supplier.model";

loadDotenv();

const ORG_ID = process.env.ORG_ID?.trim() || "65cdfa93b05b1d6e6f4a392c";
const CREATED_BY = "asl-demo-seed";

function uid(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmt(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function evalScore(scores: Record<string, number>): number {
  const score = weightedScore(scores, DEFAULT_ASL_CRITERIA);
  if (score === null) {
    throw new Error(`Unable to score evaluation: ${JSON.stringify(scores)}`);
  }
  return score;
}

type DocSeed = {
  type: string;
  exp: string | null;
  ref: string;
  req?: boolean;
  chased?: string | null;
};

type EvalSeed = {
  date: string;
  by: string;
  scores: Record<string, number>;
  note: string;
};

type CommSeed = {
  date: string;
  type: string;
  subject: string;
  by: string;
  outcome: string;
};

type SupplierSeed = {
  reference: string;
  name: string;
  cat: string;
  crit: string;
  status: string;
  contact: string;
  email: string;
  stds: string[];
  scope: string;
  reqs: string;
  appby: string;
  appon: string | null;
  docs: DocSeed[];
  evals: EvalSeed[];
  comms: CommSeed[];
  trail: Array<{ t: string; by: string; what: string }>;
};

function buildSuppliers(today: Date): SupplierSeed[] {
  const d = (n: number) => iso(addDays(today, n));
  const D = (
    type: string,
    exp: string | null,
    ref: string,
    req = true,
    chased: string | null = null
  ): DocSeed => ({ type, exp, ref, req, chased });
  const E = (
    date: string,
    by: string,
    scores: Record<string, number>,
    note: string
  ): EvalSeed => ({ date, by, scores, note });
  const C = (
    date: string,
    type: string,
    subject: string,
    by: string,
    outcome: string
  ): CommSeed => ({ date, type, subject, by, outcome });

  return [
    {
      reference: "ASL-DEMO-001",
      name: "Ashworth Steel Ltd",
      cat: "Raw materials",
      crit: "Critical",
      status: "Approved",
      contact: "Karen Moss",
      email: "accounts@ashworthsteel.example",
      stds: ["ISO 9001"],
      scope: "Structural steel sections and plate to EN 10025",
      reqs:
        "Spec NE-SPEC-14; mill certificate 3.1 with every delivery; packing and labelling per NE-PK-02",
      appby: "S. Ahmed",
      appon: d(-430),
      docs: [
        D("Insurance (PL/EL)", d(9), "Policy AXA-PL-884201"),
        D("ISO certificate", d(480), "BSI FS 598811"),
        D("Signed requirements / T&Cs", d(300), "NE-T&C v4 signed 2025"),
      ],
      evals: [
        E(
          d(-70),
          "S. Ahmed",
          { quality: 4, delivery: 3, hse: 5, resp: 4, comm: 4 },
          "Two late deliveries in Q3; NCR-0233 for mill cert missing, closed."
        ),
        E(
          d(-250),
          "S. Ahmed",
          { quality: 4, delivery: 4, hse: 5, resp: 4, comm: 4 },
          "No issues."
        ),
      ],
      comms: [
        C(
          d(-21),
          "Auto chase",
          `Insurance certificate expiring ${fmt(addDays(today, 9))}`,
          "Alice",
          "No reply"
        ),
        C(
          d(-7),
          "Follow-up",
          `Insurance certificate expiring ${fmt(addDays(today, 9))} · 2nd request`,
          "Alice",
          "No reply"
        ),
        C(d(0), "Escalation", "Escalated to buyer (J. Wood)", "Alice", "Open"),
      ],
      trail: [
        {
          t: `${d(-430)}T09:00`,
          by: "S. Ahmed",
          what: "Approved and added to ASL",
        },
        {
          t: `${d(-21)}T10:00`,
          by: "Alice",
          what: "Auto chase sent for insurance expiry",
        },
      ],
    },
    {
      reference: "ASL-DEMO-002",
      name: "Pennine Coatings",
      cat: "Subcontract process",
      crit: "Critical",
      status: "Approved",
      contact: "Dean Hartley",
      email: "dean@penninecoatings.example",
      stds: ["ISO 9001", "ISO 14001"],
      scope: "Powder coating and galvanising of fabricated parts",
      reqs:
        "Process spec NE-PS-07; environmental requirements NE-ENV-01; CoC per batch",
      appby: "S. Ahmed",
      appon: d(-600),
      docs: [
        D("Insurance (PL/EL)", d(230), "Aviva 55120-PL"),
        D("ISO certificate", d(420), "ISO 14001 · LRQA 10234"),
        D("Signed requirements / T&Cs", d(400), "NE-T&C v4"),
      ],
      evals: [
        E(
          d(-150),
          "S. Ahmed",
          { quality: 5, delivery: 4, hse: 5, resp: 4, comm: 4 },
          "Consistent. Environmental permit checked."
        ),
      ],
      comms: [],
      trail: [
        {
          t: `${d(-600)}T09:00`,
          by: "S. Ahmed",
          what: "Approved and added to ASL",
        },
      ],
    },
    {
      reference: "ASL-DEMO-003",
      name: "Kestrel Site Services",
      cat: "Contractor on site",
      crit: "Critical",
      status: "Conditional",
      contact: "Rob Kestrel",
      email: "rob@kestrelsite.example",
      stds: ["ISO 45001"],
      scope: "Mechanical installation and lifting on site",
      reqs:
        "Site rules v3; permit to work; RAMS before each visit; competence cards on arrival",
      appby: "J. Wood",
      appon: d(-40),
      docs: [
        D("Insurance (PL/EL)", d(160), "Zurich 77-1902"),
        D("SSIP (CHAS/SafeContractor)", d(90), "CHAS Elite"),
        D("RAMS", d(20), "November switch-room lift"),
        D("Signed requirements / T&Cs", null, "Not yet returned"),
      ],
      evals: [],
      comms: [
        C(
          d(-3),
          "Requirements",
          "Site rules v3 and T&Cs sent for signature",
          "S. Ahmed",
          "Awaiting return"
        ),
      ],
      trail: [
        {
          t: `${d(-40)}T09:00`,
          by: "J. Wood",
          what: "Approved and added to ASL",
        },
        {
          t: `${d(-3)}T11:00`,
          by: "System",
          what: "Status changed Approved → Conditional by rule (missing T&Cs)",
        },
      ],
    },
    {
      reference: "ASL-DEMO-004",
      name: "Brightline Logistics",
      cat: "Transport",
      crit: "Standard",
      status: "Approved",
      contact: "Ops desk",
      email: "ops@brightline.example",
      stds: ["ISO 9001"],
      scope: "Pallet and full-load deliveries UK",
      reqs: "Delivery windows per NE-LOG-01; damage reporting within 24h",
      appby: "S. Ahmed",
      appon: d(-700),
      docs: [D("Insurance (PL/EL)", d(16), "Hiscox GIT 4431")],
      evals: [
        E(
          d(-240),
          "S. Ahmed",
          { quality: 4, delivery: 3, hse: 4, resp: 3, comm: 4 },
          "Three damaged consignments in 6 months; improvement plan agreed."
        ),
      ],
      comms: [
        C(
          d(0),
          "Auto chase",
          `Goods-in-transit insurance expiring ${fmt(addDays(today, 16))}`,
          "Alice",
          "Open"
        ),
      ],
      trail: [
        {
          t: `${d(-700)}T09:00`,
          by: "S. Ahmed",
          what: "Approved and added to ASL",
        },
      ],
    },
    {
      reference: "ASL-DEMO-005",
      name: "Calderdale Calibration",
      cat: "Calibration / test",
      crit: "Critical",
      status: "Approved",
      contact: "Lab office",
      email: "lab@calderdalecal.example",
      stds: ["ISO 9001"],
      scope: "UKAS calibration of measuring equipment",
      reqs: "Calibration to NE-CAL-01 schedule; certificates with uncertainty",
      appby: "S. Ahmed",
      appon: d(-900),
      docs: [
        D("Insurance (PL/EL)", d(300), "RSA 2201-L"),
        D("UKAS schedule", d(200), "UKAS 0412"),
        D("Signed requirements / T&Cs", d(200), "NE-T&C v4"),
      ],
      evals: [
        E(
          d(-300),
          "S. Ahmed",
          { quality: 5, delivery: 5, hse: 5, resp: 5, comm: 4 },
          "Exemplary."
        ),
      ],
      comms: [],
      trail: [
        {
          t: `${d(-900)}T09:00`,
          by: "S. Ahmed",
          what: "Approved and added to ASL",
        },
      ],
    },
    {
      reference: "ASL-DEMO-006",
      name: "NorthPak Packaging",
      cat: "Packaging",
      crit: "Standard",
      status: "Approved",
      contact: "Sales",
      email: "sales@northpak.example",
      stds: ["ISO 9001"],
      scope: "Export crates and stillages",
      reqs: "Crate spec NE-PK-03",
      appby: "S. Ahmed",
      appon: d(-500),
      docs: [
        D("Insurance (PL/EL)", d(120), "Allianz 93-P"),
        D("ISO certificate", d(11), "ISO 9001 · NQA 18822", false),
      ],
      evals: [
        E(
          d(-100),
          "S. Ahmed",
          { quality: 4, delivery: 4, hse: 4, resp: 4, comm: 4 },
          ""
        ),
      ],
      comms: [
        C(
          d(-18),
          "Auto chase",
          `ISO 9001 certificate expiring ${fmt(addDays(today, 11))}`,
          "Alice",
          "Replied: recert audit booked"
        ),
      ],
      trail: [
        {
          t: `${d(-500)}T09:00`,
          by: "S. Ahmed",
          what: "Approved and added to ASL",
        },
      ],
    },
    {
      reference: "ASL-DEMO-007",
      name: "Midland IT Support",
      cat: "IT / data processor",
      crit: "High",
      status: "Approved",
      contact: "Priya Shah",
      email: "priya@midlandit.example",
      stds: ["ISO 27001"],
      scope: "Managed IT, backups, M365 administration",
      reqs:
        "DPA v2; security requirements NE-SEC-04; incident notification within 24h",
      appby: "S. Ahmed",
      appon: d(-380),
      docs: [
        D("Insurance (PL/EL)", d(250), "Hiscox PI/CY 8831"),
        D("Data processing agreement", d(350), "DPA v2 signed"),
        D("Cyber Essentials", d(310), "CE+ IASME-2026-0931"),
      ],
      evals: [
        E(
          d(-40),
          "S. Ahmed",
          { quality: 5, delivery: 4, hse: 5, resp: 5, comm: 4 },
          "Backup restore test passed Oct."
        ),
      ],
      comms: [],
      trail: [
        {
          t: `${d(-380)}T09:00`,
          by: "S. Ahmed",
          what: "Approved and added to ASL",
        },
      ],
    },
    {
      reference: "ASL-DEMO-008",
      name: "Hale & Sons Electrical",
      cat: "Contractor on site",
      crit: "High",
      status: "Conditional",
      contact: "Mick Hale",
      email: "mick@haleelectrical.example",
      stds: ["ISO 45001"],
      scope: "Electrical installation and periodic testing",
      reqs: "Site rules v3; permit to work; RAMS before each visit",
      appby: "J. Wood",
      appon: d(-200),
      docs: [
        D("Insurance (PL/EL)", d(210), "NFU 44-EL"),
        D("Competence / trade card", d(500), "NICEIC approved contractor"),
        D("RAMS", null, "December switchboard works · not received"),
        D("Signed requirements / T&Cs", d(160), "NE-T&C v4"),
      ],
      evals: [
        E(
          d(-190),
          "J. Wood",
          { quality: 4, delivery: 4, hse: 4, resp: 3, comm: 4 },
          "Initial evaluation."
        ),
      ],
      comms: [
        C(
          d(-2),
          "Request",
          "RAMS for December switchboard works",
          "Alice",
          "No reply"
        ),
      ],
      trail: [
        {
          t: `${d(-200)}T09:00`,
          by: "J. Wood",
          what: "Approved and added to ASL",
        },
        {
          t: `${d(-2)}T14:00`,
          by: "System",
          what: "Status changed Approved → Conditional by rule (missing RAMS)",
        },
      ],
    },
    {
      reference: "ASL-DEMO-009",
      name: "Quantum Consulting",
      cat: "Professional services",
      crit: "Standard",
      status: "Prospective",
      contact: "Alan Reed",
      email: "alan@quantumconsult.example",
      stds: ["ISO 9001"],
      scope: "ISO 14001 implementation support",
      reqs: "",
      appby: "",
      appon: null,
      docs: [D("Insurance (PL/EL)", null, "Requested")],
      evals: [],
      comms: [
        C(
          d(-1),
          "Onboarding",
          "Supplier questionnaire and T&Cs sent",
          "S. Ahmed",
          "Awaiting return"
        ),
      ],
      trail: [
        {
          t: `${d(-5)}T09:00`,
          by: "S. Ahmed",
          what: "Added as prospective supplier",
        },
      ],
    },
    {
      reference: "ASL-DEMO-010",
      name: "Northern Consumables Co",
      cat: "Consumables",
      crit: "Standard",
      status: "Approved",
      contact: "Lisa Trent",
      email: "orders@northernconsumables.example",
      stds: ["ISO 9001"],
      scope: "PPE, abrasives, and workshop consumables",
      reqs: "Catalogue pricing NE-CON-02; batch traceability for PPE",
      appby: "S. Ahmed",
      appon: d(-320),
      docs: [
        D("Insurance (PL/EL)", d(180), "AXA 12-CON-991"),
        D("Signed requirements / T&Cs", d(280), "NE-T&C v4"),
      ],
      evals: [
        E(
          d(-60),
          "S. Ahmed",
          { quality: 4, delivery: 5, hse: 4, resp: 4, comm: 5 },
          "Reliable stockists; good invoice accuracy."
        ),
      ],
      comms: [],
      trail: [
        {
          t: `${d(-320)}T09:00`,
          by: "S. Ahmed",
          what: "Approved and added to ASL",
        },
      ],
    },
    {
      reference: "ASL-DEMO-011",
      name: "Westbridge Fabrication",
      cat: "Subcontract process",
      crit: "High",
      status: "Suspended",
      contact: "Tom West",
      email: "tom@westbridgefab.example",
      stds: ["ISO 9001"],
      scope: "CNC machining and fabrication of mild steel assemblies",
      reqs: "Drawing pack NE-FAB-11; first article inspection",
      appby: "J. Wood",
      appon: d(-450),
      docs: [
        D("Insurance (PL/EL)", d(-40), "Aviva 8801-PL"),
        D("ISO certificate", d(90), "BSI FM 44102"),
        D("Signed requirements / T&Cs", d(200), "NE-T&C v4"),
      ],
      evals: [
        E(
          d(-30),
          "J. Wood",
          { quality: 2, delivery: 2, hse: 3, resp: 2, comm: 2 },
          "Repeated NCRs; delivery slip-ups. Suspended pending CAPA."
        ),
      ],
      comms: [
        C(
          d(-25),
          "Escalation",
          "Quality performance below threshold",
          "J. Wood",
          "Meeting booked"
        ),
        C(d(-10), "Follow-up", "CAPA evidence still outstanding", "Alice", "Open"),
      ],
      trail: [
        {
          t: `${d(-450)}T09:00`,
          by: "J. Wood",
          what: "Approved and added to ASL",
        },
        {
          t: `${d(-30)}T16:00`,
          by: "System",
          what: "Suspended by rule: score below 2.0",
        },
      ],
    },
    {
      reference: "ASL-DEMO-012",
      name: "Atlas Removals Ltd",
      cat: "Transport",
      crit: "Standard",
      status: "Removed",
      contact: "Depot",
      email: "depot@atlasremovals.example",
      stds: [],
      scope: "Occasional plant moves (legacy)",
      reqs: "",
      appby: "S. Ahmed",
      appon: d(-1200),
      docs: [D("Insurance (PL/EL)", d(-200), "Expired policy")],
      evals: [],
      comms: [
        C(
          d(-90),
          "Escalation",
          "Supplier no longer used — marked removed",
          "S. Ahmed",
          "Closed"
        ),
      ],
      trail: [
        {
          t: `${d(-1200)}T09:00`,
          by: "S. Ahmed",
          what: "Approved and added to ASL",
        },
        {
          t: `${d(-90)}T12:00`,
          by: "S. Ahmed",
          what: "Removed from ASL — contract ended",
        },
      ],
    },
  ];
}

function redactMongoUri(uri: string): string {
  return uri
    .replace(/\/\/([^@/]+)@/g, "//***@")
    .replace(/\/\/([^:/]+):([^@/]+)@/g, "//***:***@");
}

async function main(): Promise<void> {
  const config = loadConfig();
  let uri = process.env.MONGODB_URI || config.MONGODB_URI;
  // When running on the host against the compose-oriented URI, prefer loopback.
  if (uri.includes("host.docker.internal")) {
    uri = uri.replace("host.docker.internal", "127.0.0.1");
  }

  console.log(`Connecting to ${redactMongoUri(uri)}`);
  console.log(`Seeding ASL for organizationId=${ORG_ID}`);

  await mongoose.connect(uri);

  const Supplier = getAslSupplierModel();
  const Settings = getAslSettingsModel();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const now = new Date();
  const suppliers = buildSuppliers(today);

  await Settings.findOneAndUpdate(
    { organizationId: ORG_ID },
    {
      $setOnInsert: {
        organizationId: ORG_ID,
        lead: 30,
        follow: 7,
        esc: 14,
        from: "quality@example.com",
        interval: { ...DEFAULT_ASL_INTERVAL },
        criteria: [...DEFAULT_ASL_CRITERIA],
        updatedBy: null,
        updatedOn: null,
      },
    },
    { upsert: true, new: true }
  );
  console.log("Upserted asl_supplier_settings");

  let upserted = 0;
  for (const s of suppliers) {
    const docs = s.docs.map((doc) => ({
      id: uid("doc"),
      type: doc.type,
      exp: doc.exp,
      ref: doc.ref,
      req: doc.req ?? true,
      chased: doc.chased ?? null,
      file: null,
    }));
    const evals = s.evals.map((e) => ({
      id: uid("ev"),
      date: e.date,
      by: e.by,
      scores: e.scores,
      note: e.note,
      score: evalScore(e.scores),
    }));
    const comms = s.comms.map((c) => ({
      id: uid("cm"),
      date: c.date,
      by: c.by,
      type: c.type,
      subject: c.subject,
      outcome: c.outcome,
    }));

    await Supplier.findOneAndUpdate(
      { organizationId: ORG_ID, reference: s.reference },
      {
        $set: {
          organizationId: ORG_ID,
          reference: s.reference,
          name: s.name,
          cat: s.cat,
          crit: s.crit,
          status: s.status,
          contact: s.contact,
          email: s.email,
          stds: s.stds,
          scope: s.scope,
          reqs: s.reqs,
          appby: s.appby,
          appon: s.appon,
          docs,
          evals,
          comms,
          trail: s.trail,
          updatedBy: CREATED_BY,
          updatedOn: now,
          deletedAt: null,
        },
        $setOnInsert: {
          createdBy: CREATED_BY,
          createdOn: now,
        },
      },
      { upsert: true, new: true }
    );
    upserted += 1;
    console.log(`  ${s.reference}  ${s.status.padEnd(12)}  ${s.name}`);
  }

  const total = await Supplier.countDocuments({
    organizationId: ORG_ID,
    deletedAt: null,
  });
  console.log(`\nDone. Upserted ${upserted} ASL suppliers. Live count for org: ${total}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
