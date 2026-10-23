/**
 * Minimal CSV parser (RFC4180-ish) — no PapaParse dependency.
 * First row = headers; remaining rows become objects keyed by header.
 */

import type { ImportDataRow } from "../types";

function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const pushCell = () => {
    row.push(cell);
    cell = "";
  };
  const pushRow = () => {
    // Skip trailing empty lines
    if (row.length === 1 && row[0] === "" && rows.length > 0) {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      pushCell();
    } else if (ch === "\n") {
      pushCell();
      pushRow();
    } else if (ch === "\r") {
      // ignore; handle \r\n via \n
    } else {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    pushCell();
    pushRow();
  }

  return rows;
}

export type ParsedCsv = {
  columns: string[];
  rows: ImportDataRow[];
};

/**
 * Parse a CSV string into header columns + row objects.
 * Duplicate headers get a numeric suffix to remain unique.
 */
export function parseCsv(text: string): ParsedCsv {
  const table = parseCsvText(text.replace(/^\uFEFF/, ""));
  if (table.length === 0) {
    return { columns: [], rows: [] };
  }

  const rawHeaders = table[0]!.map((h) => h.trim());
  const seen = new Map<string, number>();
  const columns = rawHeaders.map((header) => {
    const base = header || "Column";
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });

  const rows: ImportDataRow[] = [];
  for (let r = 1; r < table.length; r += 1) {
    const cells = table[r]!;
    if (cells.every((c) => c.trim() === "")) continue;
    const row: ImportDataRow = {};
    for (let c = 0; c < columns.length; c += 1) {
      row[columns[c]!] = (cells[c] ?? "").trim();
    }
    rows.push(row);
  }

  return { columns, rows };
}

export async function parseCsvFile(file: File): Promise<ParsedCsv> {
  const text = await file.text();
  return parseCsv(text);
}
