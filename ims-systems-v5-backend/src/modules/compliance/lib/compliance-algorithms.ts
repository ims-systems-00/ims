/**
 * Compliance % roll-up algorithms.
 * Ported from V4 complianceManager/manager.js (algo1/V2 hierarchical, algo2 flat).
 */

import {
  FLAT_CALCULATION_TOOLKITS,
  isImplementedState,
  type ComplianceToolkitName,
  type ControlSelected,
  type ControlState,
} from "../types";

export type MutableStatusNode = {
  id: string;
  clause: string;
  selected: ControlSelected;
  state: ControlState;
  compliancePercentage: number;
  numberOfCompliantChildren: number;
  isLocked: boolean;
  parentClause: string | null;
  childrenClauses: string[];
  updatedBy: string | null;
  updatedOn: Date | null;
  /** Marks nodes that must be persisted after roll-up. */
  dirty?: boolean;
};

export type OverviewTotals = {
  totalPercentage: number;
  controlsImplemented: number;
  controlsSelected: number;
};

function isImplemented(state: ControlState): boolean {
  return isImplementedState(state);
}

export function calculateFlatOverview(
  controls: MutableStatusNode[]
): OverviewTotals {
  const totalControls = controls.length;
  const implementedLike = controls.filter((c) => isImplemented(c.state)).length;
  const totalPercentage =
    totalControls === 0
      ? 0
      : Math.round((implementedLike / totalControls) * 100);
  const controlsImplemented = controls.filter(
    (c) => c.state === "Implemented"
  ).length;
  const controlsSelected = controls.filter(
    (c) => c.selected === "Selected"
  ).length;
  return { totalPercentage, controlsImplemented, controlsSelected };
}

/**
 * Overall % for hierarchical toolkits: average of unlocked (leaf) control %.
 */
export function calculateHierarchicalOverview(
  controls: MutableStatusNode[]
): OverviewTotals {
  const leaves = controls.filter((control) => !control.isLocked);
  const targetCompliance = leaves.length * 100;
  const complianceAchieved = leaves.reduce(
    (total, current) => total + current.compliancePercentage,
    0
  );
  const totalPercentage =
    targetCompliance === 0
      ? 0
      : Math.round((complianceAchieved / targetCompliance) * 100);
  const controlsImplemented = controls.filter(
    (c) => c.state === "Implemented"
  ).length;
  const controlsSelected = controls.filter(
    (c) => c.selected === "Selected"
  ).length;
  return { totalPercentage, controlsImplemented, controlsSelected };
}

/**
 * Hierarchical roll-up (V4 `_calculateComplianceAlgoV2`).
 * Mutates `controls` in place and marks dirty nodes.
 */
export function applyHierarchicalStatusUpdate(
  clause: string,
  selected: ControlSelected,
  state: ControlState,
  controls: MutableStatusNode[],
  updatedBy: string | null
): MutableStatusNode {
  const control = controls.find((item) => item.clause === clause);
  if (!control) {
    throw new Error(`Control clause not found: ${clause}`);
  }

  const parentControl = control.parentClause
    ? controls.find((item) => item.clause === control.parentClause)
    : undefined;

  control.dirty = true;
  if (parentControl) parentControl.dirty = true;

  if (control.selected !== selected) {
    control.selected = selected;
    control.updatedBy = updatedBy;
    control.updatedOn = new Date();
  }

  control.state = state;

  if (isImplemented(control.state)) {
    control.compliancePercentage = 100;
    if (parentControl) {
      parentControl.numberOfCompliantChildren =
        parentControl.numberOfCompliantChildren + 1;
    }
  } else {
    const childrenClauses = control.childrenClauses;
    if (childrenClauses.length > 0) {
      const totalChildrenCompliance = childrenClauses.reduce(
        (sum, childClause) => {
          const child = controls.find((c) => c.clause === childClause);
          return sum + (child ? child.compliancePercentage : 0);
        },
        0
      );
      control.compliancePercentage = Math.round(
        (totalChildrenCompliance / (childrenClauses.length * 100)) * 100
      );

      if (control.compliancePercentage === 100) {
        control.state = "Implemented";
        if (parentControl) {
          parentControl.numberOfCompliantChildren =
            parentControl.numberOfCompliantChildren + 1;
        }
      } else if (parentControl) {
        parentControl.numberOfCompliantChildren = Math.max(
          parentControl.numberOfCompliantChildren - 1,
          0
        );
      }
    } else {
      control.compliancePercentage = 0;
      if (parentControl) {
        parentControl.numberOfCompliantChildren = Math.max(
          parentControl.numberOfCompliantChildren - 1,
          0
        );
      }
    }
  }

  if (parentControl) {
    const allChildrenCompliant =
      parentControl.numberOfCompliantChildren ===
        parentControl.childrenClauses.length && Boolean(control.parentClause);

    const parentSelected: ControlSelected = allChildrenCompliant
      ? "Selected"
      : parentControl.compliancePercentage > 0 ||
          parentControl.numberOfCompliantChildren > 0
        ? "Selected"
        : "Not selected";

    const parentState: ControlState = allChildrenCompliant
      ? "Implemented"
      : "Not implemented";

    applyHierarchicalStatusUpdate(
      parentControl.clause,
      parentSelected,
      parentState,
      controls,
      updatedBy
    );
  }

  return control;
}

export function applyFlatStatusUpdate(
  clause: string,
  selected: ControlSelected,
  state: ControlState,
  controls: MutableStatusNode[],
  updatedBy: string | null
): MutableStatusNode {
  const control = controls.find((item) => item.clause === clause);
  if (!control) {
    throw new Error(`Control clause not found: ${clause}`);
  }
  control.dirty = true;
  control.selected = selected;
  control.state = state;
  control.compliancePercentage = isImplemented(state) ? 100 : 0;
  control.updatedBy = updatedBy;
  control.updatedOn = new Date();
  return control;
}

export function calculateOverviewForToolkit(
  toolkitName: ComplianceToolkitName,
  controls: MutableStatusNode[]
): OverviewTotals {
  if (FLAT_CALCULATION_TOOLKITS.has(toolkitName)) {
    return calculateFlatOverview(controls);
  }
  return calculateHierarchicalOverview(controls);
}

export function applyStatusUpdateForToolkit(
  toolkitName: ComplianceToolkitName,
  clause: string,
  selected: ControlSelected,
  state: ControlState,
  controls: MutableStatusNode[],
  updatedBy: string | null
): MutableStatusNode {
  if (FLAT_CALCULATION_TOOLKITS.has(toolkitName)) {
    return applyFlatStatusUpdate(
      clause,
      selected,
      state,
      controls,
      updatedBy
    );
  }
  return applyHierarchicalStatusUpdate(
    clause,
    selected,
    state,
    controls,
    updatedBy
  );
}

/** Section key = first path segment of clause (e.g. "4.2.1" → "4"). */
export function sectionKeyFromClause(clause: string): string {
  const match = /^[^.]+/.exec(clause.trim());
  return match?.[0] ?? clause;
}
