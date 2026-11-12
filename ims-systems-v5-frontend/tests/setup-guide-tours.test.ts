import { describe, expect, it } from "vitest";
import {
  getSetupStep,
  listAvailableSteps,
  SETUP_STEPS,
} from "@/modules/setup-guide/catalog";
import {
  defaultAliceInviteDrafts,
  defaultAliceOrgDrafts,
  defaultAlicePremiseDrafts,
  isAliceInviteDraftReady,
  isAliceOrgDraftReady,
  isAlicePremiseDraftReady,
  parseAliceUnitLines,
} from "@/modules/setup-guide/lib/parse-units";

describe("Setup Guide catalog", () => {
  it("ships nine available steps through alice", () => {
    expect(SETUP_STEPS).toHaveLength(9);
    expect(listAvailableSteps().map((s) => s.id)).toEqual([
      "org",
      "docs",
      "link",
      "soa",
      "risk",
      "audit",
      "review",
      "remote",
      "alice",
    ]);
    expect(getSetupStep("org")?.completeOn).toBe("org.fu.created");
    expect(getSetupStep("docs")?.completeOn).toBe("docs.document.created");
    expect(getSetupStep("link")?.completeOn).toBe("docs.compliance.linked");
    expect(getSetupStep("soa")?.completeOn).toBe("soa.evidence.attached");
    expect(getSetupStep("risk")?.completeOn).toBe("risks.analysed");
    expect(getSetupStep("audit")?.completeOn).toBe("audits.plan.saved");
    expect(getSetupStep("review")?.completeOn).toBe("reviews.scheduled");
    expect(getSetupStep("remote")?.completeOn).toBe("remote.auditor.invited");
    expect(getSetupStep("alice")?.completeOn).toBe("alice.pinned");
    expect(getSetupStep("remote")?.status).toBe("available");
    expect(getSetupStep("alice")?.status).toBe("available");
  });

  it("maps org sub-steps to data-tour hooks", () => {
    const org = getSetupStep("org");
    expect(org).toBeTruthy();
    const targets = org!.guide.subs.map((s) => s.target).filter(Boolean);
    expect(targets).toEqual([
      "[data-tour='org.fu.register']",
      "[data-tour='org.fu.create']",
      "[data-tour='org.fu.field.access-type']",
      "[data-tour='org.fu.field.name']",
      "[data-tour='org.fu.submit']",
    ]);
  });

  it("maps later steps to data-tour hooks", () => {
    const soa = getSetupStep("soa");
    const risk = getSetupStep("risk");
    const audit = getSetupStep("audit");
    const review = getSetupStep("review");
    const remote = getSetupStep("remote");
    const alice = getSetupStep("alice");
    expect(soa?.guide.subs.map((s) => s.target).filter(Boolean)).toEqual([
      "[data-tour='soa.tabs']",
      "[data-tour='soa.control.selected']",
      "[data-tour='soa.control.selected']",
      "[data-tour='soa.control.state']",
      "[data-tour='soa.control.evidence']",
    ]);
    expect(risk?.guide.subs.map((s) => s.target).filter(Boolean)).toEqual([
      "[data-tour='risks.create']",
      "[data-tour='risks.field.title']",
      "[data-tour='risks.field.owner']",
      "[data-tour='risks.analyse']",
      "[data-tour='risks.sheet']",
    ]);
    expect(audit?.guide.subs.map((s) => s.target).filter(Boolean)).toEqual([
      "[data-tour='audits.create']",
      "[data-tour='audits.field.title']",
      "[data-tour='audits.field.auditor']",
      "[data-tour='audits.field.interval']",
      "[data-tour='audits.assist']",
    ]);
    expect(review?.guide.subs.map((s) => s.target).filter(Boolean)).toEqual([
      "[data-tour='reviews.create']",
      "[data-tour='reviews.field.title']",
      "[data-tour='reviews.field.date']",
      "[data-tour='reviews.field.attendees']",
      "[data-tour='reviews.sheet']",
    ]);
    expect(remote?.guide.subs.map((s) => s.target).filter(Boolean)).toEqual([
      "[data-tour='org.fu.create']",
      "[data-tour='org.fu.field.access-type']",
      "[data-tour='org.fu.field.standards']",
      "[data-tour='org.users.add']",
      "[data-tour='org.users.invite.send']",
    ]);
    expect(alice?.guide.subs.map((s) => s.target).filter(Boolean)).toEqual([
      "[data-tour='alice.fab']",
      "[data-tour='alice.monday']",
      "[data-tour='alice.panel']",
      "[data-tour='alice.pin-monday']",
    ]);
    expect(remote?.aliceCapable).toBe(true);
    expect(alice?.aliceCapable).toBe(true);
  });

  it("seeds repository create and workspace for docs upload coaching", () => {
    const docs = getSetupStep("docs");
    expect(docs?.guide.subs.map((s) => s.seed)).toEqual([
      undefined,
      undefined,
      "repository-create",
      "repository",
      "repository",
    ]);
    expect(docs?.guide.subs[2]?.target).toBe("[data-tour='docs.repo.sheet']");
    expect(docs?.guide.subs[3]?.target).toBe("[data-tour='docs.upload']");
  });

  it("seeds a document before link compliance spotlights", () => {
    const link = getSetupStep("link");
    expect(link?.guide.subs.map((s) => s.seed)).toEqual([
      "document",
      "document",
      "document",
      "document",
    ]);
    expect(link?.guide.subs.map((s) => s.seedTab)).toEqual([
      undefined,
      "compliance-settings",
      "compliance-settings",
      "compliance-settings",
    ]);
    expect(link?.guide.subs[0]?.route).toBeUndefined();
    expect(link?.guide.subs.map((s) => s.target)).toEqual([
      "[data-tour='docs.compliance.tab']",
      "[data-tour='docs.compliance.tab']",
      "[data-tour='docs.compliance.panel']",
      "[data-tour='docs.compliance.panel']",
    ]);
  });

  it("seeds a control before SoA clause spotlights", () => {
    const soa = getSetupStep("soa");
    expect(soa?.guide.subs.map((s) => s.seed)).toEqual([
      undefined,
      "control",
      "control",
      "control",
      "control",
    ]);
    expect(soa?.guide.subs[0]?.route).toBe(
      "/compliance/ISO%209001?tab=toolkit"
    );
    expect(soa?.guide.subs.slice(1).every((s) => !s.route)).toBe(true);
  });

  it("seeds a saved risk before Analyse and treatment", () => {
    const risk = getSetupStep("risk");
    expect(risk?.guide.subs.map((s) => s.seed)).toEqual([
      undefined,
      undefined,
      undefined,
      "risk",
      "risk",
    ]);
    expect(risk?.guide.subs[3]?.target).toBe("[data-tour='risks.analyse']");
    expect(risk?.guide.subs[4]?.target).toBe("[data-tour='risks.sheet']");
  });

  it("seeds a saved audit before Assist & Verification", () => {
    const audit = getSetupStep("audit");
    expect(audit?.guide.subs.map((s) => s.seed)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      "audit",
    ]);
    expect(audit?.guide.subs[4]?.target).toBe("[data-tour='audits.assist']");
  });
});

