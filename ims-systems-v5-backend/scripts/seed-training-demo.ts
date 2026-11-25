/**
 * Seed Training & Competency demo data for a given organisation.
 *
 * Idempotent upserts for settings / competencies / roles / people.
 * Records and sessions are deleted and recreated each run for a clean demo matrix.
 *
 * Usage (from ims-systems-v5-backend):
 *   pnpm seed:training
 *   ORG_ID=65cdfa93b05b1d6e6f4a392c pnpm seed:training
 */
import { config as loadDotenv } from "dotenv";
import mongoose from "mongoose";
import { loadConfig } from "../src/config";
import {
  DEFAULT_COMPETENCIES,
  DEFAULT_ROLES,
  DEFAULT_SETTINGS,
} from "../src/modules/training/lib/training-rules";
import { getTrainingCompetencyModel } from "../src/modules/training/repositories/training-competency.model";
import { getTrainingPersonModel } from "../src/modules/training/repositories/training-person.model";
import { getTrainingRecordModel } from "../src/modules/training/repositories/training-record.model";
import { getTrainingRoleModel } from "../src/modules/training/repositories/training-role.model";
import { getTrainingSessionModel } from "../src/modules/training/repositories/training-session.model";
import { getTrainingSettingsModel } from "../src/modules/training/repositories/training-settings.model";

loadDotenv();

const ORG_ID = process.env.ORG_ID?.trim() || "65cdfa93b05b1d6e6f4a392c";
const CREATED_BY = "training-demo-seed";
const ORG_NAME = "Northfield Engineering Ltd";

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function hist(t: Date, by: string, what: string) {
  return { t: t.toISOString().slice(0, 16), by, what };
}

function emailFor(name: string, override?: string): string {
  if (override) return override;
  return (
    name
      .toLowerCase()
      .replace(/[^a-z]+/g, ".")
      .replace(/\.+/g, ".")
      .replace(/^\.|\.$/g, "") + "@northfield.example"
  );
}

type PersonSeed = {
  name: string;
  roleKeys: string[];
  site: string;
  manager: string;
  startDays: number;
  email?: string;
  status?: "Active" | "Leaver" | "Pre-start";
  endDays?: number;
};

type RecordSeed = {
  personEmail: string;
  compKey: string;
  days: number;
  ref: string;
  provider: string;
};

