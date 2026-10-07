import { describe, expect, it } from "vitest";
import {
  applyStatusUpdateForToolkit,
  calculateOverviewForToolkit,
  type MutableStatusNode,
} from "../src/modules/compliance/lib/compliance-algorithms";
import { buildCatalogueFromJson } from "../src/modules/compliance/lib/catalogue-builder";

function node(
  partial: Partial<MutableStatusNode> & Pick<MutableStatusNode, "id" | "clause">
): MutableStatusNode {
  return {
    selected: "Not selected",
    state: "Not implemented",
    compliancePercentage: 0,
    numberOfCompliantChildren: 0,
    isLocked: false,
    parentClause: null,
    childrenClauses: [],
    updatedBy: null,
    updatedOn: null,
    ...partial,
  };
}

describe("compliance algorithms", () => {
  it("builds hierarchical parents/children from JSON rows", () => {
    const rows = buildCatalogueFromJson("ISO 9001", [
      { clause: "4", title: "Context", type: "Clause" },
      { clause: "4.1", title: "Understanding", type: "Control" },
      { clause: "4.1.a", title: "Detail", type: "Sub-control" },
    ]);
    expect(rows).toHaveLength(3);
    const root = rows.find((r) => r.clause === "4");
    const mid = rows.find((r) => r.clause === "4.1");
    const leaf = rows.find((r) => r.clause === "4.1.a");
    expect(root?.isLocked).toBe(true);
    expect(root?.childrenClauses).toEqual(["4.1"]);
    expect(mid?.parentClause).toBe("4");
    expect(mid?.isLocked).toBe(true);
    expect(mid?.childrenClauses).toEqual(["4.1.a"]);
    expect(leaf?.isLocked).toBe(false);
    expect(leaf?.parentClause).toBe("4.1");
  });

  it("builds flat catalogues for DSPT / ISO 27002", () => {
    const rows = buildCatalogueFromJson("DSPT", [
      { clause: "1.1.1", title: "A" },
      { clause: "1.1.2", title: "B" },
    ]);
    expect(rows.every((r) => r.parentClause === null && !r.isLocked)).toBe(
      true
    );
  });

  it("rolls up hierarchical compliance to parents and overview", () => {
    const controls: MutableStatusNode[] = [
      node({
        id: "1",
        clause: "4",
        isLocked: true,
        childrenClauses: ["4.1"],
      }),
      node({
        id: "2",
        clause: "4.1",
        isLocked: true,
        parentClause: "4",
        childrenClauses: ["4.1.a"],
      }),
      node({
        id: "3",
        clause: "4.1.a",
        isLocked: false,
        parentClause: "4.1",
      }),
    ];

    applyStatusUpdateForToolkit(
      "ISO 9001",
      "4.1.a",
      "Selected",
      "Implemented",
      controls,
      "user-1"
    );

    const leaf = controls.find((c) => c.clause === "4.1.a")!;
    const mid = controls.find((c) => c.clause === "4.1")!;
    const root = controls.find((c) => c.clause === "4")!;
    expect(leaf.compliancePercentage).toBe(100);
    expect(leaf.state).toBe("Implemented");
    expect(mid.state).toBe("Implemented");
    expect(root.state).toBe("Implemented");
    expect(calculateOverviewForToolkit("ISO 9001", controls).totalPercentage).toBe(
      100
    );
  });

  it("rejects nothing for flat overview math", () => {
    const controls: MutableStatusNode[] = [
      node({ id: "1", clause: "5.1", state: "Implemented", selected: "Selected", compliancePercentage: 100 }),
      node({ id: "2", clause: "5.2" }),
    ];
    expect(calculateOverviewForToolkit("ISO 27002", controls).totalPercentage).toBe(
      50
    );
  });
});