describe("Alice org drafts", () => {
  it("pre-fills mandatory business-unit fields", () => {
    const drafts = defaultAliceOrgDrafts();
    expect(drafts.length).toBeGreaterThan(0);
    for (const draft of drafts) {
      expect(isAliceOrgDraftReady(draft)).toBe(true);
      expect(draft.accessType).toBe("Internal business function");
      expect(draft.operatingLocation.trim()).not.toBe("");
      expect(draft.responsibility.trim()).not.toBe("");
    }
  });

  it("pre-fills mandatory invite fields", () => {
    const drafts = defaultAliceInviteDrafts();
    expect(drafts.length).toBeGreaterThan(0);
    for (const draft of drafts) {
      expect(isAliceInviteDraftReady(draft)).toBe(true);
      expect(draft.role).toBeTruthy();
    }
  });

  it("pre-fills mandatory premise fields linked to a unit", () => {
    const units = defaultAliceOrgDrafts();
    const drafts = defaultAlicePremiseDrafts(units);
    const unitIds = new Set(units.map((unit) => unit.id));
    expect(drafts.length).toBeGreaterThan(0);
    for (const draft of drafts) {
      expect(isAlicePremiseDraftReady(draft, unitIds)).toBe(true);
      expect(unitIds.has(draft.unitDraftId)).toBe(true);
    }
  });

  it("parses paste lines and defaults missing location", () => {
    const drafts = parseAliceUnitLines(
      "HR Team — The Hive, Oldham\nOperations - Head Office\nHR Team — Dup\n\nQuality"
    );
    expect(drafts.map((d) => d.name)).toEqual([
      "HR Team",
      "Operations",
      "Quality",
    ]);
    expect(drafts[0]?.operatingLocation).toBe("The Hive, Oldham");
    expect(drafts[2]?.operatingLocation).toBe("Head Office");
    expect(drafts.every(isAliceOrgDraftReady)).toBe(true);
  });
});
