import { describe, expect, it } from "vitest";
import {
  accept,
  analyseDocument,
  approve,
  canSubmit,
  draft,
  fromRows,
  fromText,
  gate,
  libraryHealth,
  limitLabel,
  limitUsage,
  newQuestionnaire,
  parseLimit,
  priceTotals,
  setAnswer,
  setPricing,
  wordsOf,
  DEFAULT_SETTINGS,
  today,
  iso,
  addDays,
  assessRequirement,
  updateBid,
  bidBlocks,
  pricingRows,
  submissionPackage,
} from "../src/modules/tender/lib/tender-rules";
import {
  writeXlsx as officeWriteXlsx,
  writeDocx as officeWriteDocx,
  readXlsx as officeReadXlsx,
  readDocx as officeReadDocx,
} from "../src/modules/tender/lib/office-io";
import type { TenderRulesModel } from "../src/modules/tender/types";

function baseModel(): TenderRulesModel {
  const d = iso(today());
  return {
    org: "Northfield Engineering Ltd",
    settings: { ...DEFAULT_SETTINGS },
    facts: {
      company: "Northfield Engineering Ltd",
      companyNumber: "04871234",
      founded: "1998",
      employees: "186",
      turnover: "£24.6m",
      sites: "Northfield Works (Birmingham) and Calderdale Depot (Halifax)",
      accidentRate: "0.42 per 100,000 hours",
      lostTimeIncidents: "1",
    },
    library: {
      answers: [
        {
          id: "ans-iso9001",
          question:
            "Do you hold ISO 9001 certification? Please give details of scope and certification body.",
          answer:
            "Yes. Northfield Engineering Ltd holds ISO 9001:2015 certification (certificate GB-Q-21884, issued by BSI, valid to 14 March 2027) covering the design, manufacture, installation and servicing of lifting equipment and structural steelwork at Northfield Works (Birmingham) and Calderdale Depot (Halifax). Our quality management system is audited annually by BSI and internally on a 12-month programme owned by S. Ahmed, Quality Manager.",
          tags: ["quality"],
          standards: ["ISO 9001"],
          owner: "S. Ahmed",
          approvedBy: "M. Grant",
          approvedAt: d,
          reviewBy: iso(addDays(today(), 365)),
          uses: 4,
          evidence: [],
          hist: [],
        },
        {
          id: "ans-hs",
          question:
            "Describe your health and safety management system and how it is certified.",
          answer:
            "Our occupational health and safety management system is certified to ISO 45001:2018 (certificate GB-HS-10322, BSI, valid to 14 March 2027) and we hold SSIP accreditation through SafeContractor. The system is led by {{hsLead}} with board-level responsibility held by the Operations Director. It covers hazard identification and risk assessment, permit-to-work for high-risk activities, competence and training, incident reporting and investigation, and a monthly site inspection programme. Our RIDDOR-reportable accident frequency rate is {{accidentRate}} with {{lostTimeIncidents}} lost-time incident(s).",
          tags: ["health & safety"],
          standards: ["ISO 45001", "SSIP"],
          owner: "S. Ahmed",
          approvedBy: "M. Grant",
          approvedAt: d,
          reviewBy: iso(addDays(today(), 365)),
          uses: 3,
          evidence: [],
          hist: [],
        },
      ],
      certificates: [
        {
          id: "cert-9001",
          name: "ISO 9001:2015",
          body: "BSI",
          number: "GB-Q-21884",
          standard: "ISO 9001",
          expires: iso(addDays(today(), 400)),
          hist: [],
        },
        {
          id: "cert-expiring",
          name: "Cyber Essentials",
          body: "IASME",
          expires: iso(addDays(today(), 30)),
          hist: [],
        },
        {
          id: "cert-expired",
          name: "Old CHAS",
          body: "CHAS",
          expires: iso(addDays(today(), -10)),
          hist: [],
        },
      ],
      policies: [
        {
          id: "pol-hs",
          name: "Health & Safety Policy",
          ref: "POL-01",
          version: "9",
          reviewed: iso(addDays(today(), -200)),
          nextReview: iso(addDays(today(), -10)),
          owner: "D. Brooks",
          summary:
            "We operate a documented health and safety management system covering all sites.",
          hist: [],
        },
      ],
      services: [
        {
          id: "svc-maint",
          name: "Planned and reactive maintenance",
          description:
            "We deliver planned preventive maintenance and reactive call-outs across multi-site estates, with 24/7 cover for critical plant.",
          method:
            "Mobilisation includes a site survey, asset register update, and a risk-assessed method statement agreed with the client before works begin.",
          people: ["A. Patel", "L. Grant"],
          tags: ["maintenance"],
          hist: [],
        },
      ],
      cases: [
        {
          id: "case-1",
          client: "Severn Trent Water",
          title: "Minworth STW maintenance",
          sector: "Water",
          year: "2024",
          value: "£1.2m",
          summary: "Three-year planned maintenance of process plant.",
          outcome: "Zero lost-time incidents; 98% planned completion.",
          hist: [],
        },
      ],
      rates: [
        {
          id: "rate-eng",
          item: "Engineer hours",
          unit: "hr",
          rate: 185,
          category: "Labour",
        },
      ],
    },
    questionnaires: [],
    log: [],
  };
}

