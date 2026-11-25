/**
 * Seed Tender Autopilot demo data for a given organisation.
 *
 * Idempotent upserts by (organizationId, entityId). Safe to re-run.
 * Audit log rows for the org are cleared and rewritten each run.
 *
 * Usage (from ims-systems-v5-backend):
 *   pnpm seed:tender
 *   ORG_ID=65cdfa93b05b1d6e6f4a392c pnpm seed:tender
 */
import { config as loadDotenv } from "dotenv";
import mongoose from "mongoose";
import { loadConfig } from "../src/config";
import { getTenderAnswerModel } from "../src/modules/tender/repositories/tender-answer.model";
import { getTenderAuditLogModel } from "../src/modules/tender/repositories/tender-audit-log.model";
import { getTenderCaseModel } from "../src/modules/tender/repositories/tender-case.model";
import { getTenderCertificateModel } from "../src/modules/tender/repositories/tender-certificate.model";
import { getTenderPolicyModel } from "../src/modules/tender/repositories/tender-policy.model";
import { getTenderQuestionnaireModel } from "../src/modules/tender/repositories/tender-questionnaire.model";
import { getTenderRateModel } from "../src/modules/tender/repositories/tender-rate.model";
import { getTenderServiceModel } from "../src/modules/tender/repositories/tender-service.model";
import { getTenderSettingsModel } from "../src/modules/tender/repositories/tender-settings.model";

loadDotenv();

const ORG_ID = process.env.ORG_ID?.trim() || "65cdfa93b05b1d6e6f4a392c";
const CREATED_BY = "tender-demo-seed";
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

async function upsertByEntityId(
  Model: {
    findOneAndUpdate: (
      filter: Record<string, unknown>,
      update: Record<string, unknown>,
      options: { upsert: boolean; new: boolean }
    ) => Promise<unknown>;
  },
  entityId: string,
  data: Record<string, unknown>
) {
  await Model.findOneAndUpdate(
    { organizationId: ORG_ID, entityId },
    {
      $set: data,
      $setOnInsert: { organizationId: ORG_ID, entityId },
    },
    { upsert: true, new: true }
  );
}

