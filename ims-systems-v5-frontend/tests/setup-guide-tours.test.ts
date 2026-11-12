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
  it("ships nine steps with org, docs, link, soa and risk available", () => {
    expect(SETUP_STEPS).toHaveLength(9);
    expect(listAvailableSteps().map((s) => s.id)).toEqual([
      "org",
      "docs",
      "link",
      "soa",
      "risk",
    ]);
    expect(getSetupStep("org")?.completeOn).toBe("org.fu.created");
    expect(getSetupStep("docs")?.completeOn).toBe("docs.document.created");
    expect(getSetupStep("link")?.completeOn).toBe("docs.compliance.linked");
    expect(getSetupStep("soa")?.completeOn).toBe("soa.evidence.attached");
    expect(getSetupStep("risk")?.completeOn).toBe("risks.analysed");
    expect(getSetupStep("docs")?.status).toBe("available");
    expect(getSetupStep("link")?.status).toBe("available");
    expect(getSetupStep("soa")?.status).toBe("available");
    expect(getSetupStep("risk")?.status).toBe("available");
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

  it("maps soa and risk sub-steps to data-tour hooks", () => {
    const soa = getSetupStep("soa");
    const risk = getSetupStep("risk");
    expect(soa?.guide.subs.map((s) => s.target).filter(Boolean)).toEqual([
      "[data-tour='soa.tabs']",
      "[data-tour='soa.controls']",
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
    expect(soa?.aliceCapable).toBe(true);
    expect(risk?.aliceCapable).toBe(true);
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
