/**
 * Seed Inventory & Assets demo data for a given organisation.
 *
 * Idempotent upserts by (organizationId, tag) / stock code. Safe to re-run.
 *
 * Usage (from ims-systems-v5-backend):
 *   pnpm seed:inventory
 *   ORG_ID=65cdfa93b05b1d6e6f4a392c pnpm seed:inventory
 */
import { config as loadDotenv } from "dotenv";
import mongoose from "mongoose";
import { loadConfig } from "../src/config";
import { getInventoryAssetModel } from "../src/modules/inventory/repositories/inventory-asset.model";
import { getInventorySettingsModel } from "../src/modules/inventory/repositories/inventory-settings.model";
import { getInventoryStockModel } from "../src/modules/inventory/repositories/inventory-stock.model";

loadDotenv();

const ORG_ID = process.env.ORG_ID?.trim() || "65cdfa93b05b1d6e6f4a392c";
const CREATED_BY = "inventory-demo-seed";

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function hist(t: Date, by: string, what: string) {
  return { t: t.toISOString(), by, what };
}

type AssetSeed = {
  tag: string;
  name: string;
  category: string;
  location: string;
  custodian: string;
  stage: string;
  criticality: string;
  makeModel: string;
  serial: string;
  purchaseDate: string | null;
  cost: number | null;
  supplier: string;
  informationAsset: boolean;
  safetyNotes: string;
  labelPrinted: boolean;
  checks: Record<
    string,
    { date: string; result: string; by: string; ref: string }
  >;
  history: Array<{ t: string; by: string; what: string }>;
};

type StockSeed = {
  code: string;
  name: string;
  location: string;
  qty: number;
  min: number;
  max: number;
  batch: string;
  expiry: string | null;
  history: Array<{ t: string; by: string; what: string }>;
};