describe("tender-rules import", () => {
  it("parses Excel rows with header, sections, word limits and response column", () => {
    const p = fromRows([
      ["PQQ"],
      ["Ref", "Section", "Question", "Word limit", "Supplier response"],
      ["1.1", "Company", "Please confirm your registered company name.", 50, ""],
      ["2.1", "Quality", "Do you hold ISO 9001 certification?", "", "Yes"],
      ["", "", "", "", ""],
    ]);
    expect(p.questions.length).toBe(2);
    expect(p.questions[0]!.ref).toBe("1.1");
    expect(p.questions[0]!.wordLimit).toBe(50);
    expect(p.questions[0]!.section).toBe("Company");
    expect(p.questions[1]!.status).toBe("edited");
    expect(p.answerCol).toBe(4);
  });

  it("parses portal paste with sections, numbering, yes/no and word limits", () => {
    const p = fromText(
      "Section A — Mandatory\nA1. Do you hold SSIP accreditation? Yes/No\nA2. Please describe your approach to safety. (max 250 words)\nSection B\nB1 What is your turnover?"
    );
    expect(p.questions.length).toBe(3);
    expect(p.questions[0]!.type).toBe("yesno");
    expect(p.questions[1]!.wordLimit).toBe(250);
    expect(p.questions[2]!.section).toBe("B");
    expect(p.questions[2]!.ref).toBe("B1");
  });

  it("refuses when nothing looks like a question", () => {
    const M = baseModel();
    expect(() =>
      newQuestionnaire(M, { buyer: "X" }, fromText("hello\nworld"), "t")
    ).toThrow(/No questions/);
  });
});

describe("tender-rules draft", () => {
  it("matches approved library answers and scores confidence", () => {
    const M = baseModel();
    const d = draft(M, {
      id: "q1",
      ref: "1",
      section: "",
      text: "Do you hold ISO 9001 certification? Please give details.",
      type: "text",
      wordLimit: null,
      answer: "",
      status: "blank",
      confidence: 0,
      sources: [],
      hist: [],
    });
    expect(d.confidence).toBeGreaterThan(0.7);
    expect(d.answer).toMatch(/Northfield Engineering Ltd holds ISO 9001/);
    expect(d.sources[0]?.kind).toBe("answer");
    expect(d.status).toBe("draft");
  });

  it("answers facts; negative yes/no is never Yes; no match → needs-input", () => {
    const M = baseModel();
    const f = draft(M, {
      id: "q1",
      ref: "1",
      section: "",
      text: "Please state your company number and year of incorporation.",
      type: "text",
      wordLimit: null,
      answer: "",
      status: "blank",
      confidence: 0,
      sources: [],
      hist: [],
    });
    expect(f.answer).toMatch(/04871234/);

    const n = draft(M, {
      id: "q2",
      ref: "2",
      section: "",
      text: "Have you been subject to any HSE enforcement action in the last 5 years? Yes/No",
      type: "yesno",
      wordLimit: null,
      answer: "",
      status: "blank",
      confidence: 0,
      sources: [],
      hist: [],
    });
    expect(n.answer).toMatch(/^No\./);
    expect(n.status).toBe("needs-input");

    const z = draft(M, {
      id: "q3",
      ref: "3",
      section: "",
      text: "Describe your approach to nuclear decommissioning of submarines.",
      type: "text",
      wordLimit: null,
      answer: "",
      status: "blank",
      confidence: 0,
      sources: [],
      hist: [],
    });
    expect(z.answer).toBe("");
    expect(z.status).toBe("needs-input");
  });

  it("respects word limits", () => {
    const M = baseModel();
    const d = draft(M, {
      id: "q1",
      ref: "1",
      section: "",
      text: "Describe your health and safety management system and how it is certified.",
      type: "text",
      wordLimit: 20,
      answer: "",
      status: "blank",
      confidence: 0,
      sources: [],
      hist: [],
    });
    expect(d.answer.split(/\s+/).length).toBeLessThanOrEqual(21);
  });
});

