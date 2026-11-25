/**
 * Auditor pack HTML — six evidence sections for print/PDF.
 */
import {
  auditorTable,
  escapeAuditorHtml,
  wrapAuditorPackDocument,
} from "../../../infrastructure/documents/auditor-pack-document";
import { renderAuditorPackPdf } from "../../../infrastructure/documents/auditor-pack-pdf";
import {
  buildSchedule,
  CATEGORIES,
  DEFAULT_SETTINGS,
  readiness,
  stockState,
  type InventoryRulesContext,
} from "./inventory-rules";
import type { InventoryAsset, InventoryStockItem } from "../types";

type PackInput = {
  orgName: string;
  assets: InventoryAsset[];
  stock: InventoryStockItem[];
  settings?: InventoryRulesContext;
  generatedAt?: Date;
};

function packContext(input: PackInput) {
  const settings = input.settings ?? DEFAULT_SETTINGS;
  const at = input.generatedAt ?? new Date();
  const active = input.assets.filter((a) => a.stage !== "Disposed");
  const disposed = input.assets.filter(
    (a) => a.stage === "Disposed" || a.stage === "Retired"
  );
  const schedule = buildSchedule(active, {}, undefined, settings);
  const ready = readiness(input.assets, settings);
  const measuring = schedule.filter(
    (r) => r.category === "Measuring & test equipment"
  );
  const statutory = schedule.filter(
    (r) => r.category !== "Measuring & test equipment"
  );
  const overdue = schedule.filter((r) => r.state === "over").length;
  const readyPass = ready.filter((r) => r.ok).length;
  const readyFail = ready.length - readyPass;
  return {
    settings,
    at,
    active,
    disposed,
    measuring,
    statutory,
    ready,
    overdue,
    readyPass,
    readyFail,
  };
}

export function buildAuditorPackHtml(input: PackInput): string {
  const {
    settings,
    at,
    active,
    disposed,
    measuring,
    statutory,
    ready,
    overdue,
    readyPass,
    readyFail,
  } = packContext(input);

  const registerRows = active
    .map(
      (a) =>
        `<tr><td>${escapeAuditorHtml(a.tag)}</td><td>${escapeAuditorHtml(a.name)}</td><td>${escapeAuditorHtml(a.category)}</td><td>${escapeAuditorHtml(a.location)}</td><td>${escapeAuditorHtml(a.custodian)}</td><td>${escapeAuditorHtml(a.stage)}</td></tr>`
    )
    .join("");

  const calRows = measuring
    .map(
      (r) =>
        `<tr><td>${escapeAuditorHtml(r.tag)}</td><td>${escapeAuditorHtml(r.checkName)}</td><td>${escapeAuditorHtml(r.lastDate ?? "—")}</td><td>${escapeAuditorHtml(r.nextDue ?? "—")}</td><td>${stateCell(r.state)}</td><td>${escapeAuditorHtml(r.lastRef ?? "")}</td></tr>`
    )
    .join("");

  const statRows = statutory
    .map(
      (r) =>
        `<tr><td>${escapeAuditorHtml(r.tag)}</td><td>${escapeAuditorHtml(r.checkName)}</td><td>${escapeAuditorHtml(r.basis)}</td><td>${escapeAuditorHtml(r.nextDue ?? "—")}</td><td>${stateCell(r.state)}</td></tr>`
    )
    .join("");

  const dispRows = disposed
    .map((a) => {
      const d = a.disposal;
      return `<tr><td>${escapeAuditorHtml(a.tag)}</td><td>${escapeAuditorHtml(a.name)}</td><td>${escapeAuditorHtml(a.stage)}</td><td>${escapeAuditorHtml(d?.reason ?? "")}</td><td>${escapeAuditorHtml(d?.route ?? "")}</td><td>${escapeAuditorHtml(d?.evidence ?? "")}</td><td>${escapeAuditorHtml(d?.approvedBy ?? "")}</td></tr>`;
    })
    .join("");

  const stockRows = input.stock
    .map((s) => {
      const st = stockState(s, settings.leadDays);
      return `<tr><td>${escapeAuditorHtml(s.code)}</td><td>${escapeAuditorHtml(s.name)}</td><td>${s.qty}</td><td>${s.min}/${s.max}</td><td>${escapeAuditorHtml(s.batch)}</td><td>${escapeAuditorHtml(s.expiry ?? "—")}</td><td>${stateCell(st)}</td></tr>`;
    })
    .join("");

  const readyRows = ready
    .map(
      (r) =>
        `<tr><td>${r.ok ? '<span class="tag tag-ok">Pass</span>' : '<span class="tag tag-bad">Gap</span>'}</td><td>${escapeAuditorHtml(r.label)}</td><td>${escapeAuditorHtml(r.detail)}</td></tr>`
    )
    .join("");

  const mapRows = CATEGORIES.map((c) => {
    const checks = c.checks
      .map((ch) => `${ch.name} (${ch.intervalMonths || "each-use"} mo)`)
      .join("; ");
    return `<tr><td>${escapeAuditorHtml(c.name)}</td><td>${escapeAuditorHtml(c.standards.join(", "))}</td><td>${escapeAuditorHtml(checks)}</td></tr>`;
  }).join("");

  return wrapAuditorPackDocument({
    orgName: input.orgName,
    documentTitle: "Inventory & assets auditor pack",
    moduleLabel: "Inventory & assets",
    purpose:
      "Evidence pack covering the asset register, calibration and statutory inspection status, disposals, consumables and self-check readiness.",
    generatedAt: at,
    summary: [
      { label: "Active assets", value: active.length, tone: "neutral" },
      {
        label: "Overdue checks",
        value: overdue,
        tone: overdue ? "bad" : "ok",
      },
      { label: "Consumables", value: input.stock.length, tone: "neutral" },
      {
        label: "Readiness",
        value: `${readyPass}/${ready.length}`,
        tone: readyFail ? "warn" : "ok",
      },
    ],
    sections: [
      {
        number: "01",
        title: "Asset register",
        intro: "Live assets currently held on the organisation register.",
        bodyHtml: auditorTable(
          ["Tag", "Name", "Category", "Location", "Custodian", "Stage"],
          registerRows
        ),
      },
      {
        number: "02",
        title: "Calibration status",
        intro: "Measuring and test equipment calibration due dates and certificates.",
        bodyHtml: auditorTable(
          ["Tag", "Check", "Last", "Next", "State", "Certificate"],
          calRows
        ),
      },
      {
        number: "03",
        title: "Statutory inspections",
        intro: "Non-calibration statutory and planned inspection schedule.",
        bodyHtml: auditorTable(
          ["Tag", "Check", "Basis", "Next", "State"],
          statRows
        ),
      },
      {
        number: "04",
        title: "Disposals & retirements",
        intro: "Assets removed from service with route and approval evidence.",
        bodyHtml: auditorTable(
          [
            "Tag",
            "Name",
            "Stage",
            "Reason",
            "Route",
            "Evidence",
            "Approved",
          ],
          dispRows
        ),
      },
      {
        number: "05",
        title: "Consumables",
        intro: "Stock levels, batch identity and expiry controls.",
        bodyHtml: auditorTable(
          ["Code", "Item", "Qty", "Min/Max", "Batch", "Expiry", "State"],
          stockRows
        ),
      },
      {
        number: "06",
        title: "Self-check & compliance map",
        intro: "Audit readiness checklist and category-to-standard mapping.",
        bodyHtml: `${auditorTable(
          ["Result", "Control", "Detail"],
          readyRows
        )}<p class="footnote">Compliance map</p>${auditorTable(
          ["Category", "Standards", "Checks"],
          mapRows
        )}`,
      },
    ],
  });
}