async function main() {
  const config = loadConfig();
  const uri = process.env.MONGODB_URI || config.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");

  console.log(`Connecting… ORG_ID=${ORG_ID}`);
  await mongoose.connect(uri);

  const Settings = getTrainingSettingsModel();
  const Competency = getTrainingCompetencyModel();
  const Role = getTrainingRoleModel();
  const Person = getTrainingPersonModel();
  const Record = getTrainingRecordModel();
  const Session = getTrainingSessionModel();
  const today = new Date();
  const d = (n: number) => iso(addDays(today, n));
  const t = (n: number) => addDays(today, n);

  await Settings.findOneAndUpdate(
    { organizationId: ORG_ID },
    {
      $set: {
        orgName: ORG_NAME,
        leadDays: 60,
        inductionDays: 14,
        siteLabel: "Site",
        sites: ["Northfield Works", "Leeds depot"],
        providers: [
          "Internal",
          "IOSH",
          "RTITB",
          "LEEA",
          "St John Ambulance",
          "BSI",
        ],
        allowSelfUpload: DEFAULT_SETTINGS.allowSelfUpload,
        requireVerification: DEFAULT_SETTINGS.requireVerification,
        selfTokenDays: DEFAULT_SETTINGS.selfTokenDays,
        reminderDays: DEFAULT_SETTINGS.reminderDays,
        inviteSubject: DEFAULT_SETTINGS.inviteSubject,
        inviteBody: DEFAULT_SETTINGS.inviteBody,
        organiserEmail: "training@northfield.example",
        updatedBy: CREATED_BY,
        updatedOn: new Date(),
      },
      $setOnInsert: {
        organizationId: ORG_ID,
        log: [],
      },
    },
    { upsert: true }
  );
  console.log("Settings upserted");

  const compIdByKey = new Map<string, string>();
  for (const c of DEFAULT_COMPETENCIES) {
    const doc = await Competency.findOneAndUpdate(
      { organizationId: ORG_ID, key: c.key },
      {
        $set: {
          name: c.name,
          months: c.months,
          evidence: c.evidence,
          basis: c.basis,
          covers: c.covers,
          quiz: c.quiz || [],
          description: "",
          provider: "",
          archived: false,
          custom: false,
        },
        $setOnInsert: {
          organizationId: ORG_ID,
          key: c.key,
        },
      },
      { upsert: true, new: true }
    );
    compIdByKey.set(c.key, String(doc!._id));
  }
  console.log(`Competencies upserted: ${DEFAULT_COMPETENCIES.length}`);

  const roleIdByKey = new Map<string, string>();
  for (const r of DEFAULT_ROLES) {
    const mandatory = r.mandatory
      .map((k) => compIdByKey.get(k))
      .filter((id): id is string => Boolean(id));
    const desirable = r.desirable
      .map((k) => compIdByKey.get(k))
      .filter((id): id is string => Boolean(id));
    const doc = await Role.findOneAndUpdate(
      { organizationId: ORG_ID, key: r.key },
      {
        $set: {
          name: r.name,
          mandatory,
          desirable,
          description: "",
        },
        $setOnInsert: {
          organizationId: ORG_ID,
          key: r.key,
        },
      },
      { upsert: true, new: true }
    );
    roleIdByKey.set(r.key, String(doc!._id));
  }
  console.log(`Roles upserted: ${DEFAULT_ROLES.length}`);

  const peopleSeeds: PersonSeed[] = [
    {
      name: "S. Ahmed",
      roleKeys: ["manager", "inspector"],
      site: "Northfield Works",
      manager: "",
      startDays: -2000,
      email: "s.ahmed@northfield.example",
    },
    {
      name: "M. Grant",
      roleKeys: ["manager", "operator", "crane", "yard"],
      site: "Northfield Works",
      manager: "S. Ahmed",
      startDays: -3000,
    },
    {
      name: "D. Brooks",
      roleKeys: ["crane", "flt-driver", "operator"],
      site: "Northfield Works",
      manager: "M. Grant",
      startDays: -1500,
    },
    {
      name: "T. Begum",
      roleKeys: ["welder", "operator", "press-brake-op"],
      site: "Northfield Works",
      manager: "M. Grant",
      startDays: -700,
    },
    {
      name: "J. Lee",
      roleKeys: ["inspector", "first-aider"],
      site: "Northfield Works",
      manager: "S. Ahmed",
      startDays: -1200,
    },
    {
      name: "R. Osei",
      roleKeys: ["driver", "operator"],
      site: "Leeds depot",
      manager: "M. Grant",
      startDays: -900,
    },
    {
      name: "L. Grant",
      roleKeys: ["operator", "cnc-op"],
      site: "Northfield Works",
      manager: "M. Grant",
      startDays: -400,
    },
    {
      name: "A. Novak",
      roleKeys: ["welder", "operator"],
      site: "Northfield Works",
      manager: "M. Grant",
      startDays: -250,
    },
    {
      name: "K. Hale",
      roleKeys: ["competent-person", "crane"],
      site: "Northfield Works",
      manager: "M. Grant",
      startDays: -2600,
    },
    {
      name: "E. Wood",
      roleKeys: ["cnc-op", "operator"],
      site: "Northfield Works",
      manager: "M. Grant",
      startDays: -9,
      status: "Pre-start",
    },
    {
      name: "C. Dyer",
      roleKeys: ["driver"],
      site: "Leeds depot",
      manager: "M. Grant",
      startDays: -20,
    },
    {
      name: "G. Ford",
      roleKeys: ["operator"],
      site: "Northfield Works",
      manager: "M. Grant",
      startDays: -5000,
      status: "Leaver",
      endDays: -30,
    },
  ];

  const personIdByEmail = new Map<string, string>();
  for (const p of peopleSeeds) {
    const email = emailFor(p.name, p.email);
    const roleIds = p.roleKeys
      .map((k) => roleIdByKey.get(k))
      .filter((id): id is string => Boolean(id));
    const start = d(p.startDays);
    const status = p.status || "Active";
    const end = p.endDays != null ? d(p.endDays) : "";
    const history = [
      hist(t(p.startDays), "S. Ahmed", "Added to the matrix · seed"),
    ];
    if (status === "Leaver" && p.endDays != null) {
      history.unshift(
        hist(t(p.endDays), "S. Ahmed", `Marked as leaver · ${end}`)
      );
    }

    const doc = await Person.findOneAndUpdate(
      { organizationId: ORG_ID, email },
      {
        $set: {
          name: p.name,
          roles: roleIds,
          site: p.site,
          manager: p.manager,
          start,
          email,
          status,
          end,
          extra: [],
          exempt: [],
          external: false,
          company: "",
          userId: null,
          hist: history,
        },
        $setOnInsert: {
          organizationId: ORG_ID,
        },
      },
      { upsert: true, new: true }
    );
    personIdByEmail.set(email, String(doc!._id));
  }
  console.log(`People upserted: ${peopleSeeds.length}`);

  await Record.deleteMany({ organizationId: ORG_ID });
  await Session.deleteMany({ organizationId: ORG_ID });

  const e = (name: string, override?: string) => emailFor(name, override);
  const recordSeeds: RecordSeed[] = [];

  const pushCommon = (
    personEmail: string,
    opts: {
      induction?: number;
      hs?: number | false;
      fire?: number;
      ig?: number | false;
      gdpr?: number | false;
      policies?: boolean;
      skipPolInfosec?: boolean;
      skipPolAfterFirst?: boolean;
      tag: string;
    }
  ) => {
    if (opts.induction != null) {
      recordSeeds.push({
        personEmail,
        compKey: "induction",
        days: opts.induction,
        ref: `IND-${opts.tag}`,
        provider: "Internal",
      });
    }
    if (opts.hs !== false && opts.hs != null) {
      recordSeeds.push({
        personEmail,
        compKey: "hs-awareness",
        days: opts.hs,
        ref: `HS-${opts.tag}`,
        provider: "IOSH",
      });
    }
    if (opts.fire != null) {
      recordSeeds.push({
        personEmail,
        compKey: "fire",
        days: opts.fire,
        ref: `FIRE-${opts.tag}`,
        provider: "Internal",
      });
    }
    if (opts.ig !== false && opts.ig != null) {
      recordSeeds.push({
        personEmail,
        compKey: "ig",
        days: opts.ig,
        ref: `IG-${opts.tag}`,
        provider: "e-learning",
      });
    }
    if (opts.gdpr !== false && opts.gdpr != null) {
      recordSeeds.push({
        personEmail,
        compKey: "gdpr",
        days: opts.gdpr,
        ref: `GDPR-${opts.tag}`,
        provider: "e-learning",
      });
    }
    if (opts.policies) {
      const pols = ["pol-hs", "pol-quality", "pol-infosec"] as const;
      pols.forEach((c, j) => {
        if (opts.skipPolInfosec && c === "pol-infosec") return;
        if (opts.skipPolAfterFirst && j > 0) return;
        recordSeeds.push({
          personEmail,
          compKey: c,
          days: -(200 + j * 15),
          ref: "ack",
          provider: "Self-service",
        });
      });
    }
  };

  // Established staff — mix of ok / soon / over / missing for the matrix
  pushCommon(e("S. Ahmed", "s.ahmed@northfield.example"), {
    induction: -600,
    hs: -400,
    fire: -200,
    ig: -300,
    gdpr: -340,
    policies: true,
    tag: "p01",
  });
  pushCommon(e("M. Grant"), {
    induction: -630,
    hs: -420,
    fire: -210,
    ig: -295,
    gdpr: -337,
    policies: true,
    tag: "p02",
  });
  pushCommon(e("D. Brooks"), {
    induction: -660,
    hs: -440,
    fire: -220,
    ig: -290,
    gdpr: -334,
    policies: true,
    skipPolInfosec: true,
    tag: "p03",
  });
  pushCommon(e("T. Begum"), {
    induction: -690,
    hs: -460,
    fire: -230,
    ig: false,
    gdpr: false,
    policies: true,
    tag: "p04",
  });
  pushCommon(e("J. Lee"), {
    induction: -720,
    hs: -480,
    fire: -240,
    ig: -280,
    gdpr: -328,
    policies: true,
    tag: "p05",
  });
  pushCommon(e("R. Osei"), {
    induction: -750,
    hs: -1120,
    fire: -250,
    ig: -275,
    gdpr: -325,
    policies: true,
    skipPolAfterFirst: true,
    tag: "p06",
  });
  pushCommon(e("L. Grant"), {
    induction: -780,
    hs: -520,
    fire: -260,
    ig: -270,
    gdpr: false,
    policies: true,
    tag: "p07",
  });
  pushCommon(e("A. Novak"), {
    induction: -810,
    hs: -540,
    fire: -380,
    ig: -265,
    gdpr: -319,
    policies: true,
    tag: "p08",
  });
  pushCommon(e("K. Hale"), {
    induction: -840,
    hs: -560,
    fire: -280,
    ig: -260,
    gdpr: -316,
    policies: true,
    tag: "p10",
  });
  // Recent / pre-start — sparse records
  recordSeeds.push({
    personEmail: e("E. Wood"),
    compKey: "cnc",
    days: -5,
    ref: "CNC-11",
    provider: "Haas",
  });
  pushCommon(e("C. Dyer"), {
    induction: -18,
    fire: undefined,
    hs: false,
    ig: false,
    gdpr: false,
    policies: false,
    tag: "p12",
  });
  recordSeeds.push({
    personEmail: e("C. Dyer"),
    compKey: "driver",
    days: -18,
    ref: "LIC-12",
    provider: "DVLA check",
  });

  // Role-specific competence
  const extras: RecordSeed[] = [
    {
      personEmail: e("M. Grant"),
      compKey: "manual-handling",
      days: -900,
      ref: "MH-2",
      provider: "RoSPA",
    },
    {
      personEmail: e("M. Grant"),
      compKey: "coshh",
      days: -700,
      ref: "CO-2",
      provider: "Internal",
    },
    {
      personEmail: e("M. Grant"),
      compKey: "measuring",
      days: -500,
      ref: "MEAS-2",
      provider: "Internal",
    },
    {
      personEmail: e("M. Grant"),
      compKey: "slinger",
      days: -1400,
      ref: "SL-2",
      provider: "LEEA",
    },
    {
      personEmail: e("M. Grant"),
      compKey: "crane-op",
      days: -1400,
      ref: "CR-2",
      provider: "LEEA",
    },
    {
      personEmail: e("M. Grant"),
      compKey: "env",
      days: -600,
      ref: "ENV-2",
      provider: "Internal",
    },
    {
      personEmail: e("M. Grant"),
      compKey: "internal-auditor",
      days: -1200,
      ref: "IA-2",
      provider: "BSI",
    },
    {
      personEmail: e("S. Ahmed", "s.ahmed@northfield.example"),
      compKey: "internal-auditor",
      days: -1500,
      ref: "IA-1",
      provider: "BSI",
    },
    {
      personEmail: e("S. Ahmed", "s.ahmed@northfield.example"),
      compKey: "measuring",
      days: -800,
      ref: "MEAS-1",
      provider: "Calderdale",
    },
    {
      personEmail: e("S. Ahmed", "s.ahmed@northfield.example"),
      compKey: "first-aid",
      days: -1150,
      ref: "FAW-1",
      provider: "St John",
    },
    {
      personEmail: e("D. Brooks"),
      compKey: "slinger",
      days: -1700,
      ref: "SL-3",
      provider: "LEEA",
    },
    {
      personEmail: e("D. Brooks"),
      compKey: "crane-op",
      days: -1700,
      ref: "CR-3",
      provider: "LEEA",
    },
    {
      personEmail: e("D. Brooks"),
      compKey: "flt",
      days: -1120,
      ref: "FLT-3",
      provider: "RTITB",
    },
    {
      personEmail: e("D. Brooks"),
      compKey: "manual-handling",
      days: -500,
      ref: "MH-3",
      provider: "Internal",
    },
    {
      personEmail: e("D. Brooks"),
      compKey: "coshh",
      days: -500,
      ref: "CO-3",
      provider: "Internal",
    },
    {
      personEmail: e("D. Brooks"),
      compKey: "measuring",
      days: -500,
      ref: "MEAS-3",
      provider: "Internal",
    },
    {
      personEmail: e("T. Begum"),
      compKey: "coshh",
      days: -600,
      ref: "CO-4",
      provider: "Internal",
    },
    {
      personEmail: e("T. Begum"),
      compKey: "face-fit",
      days: -760,
      ref: "FF-4",
      provider: "3M",
    },
    {
      personEmail: e("T. Begum"),
      compKey: "manual-handling",
      days: -600,
      ref: "MH-4",
      provider: "Internal",
    },
    {
      personEmail: e("T. Begum"),
      compKey: "measuring",
      days: -300,
      ref: "MEAS-4",
      provider: "Internal",
    },
    {
      personEmail: e("T. Begum"),
      compKey: "press-brake",
      days: -650,
      ref: "PB-4",
      provider: "Amada",
    },
    {
      personEmail: e("J. Lee"),
      compKey: "measuring",
      days: -1000,
      ref: "MEAS-5",
      provider: "Calderdale",
    },
    {
      personEmail: e("J. Lee"),
      compKey: "first-aid",
      days: -1050,
      ref: "FAW-5",
      provider: "St John",
    },
    {
      personEmail: e("J. Lee"),
      compKey: "internal-auditor",
      days: -400,
      ref: "IA-5",
      provider: "BSI",
    },
    {
      personEmail: e("R. Osei"),
      compKey: "driver",
      days: -380,
      ref: "LIC-6",
      provider: "DVLA check",
    },
    {
      personEmail: e("R. Osei"),
      compKey: "manual-handling",
      days: -200,
      ref: "MH-6",
      provider: "Internal",
    },
    {
      personEmail: e("R. Osei"),
      compKey: "coshh",
      days: -200,
      ref: "CO-6",
      provider: "Internal",
    },
    {
      personEmail: e("R. Osei"),
      compKey: "measuring",
      days: -200,
      ref: "MEAS-6",
      provider: "Internal",
    },
    {
      personEmail: e("L. Grant"),
      compKey: "cnc",
      days: -350,
      ref: "CNC-7",
      provider: "Haas",
    },
    {
      personEmail: e("L. Grant"),
      compKey: "manual-handling",
      days: -350,
      ref: "MH-7",
      provider: "Internal",
    },
    {
      personEmail: e("L. Grant"),
      compKey: "coshh",
      days: -350,
      ref: "CO-7",
      provider: "Internal",
    },
    {
      personEmail: e("A. Novak"),
      compKey: "coshh",
      days: -230,
      ref: "CO-8",
      provider: "Internal",
    },
    {
      personEmail: e("A. Novak"),
      compKey: "face-fit",
      days: -230,
      ref: "FF-8",
      provider: "3M",
    },
    {
      personEmail: e("A. Novak"),
      compKey: "manual-handling",
      days: -230,
      ref: "MH-8",
      provider: "Internal",
    },
    {
      personEmail: e("A. Novak"),
      compKey: "measuring",
      days: -100,
      ref: "MEAS-8",
      provider: "Internal",
    },
    {
      personEmail: e("K. Hale"),
      compKey: "competent-insp",
      days: -1050,
      ref: "LEEA-10",
      provider: "LEEA",
    },
    {
      personEmail: e("K. Hale"),
      compKey: "slinger",
      days: -1050,
      ref: "SL-10",
      provider: "LEEA",
    },
    {
      personEmail: e("K. Hale"),
      compKey: "crane-op",
      days: -1050,
      ref: "CR-10",
      provider: "LEEA",
    },
  ];
  recordSeeds.push(...extras);

  const recordDocs = recordSeeds
    .map((r) => {
      const personId = personIdByEmail.get(r.personEmail);
      const cid = compIdByKey.get(r.compKey);
      if (!personId || !cid) return null;
      const date = d(r.days);
      return {
        organizationId: ORG_ID,
        personId,
        cid,
        date,
        result: "Pass",
        provider: r.provider,
        ref: r.ref,
        fileId: null,
        verifiedBy: "S. Ahmed",
        note: "",
        toVerify: false,
        t: `${date}T10:00`,
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  if (recordDocs.length) {
    await Record.insertMany(recordDocs);
  }
  console.log(`Records inserted: ${recordDocs.length}`);

  const fireCid = compIdByKey.get("fire");
  const attendeeEmails = [e("A. Novak"), e("E. Wood"), e("C. Dyer")];
  const attendees = attendeeEmails
    .map((em) => personIdByEmail.get(em))
    .filter((id): id is string => Boolean(id));

  if (fireCid && attendees.length) {
    await Session.create({
      organizationId: ORG_ID,
      cid: fireCid,
      date: d(21),
      time: "09:00",
      duration: 90,
      location: "Canteen, Northfield Works",
      trainer: "M. Grant",
      provider: "Internal · M. Grant",
      cost: 0,
      note: "Annual refresher + new starters",
      attendees,
      materials: [],
      outputs: [],
      invites: [],
      rsvp: {},
      status: "Planned",
      cancelReason: "",
      completedBy: null,
      completedAt: null,
      createdBy: CREATED_BY,
      createdOn: new Date(),
    });
    console.log("Session inserted: fire (Planned)");
  }

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