function buildAssets(today: Date): AssetSeed[] {
  const d = (n: number) => iso(addDays(today, n));
  const t = (n: number) => addDays(today, n);
  return [
    {
      tag: "NE-0101",
      name: "Overhead crane 5t · Bay 1",
      category: "Lifting equipment",
      location: "Northfield Works · Bay 1",
      custodian: "D. Brooks",
      stage: "In service",
      criticality: "Critical",
      makeModel: "Konecranes CXT",
      serial: "KC-77812",
      purchaseDate: d(-1800),
      cost: 48000,
      supplier: "Kestrel Site Services",
      informationAsset: false,
      safetyNotes: "Max SWL 5,000 kg.",
      labelPrinted: true,
      checks: {
        "Thorough examination": {
          date: d(-200),
          result: "Pass",
          by: "D. Brooks",
          ref: "LOLER-2025-01",
        },
      },
      history: [
        hist(t(-1800), "S. Ahmed", "Commissioned and added to register"),
      ],
    },
    {
      tag: "NE-0102",
      name: "Chain sling 2-leg 3.2t",
      category: "Lifting equipment",
      location: "Northfield Works · Bay 1",
      custodian: "D. Brooks",
      stage: "In service",
      criticality: "High",
      makeModel: "Pewag",
      serial: "PW-2211",
      purchaseDate: d(-500),
      cost: 640,
      supplier: "Kestrel Site Services",
      informationAsset: false,
      safetyNotes: "",
      labelPrinted: true,
      checks: {
        "Thorough examination": {
          date: d(-170),
          result: "Pass",
          by: "D. Brooks",
          ref: "",
        },
      },
      history: [hist(t(-500), "S. Ahmed", "Commissioned and added to register")],
    },
    {
      tag: "NE-0103",
      name: "Air receiver 500 L",
      category: "Pressure systems",
      location: "Northfield Works · Compressor house",
      custodian: "M. Grant",
      stage: "In service",
      criticality: "Critical",
      makeModel: "Atlas Copco",
      serial: "AC-500-9",
      purchaseDate: d(-2800),
      cost: 3200,
      supplier: "Pennine Compressors",
      informationAsset: false,
      safetyNotes: "Written scheme NE-WS-02.",
      labelPrinted: true,
      checks: {
        "Written scheme examination": {
          date: d(-380),
          result: "Pass",
          by: "Pennine Compressors",
          ref: "PSSR-NE-02",
        },
      },
      history: [
        hist(t(-2800), "S. Ahmed", "Commissioned and added to register"),
      ],
    },
    {
      tag: "NE-0201",
      name: "CNC machining centre",
      category: "Production machinery",
      location: "Northfield Works · Bay 2",
      custodian: "M. Grant",
      stage: "In service",
      criticality: "Critical",
      makeModel: "Haas VF-4",
      serial: "HV4-18821",
      purchaseDate: d(-1100),
      cost: 96000,
      supplier: "Haas UK",
      informationAsset: true,
      safetyNotes: "",
      labelPrinted: true,
      checks: {
        "Planned maintenance": {
          date: d(-100),
          result: "Pass",
          by: "M. Grant",
          ref: "",
        },
        "Guarding inspection": {
          date: d(-300),
          result: "Pass",
          by: "M. Grant",
          ref: "",
        },
      },
      history: [
        hist(t(-1100), "S. Ahmed", "Commissioned and added to register"),
      ],
    },
    {
      tag: "NE-0202",
      name: "Press brake 120t",
      category: "Production machinery",
      location: "Northfield Works · Bay 2",
      custodian: "M. Grant",
      stage: "Under maintenance",
      criticality: "High",
      makeModel: "Amada HFE",
      serial: "AM-4410",
      purchaseDate: d(-2200),
      cost: 72000,
      supplier: "Amada UK",
      informationAsset: false,
      safetyNotes: "Light guard fault. Do not use.",
      labelPrinted: true,
      checks: {
        "Planned maintenance": {
          date: d(-80),
          result: "Pass",
          by: "M. Grant",
          ref: "",
        },
        "Guarding inspection": {
          date: d(-20),
          result: "Pass",
          by: "M. Grant",
          ref: "",
        },
      },
      history: [
        hist(
          t(-3),
          "T. Begum",
          "Fault reported by QR scan: light guard not resetting."
        ),
      ],
    },
    {
      tag: "NE-0301",
      name: "Digital vernier 300 mm",
      category: "Measuring & test equipment",
      location: "Northfield Works · Inspection",
      custodian: "J. Lee",
      stage: "In service",
      criticality: "High",
      makeModel: "Mitutoyo",
      serial: "MT-300-5521",
      purchaseDate: d(-700),
      cost: 210,
      supplier: "Calderdale Calibration",
      informationAsset: false,
      safetyNotes: "Return to case after use.",
      labelPrinted: true,
      checks: {
        Calibration: {
          date: d(-350),
          result: "Pass",
          by: "Calderdale Calibration",
          ref: "CAL-8821",
        },
      },
      history: [hist(t(-700), "S. Ahmed", "Commissioned and added to register")],
    },
    {
      tag: "NE-0302",
      name: "Torque wrench 5–50 Nm",
      category: "Measuring & test equipment",
      location: "Northfield Works · Tool crib",
      custodian: "J. Lee",
      stage: "Quarantined",
      criticality: "High",
      makeModel: "Norbar",
      serial: "NB-5050",
      purchaseDate: d(-400),
      cost: 180,
      supplier: "Calderdale Calibration",
      informationAsset: false,
      safetyNotes: "Failed calibration — assess previous results.",
      labelPrinted: true,
      checks: {
        Calibration: {
          date: d(-5),
          result: "Fail",
          by: "Calderdale Calibration",
          ref: "CAL-9910",
        },
      },
      history: [
        hist(
          t(-5),
          "J. Lee",
          "Calibration: Fail → Quarantined. Assess validity of previous results."
        ),
      ],
    },
    {
      tag: "NE-0401",
      name: "CO2 extinguisher · Bay 1",
      category: "Fire & safety",
      location: "Northfield Works · Bay 1",
      custodian: "S. Ahmed",
      stage: "In service",
      criticality: "Critical",
      makeModel: "Chubb",
      serial: "FE-CO2-11",
      purchaseDate: d(-900),
      cost: 85,
      supplier: "Chubb Fire",
      informationAsset: false,
      safetyNotes: "",
      labelPrinted: true,
      checks: {
        "Annual service": {
          date: d(-40),
          result: "Pass",
          by: "Chubb Fire",
          ref: "",
        },
        "Visual check": {
          date: d(-10),
          result: "Pass",
          by: "S. Ahmed",
          ref: "",
        },
      },
      history: [hist(t(-900), "S. Ahmed", "Commissioned and added to register")],
    },
    {
      tag: "NE-0501",
      name: "Laptop · QA lead",
      category: "IT & information systems",
      location: "Northfield Works · Office",
      custodian: "J. Lee",
      stage: "In service",
      criticality: "Standard",
      makeModel: "Dell Latitude",
      serial: "DL-9912",
      purchaseDate: d(-200),
      cost: 1200,
      supplier: "Dell",
      informationAsset: true,
      safetyNotes: "",
      labelPrinted: false,
      checks: {},
      history: [hist(t(-200), "S. Ahmed", "Commissioned and added to register")],
    },
    {
      tag: "NE-0601",
      name: "Forklift truck 2.5t",
      category: "Vehicles",
      location: "Northfield Works · Yard",
      custodian: "D. Brooks",
      stage: "In service",
      criticality: "Critical",
      makeModel: "Toyota",
      serial: "TY-25-441",
      purchaseDate: d(-1500),
      cost: 28000,
      supplier: "Toyota Material Handling",
      informationAsset: false,
      safetyNotes: "",
      labelPrinted: true,
      checks: {},
      history: [
        hist(t(-1500), "S. Ahmed", "Commissioned and added to register"),
      ],
    },
    {
      tag: "NE-0701",
      name: "Portable appliance · kettle bay 2",
      category: "Electrical appliances",
      location: "Northfield Works · Bay 2",
      custodian: "T. Begum",
      stage: "In service",
      criticality: "Low",
      makeModel: "Russell Hobbs",
      serial: "RH-11",
      purchaseDate: d(-100),
      cost: 25,
      supplier: "Arco",
      informationAsset: false,
      safetyNotes: "",
      labelPrinted: true,
      checks: {
        PAT: {
          date: d(-20),
          result: "Pass",
          by: "T. Begum",
          ref: "",
        },
      },
      history: [hist(t(-100), "S. Ahmed", "Commissioned and added to register")],
    },
    {
      tag: "NE-0801",
      name: "First aid kit · Office",
      category: "General equipment",
      location: "Northfield Works · Office",
      custodian: "S. Ahmed",
      stage: "In service",
      criticality: "Standard",
      makeModel: "St John",
      serial: "",
      purchaseDate: d(-60),
      cost: 40,
      supplier: "Arco",
      informationAsset: false,
      safetyNotes: "",
      labelPrinted: true,
      checks: {
        "Planned maintenance": {
          date: d(-30),
          result: "Pass",
          by: "S. Ahmed",
          ref: "",
        },
      },
      history: [hist(t(-60), "S. Ahmed", "Commissioned and added to register")],
    },
    {
      tag: "NE-0901",
      name: "RPE half-mask · welder 3",
      category: "PPE & RPE",
      location: "Northfield Works · Bay 2",
      custodian: "T. Begum",
      stage: "In service",
      criticality: "High",
      makeModel: "3M 7502",
      serial: "3M-7502-A19",
      purchaseDate: d(-120),
      cost: 45,
      supplier: "Arco",
      informationAsset: false,
      safetyNotes: "Face-fit tested for T. Begum only.",
      labelPrinted: true,
      checks: {},
      history: [hist(t(-120), "S. Ahmed", "Commissioned and added to register")],
    },
    {
      tag: "NE-1001",
      name: "Laser cutter (on order)",
      category: "Production machinery",
      location: "Northfield Works · Bay 3",
      custodian: "M. Grant",
      stage: "Procured",
      criticality: "Critical",
      makeModel: "Bystronic ByStar",
      serial: "",
      purchaseDate: d(-20),
      cost: 310000,
      supplier: "Bystronic UK",
      informationAsset: true,
      safetyNotes: "Commissioning next month.",
      labelPrinted: true,
      checks: {},
      history: [hist(t(-20), "S. Ahmed", "Procured — awaiting commission")],
    },
  ];
}