describe("tender-rules workflow", () => {
  it("edit → accept → approve learns into library", () => {
    const M = baseModel();
    const Q = newQuestionnaire(
      M,
      { buyer: "Test Co", title: "T" },
      fromText(
        "1. Describe your approach to apprenticeships and local employment on this contract."
      ),
      "L"
    );
    const q = Q.questions[0]!;
    const before = M.library.answers.length;
    setAnswer(
      M,
      Q.id,
      q.id,
      {
        answer:
          "We will recruit four apprentices from the local area in year one and partner with the local college for a pre-employment programme with guaranteed interviews.",
      },
      "L"
    );
    expect(q.status).toBe("edited");
    accept(M, Q.id, q.id, "L");
    expect(q.status).toBe("accepted");
    expect(() => approve(M, Q.id, [q.id], "V", null, "viewer")).toThrow(
      /approver/
    );
    const r = approve(M, Q.id, [q.id], "M", null, "approver");
    expect(r.approved).toBe(1);
    expect(Q.status).toBe("ready");
    expect(M.library.answers.length).toBe(before + 1);
    expect(M.library.answers[0]!.source?.buyer).toBe("Test Co");
  });

  it("ask a colleague marks needs-input", () => {
    const M = baseModel();
    const Q = newQuestionnaire(
      M,
      { buyer: "B", title: "T" },
      fromText("1. Describe your quality management system."),
      "L"
    );
    const d = draft(M, Q.questions[0]!);
    Object.assign(Q.questions[0]!, {
      answer: d.answer,
      status: d.status,
      confidence: d.confidence,
      sources: d.sources,
    });
    setAnswer(
      M,
      Q.id,
      Q.questions[0]!.id,
      { assignee: "D. Brooks", note: "confirm" },
      "L"
    );
    expect(Q.questions[0]!.status).toBe("needs-input");
    expect(Q.questions[0]!.assignee).toBe("D. Brooks");
  });
});

describe("tender-rules gate and pricing", () => {
  it("computes gate score and canSubmit", () => {
    const M = baseModel();
    const Q = newQuestionnaire(
      M,
      {
        buyer: "Buyer",
        title: "Pack",
        kind: "tender",
        due: iso(addDays(today(), 14)),
        allowEmpty: true,
      },
      { questions: [], header: -1, answerCol: -1 },
      "L"
    );
    Q.requirements = [
      {
        id: "r1",
        ref: "1",
        section: "",
        text: "Shall hold ISO 9001",
        level: "mandatory",
        status: "comply",
        evidence: [{ kind: "certificate", id: "cert-9001", label: "ISO 9001" }],
        note: "",
      },
      {
        id: "r2",
        ref: "2",
        section: "",
        text: "Shall provide 24/7 cover",
        level: "mandatory",
        status: "unassessed",
        evidence: [],
        note: "",
      },
    ];
    Q.pricing = {
      lines: [
        {
          id: "l1",
          description: "Engineer hours",
          unit: "hr",
          qty: 10,
          rate: null,
          category: "Labour",
        },
      ],
      overheadPct: 0,
      marginPct: 0,
      vatPct: 20,
      currency: "GBP",
    };
    const g = gate(M, Q);
    expect(["bid", "review", "no-bid-risk"]).toContain(g.verdict);
    expect(g.issues.some((i) => /unpriced/.test(i.text))).toBe(true);

    setPricing(
      M,
      Q.id,
      {
        lines: Q.pricing.lines.map((l) => ({ ...l, rate: 100 })),
        marginPct: 10,
      },
      "L"
    );
    expect(priceTotals(Q.pricing!).unpriced).toBe(0);

    assessRequirement(M, Q.id, "r1", { status: "no", note: "cannot" }, "L");
    expect(gate(M, Q).verdict).toBe("no-bid-risk");

    expect(() =>
      updateBid(M, Q.id, { submissionEmail: "nope" }, "L")
    ).toThrow(/email/);
    updateBid(M, Q.id, { submissionEmail: "bids@buyer.example" }, "L");
    const cs = canSubmit(M, Q);
    expect(cs.ok).toBe(false);
    expect(cs.errs.some((e) => /not approved|Mandatory|cannot/.test(e))).toBe(
      true
    );
    const pk = submissionPackage(M, Q);
    expect(pk.to).toBe("bids@buyer.example");
    expect(pk.subject).toMatch(/Tender submission/);
  });

  it("analyseDocument classifies pricing and requirements", () => {
    const d1 = analyseDocument("x.docx", "docx", [
      { text: "The contractor shall provide 24/7 cover." },
      { text: "The contractor shall report monthly." },
      { text: "Quality 70% and Price 30%." },
    ]);
    expect(d1.requirements!.length).toBe(2);
    expect(d1.criteria[0]!.weight).toBe(70);

    const d2 = analyseDocument("p.xlsx", "xlsx", null, [
      ["Description", "Qty", "Rate"],
      ["Engineer hours", 10, ""],
    ]);
    expect(d2.kind).toBe("pricing");
    expect(d2.pricing!.lines[0]!.qty).toBe(10);
  });

  it("builds bid blocks and pricing rows", () => {
    const M = baseModel();
    const Q = newQuestionnaire(
      M,
      { buyer: "B", title: "T", kind: "tender", allowEmpty: true },
      { questions: [], header: -1, answerCol: -1 },
      "L"
    );
    Q.requirements = [
      {
        id: "r1",
        ref: "1",
        section: "",
        text: "Shall comply",
        level: "mandatory",
        status: "comply",
        evidence: [],
        note: "",
      },
    ];
    Q.pricing = {
      lines: [
        {
          id: "l1",
          description: "Item",
          unit: "ea",
          qty: 1,
          rate: 10,
          category: "",
        },
      ],
      overheadPct: 0,
      marginPct: 0,
      vatPct: 20,
      currency: "GBP",
    };
    const blocks = bidBlocks(M, Q);
    expect(blocks.some((b) => "h" in b && b.h === "Compliance statement")).toBe(
      true
    );
    const pr = pricingRows(Q);
    expect(pr[0]![0]).toBe("Item");
    expect(pr.some((r) => r[1] === "Gross total")).toBe(true);
  });
});

