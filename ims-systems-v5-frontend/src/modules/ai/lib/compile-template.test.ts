import { describe, expect, it } from "vitest";
import { compileAnalyserTemplate, compileTemplate } from "./compile-template";

describe("compileTemplate", () => {
  it("replaces nested local placeholders", () => {
    const result = compileTemplate(
      "Org: <= local.organisation.name => · Risk: <= local.risk.title =>",
      {
        organisation: { name: "Acme" },
        risk: { title: "Fire risk" },
      }
    );
    expect(result).toBe("Org: Acme · Risk: Fire risk");
  });

  it("compiles analyser template sections", () => {
    const compiled = compileAnalyserTemplate(
      {
        dataDisplay: "#### <= local.reference =>",
        context: "Title: <= local.title =>",
        reportStructure: [
          {
            name: "Root cause",
            description: "About <= local.title =>",
            prompt: "Analyse <= local.reference =>",
            response: "",
          },
        ],
      },
      { reference: "INC-1", title: "Spill" }
    );
    expect(compiled.dataDisplay).toContain("INC-1");
    expect(compiled.context).toContain("Spill");
    expect(compiled.reportStructure[0]?.prompt).toBe("Analyse INC-1");
  });
});