function buildStock(today: Date): StockSeed[] {
  const d = (n: number) => iso(addDays(today, n));
  const t = (n: number) => addDays(today, n);
  return [
    {
      code: "C-001",
      name: "Welding wire 1.0 mm ER70S-6 (15 kg)",
      location: "Northfield Works · Stores",
      qty: 6,
      min: 8,
      max: 30,
      batch: "B2411",
      expiry: null,
      history: [hist(t(-2), "M. Grant", "issue 4 (10 → 6) · job 8841")],
    },
    {
      code: "C-002",
      name: "Calibration gas CO 100 ppm",
      location: "Northfield Works · Inspection",
      qty: 2,
      min: 1,
      max: 4,
      batch: "G7710",
      expiry: d(14),
      history: [],
    },
    {
      code: "C-003",
      name: "Nitrile gloves M (box 100)",
      location: "Northfield Works · Stores",
      qty: 22,
      min: 10,
      max: 60,
      batch: "",
      expiry: null,
      history: [],
    },
    {
      code: "C-004",
      name: "Spill absorbent pads (pack 100)",
      location: "Northfield Works · Yard",
      qty: 1,
      min: 2,
      max: 6,
      batch: "",
      expiry: null,
      history: [],
    },
    {
      code: "C-005",
      name: "Hydraulic oil ISO 46 (20 L)",
      location: "Northfield Works · Stores",
      qty: 3,
      min: 2,
      max: 8,
      batch: "HO-46",
      expiry: d(120),
      history: [],
    },
  ];
}