describe("tender-rules limits", () => {
  it("parses word/char/page limits", () => {
    expect(parseLimit("Describe (max 2,000 characters)")?.kind).toBe("chars");
    expect(parseLimit("Describe (max 2,000 characters)")?.n).toBe(2000);
    expect(parseLimit("Word limit: 300")?.n).toBe(300);
    expect(parseLimit("Limit: 3000 characters including spaces")?.spaces).toBe(
      "incl"
    );
    expect(parseLimit("not exceed 2 sides of A4")?.kind).toBe("pages");
    expect(parseLimit("Provide two pages of drawings")).toBeNull();

    const u = limitUsage("one two three", { kind: "words", n: 2, spaces: null });
    expect(u.over).toBe(true);
    expect(limitLabel({ kind: "pages", n: 2, spaces: null })).toBe(
      "max 2 pages (≈1000 words)"
    );
    expect(wordsOf("one two three")).toBe(3);
  });
});

describe("tender-rules library health", () => {
  it("flags expiring/expired certs and overdue policies", () => {
    const M = baseModel();
    M.library.answers.push({
      id: "ans-stale",
      question: "Stale answer about general quality?",
      answer: "This is a stale approved answer longer than forty characters.",
      tags: ["general"],
      standards: [],
      owner: "L",
      approvedAt: iso(addDays(today(), -400)),
      reviewBy: iso(addDays(today(), -10)),
      uses: 1,
      evidence: [],
      hist: [],
    });
    const h = libraryHealth(M);
    expect(h.certsExpiring.length).toBeGreaterThanOrEqual(1);
    expect(h.certsExpired.length).toBeGreaterThanOrEqual(1);
    expect(h.stale.length).toBeGreaterThanOrEqual(1);
    expect(h.policiesOverdue.length).toBeGreaterThanOrEqual(1);
  });
});

describe("tender office-io", () => {
  it("round-trips xlsx and docx", async () => {
    const x = officeWriteXlsx([
      ["Ref", "Question", "Answer"],
      ["1.1", "Do you hold ISO 9001?", 'Yes & "quoted" <ok>'],
    ]);
    const s = await officeReadXlsx(x);
    expect(s[0]!.rows[1]![2]).toBe('Yes & "quoted" <ok>');

    const d = officeWriteDocx([{ h1: "T" }, { p: "Body & text" }]);
    const ps = await officeReadDocx(d);
    expect(ps.some((p) => p.text === "Body & text")).toBe(true);
  });
});
