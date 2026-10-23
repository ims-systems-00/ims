/**
 * Cast spreadsheet cell values to typed field values for validation/insert.
 */

import type { ImportDateFormat, ImportFieldType } from "../types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseUkDate(raw: string): Date | null {
  const match = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function castImportValue(
  raw: unknown,
  type: ImportFieldType,
  _dateFormat: ImportDateFormat = "DD/MM/YYYY"
): { ok: true; value: unknown } | { ok: false; message: string } {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, value: undefined };
  }

  switch (type) {
    case "string": {
      return { ok: true, value: String(raw).trim() };
    }
    case "email": {
      const value = String(raw).trim();
      if (!EMAIL_RE.test(value)) {
        return { ok: false, message: `"${value}" is not a valid email` };
      }
      return { ok: true, value };
    }
    case "number": {
      if (typeof raw === "number" && Number.isFinite(raw)) {
        return { ok: true, value: raw };
      }
      const value = Number(String(raw).trim().replace(/,/g, ""));
      if (!Number.isFinite(value)) {
        return { ok: false, message: `"${String(raw)}" is not a number` };
      }
      return { ok: true, value };
    }
    case "date": {
      if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
        return { ok: true, value: raw };
      }
      const asString = String(raw).trim();
      const parsed = parseUkDate(asString);
      if (!parsed) {
        return {
          ok: false,
          message: `"${asString}" is not a valid DD/MM/YYYY date`,
        };
      }
      return { ok: true, value: parsed };
    }
    default: {
      return { ok: true, value: raw };
    }
  }
}