async function main() {
  const config = loadConfig();
  const uri = process.env.MONGODB_URI || config.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");

  console.log(`Connecting… ORG_ID=${ORG_ID}`);
  await mongoose.connect(uri);

  const Asset = getInventoryAssetModel();
  const Stock = getInventoryStockModel();
  const Settings = getInventorySettingsModel();
  const today = new Date();

  await Settings.findOneAndUpdate(
    { organizationId: ORG_ID },
    {
      $set: {
        leadDays: 30,
        requireLoginForScanActions: false,
        scanBase: null,
        competentPersons: [
          "D. Brooks",
          "Calderdale Calibration",
          "Pennine Compressors",
          "Chubb Fire",
          "J. Lee",
          "M. Grant",
        ],
        updatedBy: CREATED_BY,
        updatedOn: new Date(),
      },
      $setOnInsert: {
        organizationId: ORG_ID,
        categoryOverrides: {},
      },
    },
    { upsert: true }
  );
  console.log("Settings upserted");

  const assets = buildAssets(today);
  for (const a of assets) {
    await Asset.findOneAndUpdate(
      { organizationId: ORG_ID, tag: a.tag },
      {
        $set: {
          name: a.name,
          category: a.category,
          location: a.location,
          custodian: a.custodian,
          stage: a.stage,
          criticality: a.criticality,
          makeModel: a.makeModel,
          serial: a.serial,
          purchaseDate: a.purchaseDate,
          cost: a.cost,
          supplier: a.supplier,
          warrantyEnds: null,
          informationAsset: a.informationAsset,
          safetyNotes: a.safetyNotes,
          labelPrinted: a.labelPrinted,
          checks: a.checks,
          history: a.history,
          disposal: null,
          updatedBy: CREATED_BY,
          updatedOn: new Date(),
          deletedAt: null,
        },
        $setOnInsert: {
          organizationId: ORG_ID,
          tag: a.tag,
          createdBy: CREATED_BY,
          createdOn: new Date(),
        },
      },
      { upsert: true }
    );
  }
  console.log(`Assets upserted: ${assets.length}`);

  const stock = buildStock(today);
  for (const s of stock) {
    await Stock.findOneAndUpdate(
      { organizationId: ORG_ID, code: s.code },
      {
        $set: {
          name: s.name,
          location: s.location,
          qty: s.qty,
          min: s.min,
          max: s.max,
          batch: s.batch,
          expiry: s.expiry,
          history: s.history,
          updatedBy: CREATED_BY,
          updatedOn: new Date(),
          deletedAt: null,
        },
        $setOnInsert: {
          organizationId: ORG_ID,
          code: s.code,
          createdBy: CREATED_BY,
          createdOn: new Date(),
        },
      },
      { upsert: true }
    );
  }
  console.log(`Stock upserted: ${stock.length}`);

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