async function main() {
  const config = loadConfig();
  const uri = process.env.MONGODB_URI || config.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");

  console.log(`Connecting… ORG_ID=${ORG_ID}`);
  await mongoose.connect(uri);

  const Settings = getTenderSettingsModel();
  const Answer = getTenderAnswerModel();
  const Certificate = getTenderCertificateModel();
  const Policy = getTenderPolicyModel();
  const Service = getTenderServiceModel();
  const Case = getTenderCaseModel();
  const Rate = getTenderRateModel();
  const Questionnaire = getTenderQuestionnaireModel();
  const AuditLog = getTenderAuditLogModel();

  const today = new Date();
  const d = (n: number) => iso(addDays(today, n));
  const t = (n: number) => addDays(today, n);

  // —— settings + facts ——
  await Settings.findOneAndUpdate(
    { organizationId: ORG_ID },
    {
      $set: {
        reviewMonths: 12,
        approvers: ["M. Grant", "S. Ahmed"],
        tone: 'Formal, first person plural ("we"), concrete and evidenced. British English.',
        minConfidence: 0.55,
        certWarnDays: 60,
        learn: true,
        submissionCc: "tenders@northfield.example",
        fromEmail: "bids@northfield.example",
        facts: {
          company: ORG_NAME,
          companyNumber: "04871234",
          founded: "1998",
          employees: "186",
          turnover: "£24.6m",
          sites:
            "Northfield Works (Birmingham) and Calderdale Depot (Halifax)",
          hsLead: "D. Brooks, H&S Advisor (NEBOSH General Certificate)",
          qualityLead: "S. Ahmed, Quality Manager",
          dpo: "J. Lee, IT & Data Lead",
          insurerEL: "£10m employers liability",
          insurerPL: "£10m public liability",
          insurerPI: "£5m professional indemnity",
          accidentRate: "0.42 per 100,000 hours (RIDDOR, last 12 months)",
          lostTimeIncidents: "1 (last 12 months)",
        },
        updatedBy: CREATED_BY,
        updatedOn: new Date(),
      },
      $setOnInsert: { organizationId: ORG_ID },
    },
    { upsert: true }
  );
  console.log("Settings upserted");

  // —— library answers (~5) ——
  const answers = [
    {
      entityId: "ans-iso9001",
      question:
        "Do you hold ISO 9001 certification? Please give details of scope and certification body.",
      answer:
        "Yes. Northfield Engineering Ltd holds ISO 9001:2015 certification (certificate GB-Q-21884, issued by BSI, valid to 14 March 2027) covering the design, manufacture, installation and servicing of lifting equipment and structural steelwork at Northfield Works (Birmingham) and Calderdale Depot (Halifax). Our quality management system is audited annually by BSI and internally on a 12-month programme owned by S. Ahmed, Quality Manager.",
      tags: ["quality"],
      standards: ["ISO 9001"],
      owner: "S. Ahmed",
      approvedBy: "M. Grant",
      approvedAt: d(-120),
      reviewBy: d(245),
      uses: 4,
      evidence: [
        { kind: "certificate", id: "cert-9001", label: "ISO 9001:2015 certificate" },
      ],
      hist: [hist(t(-120), "M. Grant", "Approved")],
    },
    {
      entityId: "ans-hs",
      question:
        "Describe your health and safety management system and how it is certified.",
      answer:
        "Our occupational health and safety management system is certified to ISO 45001:2018 (certificate GB-HS-10322, BSI) and we hold SSIP accreditation through SafeContractor. The system is led by {{hsLead}} with board-level responsibility held by the Operations Director. Our RIDDOR-reportable accident frequency rate is {{accidentRate}} with {{lostTimeIncidents}} lost-time incident(s).",
      tags: ["health & safety"],
      standards: ["ISO 45001", "SSIP"],
      owner: "S. Ahmed",
      approvedBy: "M. Grant",
      approvedAt: d(-120),
      reviewBy: d(245),
      uses: 3,
      evidence: [],
      hist: [hist(t(-120), "M. Grant", "Approved")],
    },
    {
      entityId: "ans-environment",
      question:
        "Please provide details of your environmental management system and any certification held.",
      answer:
        "We operate an ISO 14001:2015 certified environmental management system (certificate GB-E-30871, BSI). Significant aspects are reviewed annually and include energy, waste, hazardous substances and transport. We report Scope 1 and 2 emissions annually and have a carbon reduction plan with a 2040 net-zero target.",
      tags: ["environment"],
      standards: ["ISO 14001"],
      owner: "S. Ahmed",
      approvedBy: "M. Grant",
      approvedAt: d(-120),
      reviewBy: d(245),
      uses: 3,
      evidence: [],
      hist: [hist(t(-120), "M. Grant", "Approved")],
    },
    {
      entityId: "ans-insurance",
      question:
        "What insurance cover do you hold? Please state employers liability, public liability and professional indemnity limits.",
      answer:
        "We hold {{insurerEL}}, {{insurerPL}} and {{insurerPI}} cover with Aviva, renewing annually on 1 April. Certificates are available on request and copies are attached.",
      tags: ["insurance"],
      standards: [],
      owner: "S. Ahmed",
      approvedBy: "M. Grant",
      approvedAt: d(-120),
      reviewBy: d(245),
      uses: 3,
      evidence: [],
      hist: [hist(t(-120), "M. Grant", "Approved")],
    },
    {
      entityId: "ans-modern-slavery",
      question:
        "Please confirm your compliance with the Modern Slavery Act 2015 and describe the steps you take in your supply chain.",
      answer:
        "We comply with the Modern Slavery Act 2015 and publish an annual statement approved by the board. Our Modern Slavery and Ethical Trading Policy (POL-11 v4) is applied to all suppliers through our supplier approval process. All managers and buyers complete modern slavery awareness training; no instances have been identified.",
      tags: ["modern slavery", "supply chain"],
      standards: [],
      owner: "S. Ahmed",
      approvedBy: "M. Grant",
      approvedAt: d(-120),
      reviewBy: d(245),
      uses: 3,
      evidence: [
        {
          kind: "policy",
          id: "pol-modern-slavery",
          label: "Modern Slavery & Ethical Trading Policy",
        },
      ],
      hist: [hist(t(-120), "M. Grant", "Approved")],
    },
  ];

  for (const a of answers) {
    const { entityId, ...rest } = a;
    await upsertByEntityId(Answer, entityId, rest);
  }
  console.log(`Answers upserted: ${answers.length}`);

  // —— certificates (~3): soon / expired / valid ——
  const certificates = [
    {
      entityId: "cert-9001",
      name: "ISO 9001:2015 certificate",
      body: "BSI",
      number: "GB-Q-21884",
      standard: "ISO 9001",
      scope:
        "Design, manufacture, installation and servicing of lifting equipment and structural steelwork",
      issued: d(-620),
      expires: d(400),
      fileId: null,
      fileName: null,
      hist: [hist(t(-620), "S. Ahmed", "Added to library · seed")],
    },
    {
      entityId: "cert-ssip",
      name: "SafeContractor (SSIP) accreditation",
      body: "Alcumus",
      number: "SC-118220",
      standard: "SSIP",
      scope: "Health & safety",
      issued: d(-300),
      expires: d(30),
      fileId: null,
      fileName: null,
      hist: [hist(t(-300), "S. Ahmed", "Added to library · seed")],
    },
    {
      entityId: "cert-constructionline",
      name: "Constructionline Gold",
      body: "Constructionline",
      number: "CL-409118",
      standard: "Constructionline",
      scope: "Pre-qualification",
      issued: d(-370),
      expires: d(-10),
      fileId: null,
      fileName: null,
      hist: [hist(t(-370), "S. Ahmed", "Added to library · seed")],
    },
  ];

  for (const c of certificates) {
    const { entityId, ...rest } = c;
    await upsertByEntityId(Certificate, entityId, rest);
  }
  console.log(`Certificates upserted: ${certificates.length}`);

  // —— policies (~2): one overdue nextReview ——
  const policies = [
    {
      entityId: "pol-hs",
      name: "Health & Safety Policy",
      ref: "POL-01",
      version: "9",
      reviewed: d(-280),
      nextReview: d(85),
      owner: "D. Brooks",
      fileId: null,
      summary:
        "We operate a documented health and safety policy signed by the Managing Director, with organisation and arrangements covering risk assessment, permit to work, training, incident reporting and consultation.",
      tags: ["health & safety"],
      hist: [hist(t(-280), "D. Brooks", "Reviewed · seed")],
    },
    {
      entityId: "pol-modern-slavery",
      name: "Modern Slavery & Ethical Trading Policy",
      ref: "POL-11",
      version: "4",
      reviewed: d(-400),
      nextReview: d(-15),
      owner: "Procurement",
      fileId: null,
      summary:
        "Supply chain due diligence and annual statement under the Modern Slavery Act 2015.",
      tags: ["modern slavery", "supply chain"],
      hist: [hist(t(-400), "Procurement", "Reviewed · seed")],
    },
  ];

  for (const p of policies) {
    const { entityId, ...rest } = p;
    await upsertByEntityId(Policy, entityId, rest);
  }
  console.log(`Policies upserted: ${policies.length}`);

  // —— services (~2) ——
  const services = [
    {
      entityId: "svc-loler",
      name: "Lifting equipment supply, installation and LOLER thorough examination",
      description:
        "We design, manufacture, install and maintain overhead cranes, hoists, gantries and lifting accessories up to 50 tonnes SWL, and provide LOLER 1998 thorough examinations through our in-house competent persons (LEEA registered).",
      method:
        "Survey and lift plan; design and manufacture; delivery and installation under permit to work; load testing and commissioning; handover with LOLER certificates and O&M manuals.",
      people: [
        "M. Grant (Operations Director, 24 years lifting equipment)",
        "D. Brooks (H&S Advisor, NEBOSH, Appointed Person A61)",
      ],
      tags: ["lifting", "loler", "installation", "maintenance"],
      hist: [hist(t(-90), "S. Ahmed", "Added to library · seed")],
    },
    {
      entityId: "svc-steel",
      name: "Structural steelwork fabrication and erection",
      description:
        "We fabricate structural steelwork to EN 1090-2 EXC3 (CE/UKCA marked) at Northfield Works and erect on site with our own crews.",
      method:
        "Fabrication drawings in Tekla; welding to BS EN ISO 3834-2 by coded welders; site erection with RAMS and Appointed Person lift plans.",
      people: ["S. Ahmed (Quality Manager, EN 1090 RWC)"],
      tags: ["steelwork", "fabrication", "erection", "en 1090"],
      hist: [hist(t(-90), "S. Ahmed", "Added to library · seed")],
    },
  ];

  for (const s of services) {
    const { entityId, ...rest } = s;
    await upsertByEntityId(Service, entityId, rest);
  }
  console.log(`Services upserted: ${services.length}`);

  // —— cases (~2) ——
  const cases = [
    {
      entityId: "case-minworth",
      client: "Severn Trent Water",
      title: "Minworth STW — crane and lifting equipment maintenance framework",
      sector: "Water",
      year: "2023–2026",
      value: "£1.2m over 3 years",
      summary:
        "Planned and reactive maintenance and LOLER examination of 214 lifting assets across the site, with QR-coded asset records and a 4-hour reactive response.",
      outcome:
        "Outcome: 100% of thorough examinations completed on time, 97% first-time fix, zero lost-time incidents in 3 years.",
      tags: ["water", "maintenance", "loler"],
      hist: [hist(t(-60), "S. Ahmed", "Added to library · seed")],
    },
    {
      entityId: "case-esholt",
      client: "Yorkshire Water",
      title: "Esholt WwTW — screen handling crane replacement",
      sector: "Water",
      year: "2025",
      value: "£480k",
      summary:
        "Design, manufacture and installation of two 10 t overhead cranes in a live inlet works with phased outages agreed with operations.",
      outcome:
        "Outcome: delivered 2 weeks early; no process interruption; client reference available.",
      tags: ["water", "lifting", "installation"],
      hist: [hist(t(-60), "S. Ahmed", "Added to library · seed")],
    },
  ];

  for (const c of cases) {
    const { entityId, ...rest } = c;
    await upsertByEntityId(Case, entityId, rest);
  }
  console.log(`Cases upserted: ${cases.length}`);

  // —— rates (~3) ——
  const rates = [
    {
      entityId: "rate-eng-std",
      item: "Service engineer (standard hours)",
      unit: "hour",
      rate: 58,
      category: "Labour",
    },
    {
      entityId: "rate-eng-ooh",
      item: "Service engineer (out of hours / call-out)",
      unit: "hour",
      rate: 87,
      category: "Labour",
    },
    {
      entityId: "rate-loler",
      item: "LEEA competent person — thorough examination",
      unit: "hour",
      rate: 72,
      category: "Labour",
    },
  ];

  for (const r of rates) {
    const { entityId, ...rest } = r;
    await upsertByEntityId(Rate, entityId, rest);
  }
  console.log(`Rates upserted: ${rates.length}`);

  // —— questionnaire (kind questionnaire, drafting) ——
  const pqqQuestions = [
    {
      id: "q1",
      ref: "1.1",
      section: "Company",
      text: "Please confirm your registered company name, company number and year of incorporation.",
      type: "text",
      wordLimit: 50,
      limit: { kind: "words", n: 50, spaces: null, text: "50" },
      answer:
        "Northfield Engineering Ltd, company number 04871234, incorporated in 1998.",
      status: "draft",
      confidence: 0.8,
      sources: [],
      hist: [hist(t(0), "ALICE", "Drafted (80%)")],
    },
    {
      id: "q2",
      ref: "2.1",
      section: "Quality",
      text: "Do you hold ISO 9001 certification? Please give details of scope and certification body.",
      type: "text",
      wordLimit: 150,
      limit: { kind: "words", n: 150, spaces: null, text: "150" },
      answer:
        "Yes. Northfield Engineering Ltd holds ISO 9001:2015 certification (certificate GB-Q-21884, issued by BSI) covering design, manufacture, installation and servicing of lifting equipment and structural steelwork.",
      status: "approved",
      confidence: 0.92,
      sources: [
        {
          kind: "answer",
          id: "ans-iso9001",
          label: "Do you hold ISO 9001 certification?",
          score: 0.7,
        },
        {
          kind: "certificate",
          id: "cert-9001",
          label: "ISO 9001:2015 certificate",
          score: 0.19,
        },
      ],
      approvedBy: "M. Grant",
      approvedAt: t(0).toISOString(),
      hist: [
        hist(t(0), "ALICE", "Drafted (92%)"),
        hist(t(0), "M. Grant", "Approved"),
      ],
    },
    {
      id: "q3",
      ref: "3.1",
      section: "Health & safety",
      text: "Describe your health and safety management system and how it is certified.",
      type: "text",
      wordLimit: 250,
      limit: { kind: "words", n: 250, spaces: null, text: "250" },
      answer:
        "Our OH&S management system is certified to ISO 45001:2018 and we hold SSIP accreditation through SafeContractor, led by {{hsLead}}.",
      status: "accepted",
      confidence: 0.78,
      sources: [
        {
          kind: "answer",
          id: "ans-hs",
          label: "Describe your health and safety management system",
          score: 0.65,
        },
      ],
      hist: [
        hist(t(0), "ALICE", "Drafted (78%)"),
        hist(t(0), "L. Grant", "Accepted"),
      ],
    },
    {
      id: "q4",
      ref: "4.1",
      section: "Insurance",
      text: "What insurance cover do you hold?",
      type: "text",
      wordLimit: 100,
      limit: { kind: "words", n: 100, spaces: null, text: "100" },
      answer: "",
      status: "blank",
      confidence: 0,
      sources: [],
      hist: [],
    },
  ];

  await upsertByEntityId(Questionnaire, "tq-demo-pqq", {
    kind: "questionnaire",
    buyer: "West Midlands Combined Authority",
    title: "PQQ — Lifting equipment framework 2027",
    reference: "WMCA-PQQ-2027",
    submissionEmail: "procurement@wmca.example",
    buyerContact: "Procurement Team",
    portalUrl: "",
    source: "xlsx",
    fileName: "WMCA_PQQ_Lifting_2027.xlsx",
    fileId: null,
    received: d(0),
    due: d(9),
    owner: "L. Grant",
    status: "drafting",
    notes: "Demo PQQ seeded for Tender Autopilot",
    questions: pqqQuestions,
    documents: [],
    requirements: [],
    criteria: [],
    dates: {},
    pricing: null,
    exports: [],
    hist: [hist(t(0), CREATED_BY, "Seeded demo PQQ")],
  });
  console.log("Questionnaire upserted: tq-demo-pqq");

  // —— tender pack (kind tender) with requirements, criteria, dates, pricing ——
  const tenderRequirements = [
    {
      id: "r1",
      ref: "3.1",
      section: "Evaluation",
      text: "The tenderer must hold ISO 45001 or equivalent certification and SSIP accreditation at the date of submission.",
      level: "mandatory",
      status: "partial",
      evidence: [
        {
          kind: "certificate",
          id: "cert-ssip",
          label: "SafeContractor (SSIP) accreditation",
        },
        {
          kind: "answer",
          id: "ans-hs",
          label: "Describe your health and safety management system",
        },
      ],
      note: "",
      auto: true,
    },
    {
      id: "r2",
      ref: "3.2",
      section: "Evaluation",
      text: "The tenderer must hold employers liability insurance of not less than £10m and public liability insurance of not less than £10m.",
      level: "mandatory",
      status: "comply",
      evidence: [
        {
          kind: "answer",
          id: "ans-insurance",
          label: "What insurance cover do you hold?",
        },
      ],
      note: "",
      auto: true,
    },
    {
      id: "r3",
      ref: "4.1",
      section: "Service requirements",
      text: "The contractor shall carry out LOLER thorough examinations of all lifting equipment on the schedule at the statutory intervals.",
      level: "mandatory",
      status: "partial",
      evidence: [
        {
          kind: "service",
          id: "svc-loler",
          label: "Lifting equipment supply, installation and LOLER thorough examination",
        },
      ],
      note: "",
      auto: true,
    },
    {
      id: "r4",
      ref: "4.2",
      section: "Service requirements",
      text: "The contractor shall provide a 24/7 call-out service with attendance within 4 hours for critical assets.",
      level: "mandatory",
      status: "unassessed",
      evidence: [],
      note: "",
    },
  ];

  const tenderQuestions = [
    {
      id: "tq1",
      ref: "MS1",
      section: "Method statements",
      text: "Describe your approach to delivering planned and reactive mechanical maintenance across multiple water treatment sites.",
      type: "text",
      wordLimit: 500,
      limit: { kind: "words", n: 500, spaces: null, text: "(max 500 words)" },
      answer: "",
      status: "blank",
      confidence: 0,
      sources: [],
      hist: [],
    },
    {
      id: "tq2",
      ref: "MS2",
      section: "Method statements",
      text: "Provide two case studies of similar contracts delivered in the water or utilities sector in the last 5 years.",
      type: "text",
      wordLimit: 400,
      limit: { kind: "words", n: 400, spaces: null, text: "(max 400 words)" },
      answer:
        "Case study 1 — Severn Trent Water, Minworth STW: planned and reactive maintenance and LOLER examination of 214 lifting assets (£1.2m / 3 years). Case study 2 — Yorkshire Water, Esholt WwTW: design, manufacture and installation of two 10 t overhead cranes (£480k).",
      status: "draft",
      confidence: 0.74,
      sources: [
        {
          kind: "case",
          id: "case-minworth",
          label: "Minworth STW — crane and lifting equipment maintenance framework",
          score: 0.6,
        },
        {
          kind: "case",
          id: "case-esholt",
          label: "Esholt WwTW — screen handling crane replacement",
          score: 0.55,
        },
      ],
      hist: [hist(t(0), "ALICE", "Drafted (74%)")],
    },
  ];

  const pricingLines = [
    {
      id: "l1",
      description: "LOLER thorough examination — overhead crane / hoist",
      unit: "each",
      qty: 148,
      rate: 185,
      category: "Inspections",
      buyerRow: 1,
      note: "",
      rateId: "rate-loler",
      suggested: true,
    },
    {
      id: "l2",
      description: "Service engineer — planned maintenance",
      unit: "hour",
      qty: 1600,
      rate: 58,
      category: "Labour",
      buyerRow: 2,
      note: "",
      rateId: "rate-eng-std",
      suggested: true,
    },
    {
      id: "l3",
      description: "Service engineer — call-out out of hours",
      unit: "hour",
      qty: 240,
      rate: null,
      category: "",
      buyerRow: 3,
      note: "",
    },
    {
      id: "l4",
      description: "Contract management",
      unit: "day",
      qty: 48,
      rate: null,
      category: "",
      buyerRow: 4,
      note: "",
    },
    {
      id: "l5",
      description: "Travel",
      unit: "mile",
      qty: 18000,
      rate: null,
      category: "",
      buyerRow: 5,
      note: "",
    },
  ];

  await upsertByEntityId(Questionnaire, "tq-demo-tender", {
    kind: "tender",
    buyer: "Severn Trent Water",
    title: "ITT — Lifting equipment maintenance 2027–2030",
    reference: "STW-2026-1187",
    submissionEmail: "tenders@stwater.example",
    buyerContact: "Procurement Team",
    portalUrl: "",
    source: "docx",
    fileName: null,
    fileId: null,
    received: d(0),
    due: d(18),
    owner: "L. Grant",
    status: "drafting",
    notes: "Demo tender pack seeded for Tender Autopilot",
    questions: tenderQuestions,
    documents: [
      {
        id: "doc-itt",
        t: t(0).toISOString(),
        by: "L. Grant",
        name: "ITT_Instructions.docx",
        source: "docx",
        kind: "instructions",
        criteria: [
          { name: "Quality", weight: 60 },
          { name: "Price", weight: 40 },
          { name: "Social value", weight: 10 },
        ],
        dates: {
          deadline: d(18),
          clarifications: d(7),
          contractStart: d(120),
        },
        requirements: tenderRequirements.slice(0, 2).map((r) => ({
          ...r,
          status: "unassessed",
          evidence: [],
        })),
      },
      {
        id: "doc-pricing",
        t: t(0).toISOString(),
        by: "L. Grant",
        name: "Pricing_Schedule.xlsx",
        source: "xlsx",
        kind: "pricing",
        pricing: {
          lines: pricingLines,
          header: 0,
          cols: { dc: 1, uc: 2, qc: 3, rc: 4, tc: 5 },
        },
      },
    ],
    requirements: tenderRequirements,
    criteria: [
      { name: "Quality", weight: 60 },
      { name: "Price", weight: 40 },
      { name: "Social value", weight: 10 },
    ],
    dates: {
      deadline: d(18),
      clarifications: d(7),
      contractStart: d(120),
    },
    pricing: {
      lines: pricingLines,
      overheadPct: 8,
      marginPct: 12,
      vatPct: 20,
      currency: "GBP",
      suggested: 2,
      basis: "Rates are fixed for year 1 and indexed to CPI thereafter.",
      buyerSheet: {
        docId: "doc-pricing",
        header: 0,
        cols: { dc: 1, uc: 2, qc: 3, rc: 4, tc: 5 },
      },
    },
    exports: [],
    hist: [hist(t(0), CREATED_BY, "Seeded demo tender pack")],
  });
  console.log("Questionnaire upserted: tq-demo-tender");

  // —— audit log (clear + a few lines) ——
  await AuditLog.deleteMany({ organizationId: ORG_ID });
  const auditLines = [
    {
      organizationId: ORG_ID,
      t: t(-2).toISOString(),
      by: "S. Ahmed",
      what: "Library answer ans-iso9001 approved",
    },
    {
      organizationId: ORG_ID,
      t: t(-1).toISOString(),
      by: "L. Grant",
      what: "Opened PQQ — Lifting equipment framework 2027 (tq-demo-pqq)",
    },
    {
      organizationId: ORG_ID,
      t: t(0).toISOString(),
      by: CREATED_BY,
      what: "Demo seed completed for Tender Autopilot",
    },
  ];
  await AuditLog.insertMany(auditLines);
  console.log(`Audit log lines inserted: ${auditLines.length}`);

  await mongoose.disconnect();
  console.log(
    [
      "Done.",
      `settings=1`,
      `answers=${answers.length}`,
      `certificates=${certificates.length}`,
      `policies=${policies.length}`,
      `services=${services.length}`,
      `cases=${cases.length}`,
      `rates=${rates.length}`,
      `questionnaires=2`,
      `auditLogs=${auditLines.length}`,
    ].join(" ")
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
