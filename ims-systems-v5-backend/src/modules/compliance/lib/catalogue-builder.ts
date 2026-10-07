/**
 * Build hierarchical / flat control catalogue rows from seed JSON.
 * Mirrors V4 initIsoModule algorithms against lowercase JSON exports.
 */

import type { ComplianceToolkitName } from "../types";
import { FLAT_CALCULATION_TOOLKITS } from "../types";

export type CatalogueSeedRow = {
  clause: string;
  title: string;
  description: string;
  annex: string;
  note: string;
  isLocked: boolean;
  parentClause: string | null;
  childrenClauses: string[];
  moreInfo: Record<string, unknown> | null;
};

type RawCatalogueRow = Record<string, unknown>;

function asString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeRawRow(row: RawCatalogueRow): {
  clause: string;
  title: string;
  description: string;
  annex: string;
  note: string;
  type: string;
  applicableModulesLabel: string;
  applicableModules: string[];
  appliesTo: string;
} | null {
  const clause = asString(row.clause ?? row.Clause);
  if (!clause) return null;
  const applicableRaw = asString(
    row.applicable_modules ?? row.Applicable_modules
  );
  return {
    clause,
    title: asString(row.title ?? row.Title),
    description: asString(row.description ?? row.Description),
    annex: asString(row.annex ?? row.Annex),
    note: asString(row.note ?? row.Note),
    type: asString(row.type ?? row.Type),
    applicableModulesLabel: asString(
      row.applicable_modules_label ?? row.Applicable_modules_label
    ),
    applicableModules: applicableRaw
      ? applicableRaw.split(",").map((part) => part.trim()).filter(Boolean)
      : [],
    appliesTo: asString(row.applies_to ?? row.Applies_to),
  };
}

/**
 * V4 hierarchical parent detection: clause matching /^[\S]+[.]/ has a parent
 * equal to the matched prefix without the trailing dot.
 */
function inferParentClause(clause: string): string | null {
  const match = /^[\S]+[.]/.exec(clause);
  if (!match) return null;
  return match[0].slice(0, match[0].length - 1);
}

function buildFlat(rows: ReturnType<typeof normalizeRawRow>[]): CatalogueSeedRow[] {
  return rows
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .map((row) => ({
      clause: row.clause,
      title: row.title,
      description: row.description,
      annex: row.annex,
      note: row.note,
      isLocked: false,
      parentClause: null,
      childrenClauses: [],
      moreInfo: {
        note: row.note || undefined,
        type: row.type || undefined,
        appliesTo: row.appliesTo || undefined,
        applicableModules: row.applicableModules,
        applicableModulesLabel: row.applicableModulesLabel || undefined,
      },
    }));
}

function buildHierarchical(
  rows: ReturnType<typeof normalizeRawRow>[]
): CatalogueSeedRow[] {
  const module: CatalogueSeedRow[] = [];

  for (const row of rows) {
    if (!row) continue;
    const moreInfo = {
      note: row.note || undefined,
      type: row.type || undefined,
      appliesTo: row.appliesTo || undefined,
      applicableModules: row.applicableModules,
      applicableModulesLabel: row.applicableModulesLabel || undefined,
    };

    const parentClause = inferParentClause(row.clause);
    if (parentClause) {
      const parent = module.find((item) => item.clause === parentClause);
      if (parent) {
        const control: CatalogueSeedRow = {
          clause: row.clause,
          title: row.title,
          description: row.description,
          annex: row.annex,
          note: row.note,
          isLocked: false,
          parentClause: parent.clause,
          childrenClauses: [],
          moreInfo,
        };
        parent.childrenClauses.push(control.clause);
        parent.isLocked = true;
        module.push(control);
        continue;
      }
    }

    module.push({
      clause: row.clause,
      title: row.title,
      description: row.description,
      annex: row.annex,
      note: row.note,
      isLocked: true,
      parentClause: null,
      childrenClauses: [],
      moreInfo,
    });
  }

  // Leaves with no children stay unlocked; roots without children become unlocked.
  for (const item of module) {
    if (item.childrenClauses.length === 0) {
      item.isLocked = false;
    }
  }

  return module;
}

export function buildCatalogueFromJson(
  toolkitName: ComplianceToolkitName,
  raw: unknown
): CatalogueSeedRow[] {
  if (!Array.isArray(raw)) {
    throw new Error(`Catalogue for ${toolkitName} must be a JSON array`);
  }
  const normalized = raw.map((row) =>
    normalizeRawRow((row ?? {}) as RawCatalogueRow)
  );
  if (FLAT_CALCULATION_TOOLKITS.has(toolkitName)) {
    return buildFlat(normalized);
  }
  return buildHierarchical(normalized);
}

/** Map toolkit display name → V4 scripts/data/compliance/*.json basename. */
export const TOOLKIT_JSON_FILES: Record<ComplianceToolkitName, string> = {
  DSPT: "dspt-nhs.json",
  "ISO 27001": "iso27001.json",
  "ISO 27001 (2022)": "iso27001-2022.json",
  "ISO 27001 (2022 Annex A)": "iso27001-2022-annex-a.json",
  "ISO 27002": "iso27002.json",
  "ISO 9001": "iso9001.json",
  "ISO 45001": "iso45001.json",
  "ISO 20000": "iso20000.json",
  "BS 9997": "bs9997.json",
  "ISO 14001": "iso14001.json",
  "ISO 15686-5": "iso15686-5.json",
  "ESG Toolkit - Environmental": "esg-toolkit-environmental.json",
  "ESG Toolkit - Social": "esg-toolkit-social.json",
  "ESG Toolkit - Governance": "esg-toolkit-governance.json",
  "Building Safety Act": "building-safety-act.json",
};