function stateCell(state: string): string {
  const s = String(state || "").toLowerCase();
  if (s === "ok" || s === "in date" || s === "pass") {
    return `<span class="ok">${escapeAuditorHtml(state)}</span>`;
  }
  if (s === "soon" || s === "low" || s === "expsoon" || s === "due") {
    return `<span class="warn">${escapeAuditorHtml(state)}</span>`;
  }
  if (
    s === "over" ||
    s === "overdue" ||
    s === "expired" ||
    s === "out" ||
    s === "none"
  ) {
    return `<span class="bad">${escapeAuditorHtml(state)}</span>`;
  }
  return escapeAuditorHtml(state);
}

export async function buildAuditorPackPdf(
  input: PackInput
): Promise<Buffer> {
  const {
    settings,
    at,
    active,
    disposed,
    measuring,
    statutory,
    ready,
    overdue,
    readyPass,
  } = packContext(input);

  const asOf = at.toISOString().slice(0, 10);
  return renderAuditorPackPdf({
    orgName: input.orgName,
    documentTitle: "Inventory & assets auditor pack",
    moduleLabel: "Inventory & assets",
    asOf,
    summary: [
      { label: "Active assets", value: active.length },
      { label: "Overdue checks", value: overdue },
      { label: "Consumables", value: input.stock.length },
      { label: "Readiness", value: `${readyPass}/${ready.length}` },
    ],
    sections: [
      {
        number: "01",
        title: "Asset register",
        lines: active.map(
          (a) =>
            `${a.tag} · ${a.name} · ${a.category} · ${a.location} · ${a.custodian} · ${a.stage}`
        ),
      },
      {
        number: "02",
        title: "Calibration status",
        lines: measuring.map(
          (r) =>
            `${r.tag} · ${r.checkName} · last ${r.lastDate ?? "—"} · next ${r.nextDue ?? "—"} · ${r.state}${r.lastRef ? ` · ${r.lastRef}` : ""}`
        ),
      },
      {
        number: "03",
        title: "Statutory inspections",
        lines: statutory.map(
          (r) =>
            `${r.tag} · ${r.checkName} · ${r.basis} · next ${r.nextDue ?? "—"} · ${r.state}`
        ),
      },
      {
        number: "04",
        title: "Disposals & retirements",
        lines: disposed.map((a) => {
          const d = a.disposal;
          return `${a.tag} · ${a.name} · ${a.stage} · ${d?.reason || "—"} · ${d?.route || "—"} · approved ${d?.approvedBy || "—"}`;
        }),
      },
      {
        number: "05",
        title: "Consumables",
        lines: input.stock.map((s) => {
          const st = stockState(s, settings.leadDays);
          return `${s.code} · ${s.name} · qty ${s.qty} (${s.min}/${s.max}) · batch ${s.batch || "—"} · exp ${s.expiry ?? "—"} · ${st}`;
        }),
      },
      {
        number: "06",
        title: "Self-check & compliance map",
        lines: [
          ...ready.map(
            (r) => `${r.ok ? "[PASS]" : "[GAP]"} ${r.label} — ${r.detail}`
          ),
          ...CATEGORIES.map((c) => {
            const checks = c.checks
              .map((ch) => `${ch.name} (${ch.intervalMonths || "each-use"} mo)`)
              .join("; ");
            return `${c.name} · ${c.standards.join(", ")} · ${checks}`;
          }),
        ],
      },
    ],
  });
}

/** Used by compliance map UI — same category defs as pack. */
export function complianceMapRows(settings?: InventoryRulesContext) {
  return CATEGORIES.map((c) => {
    const overrides = settings?.categoryOverrides?.[c.name];
    const checks = overrides?.length ? overrides : c.checks;
    return {
      id: c.id,
      name: c.name,
      standards: c.standards,
      checks,
    };
  });
}
