import { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { FileDropZone } from "@/modules/files";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import {
  useClearExemptionMutation,
  useCreateRecordMutation,
  useSetExemptionMutation,
  useTrainingMatrixQuery,
} from "../hooks/use-training";
import {
  encodeTrainingFileId,
  openTrainingEvidence,
} from "../lib/file-id";
import {
  cellIcon,
  cellLabel,
  formatDate,
  initialsFromName,
  todayIso,
  validityLeft,
} from "../lib/training-display";
import type {
  MatrixCell,
  MatrixPersonRow,
  TrainingCellState,
  TrainingCompetency,
} from "../types";
import { TrainingCellBadge } from "./training-badges";
import { PageLoader } from "@/shared/components/ims-loader";

type TrainingMatrixPanelProps = {
  onOpenPerson: (id: string) => void;
  canEdit?: boolean;
};

type CellPick = {
  personId: string;
  personName: string;
  cid: string;
  cell: MatrixCell;
};

type TipState = {
  text: string;
  x: number;
  y: number;
};

const LEGEND: Array<{
  st: TrainingCellState | "des";
  label: string;
}> = [
  { st: "ok", label: "In date" },
  { st: "soon", label: "Due soon" },
  { st: "over", label: "Expired" },
  { st: "none", label: "Missing" },
  { st: "grace", label: "Induction window" },
  { st: "na", label: "N/A" },
  { st: "des", label: "Desirable" },
];

function tipText(compName: string, cell: MatrixCell): string {
  const base = `${compName}: ${cellLabel(cell.st)}`;
  if (cell.st === "na" && cell.reason) {
    return `${base} — ${cell.reason}`;
  }
  if (cell.rec?.date) {
    const done = formatDate(cell.rec.date);
    if (cell.next) {
      const days =
        cell.days != null
          ? ` (${cell.days} day${cell.days === 1 ? "" : "s"})`
          : "";
      return `${base} · done ${done} · expires ${formatDate(cell.next)}${days}`;
    }
    return `${base} · done ${done}`;
  }
  return base;
}

function MatrixCellButton({
  cell,
  comp,
  onOpen,
  onTip,
}: {
  cell: MatrixCell;
  comp: TrainingCompetency;
  onOpen: () => void;
  onTip: (tip: TipState | null) => void;
}) {
  const st = cell.st;
  const desirable = cell.req.level === "desirable";
  const left =
    st === "ok"
      ? validityLeft(cell.req.comp.months, cell.days) * 100
      : 100;

  return (
    <button
      type="button"
      aria-label={tipText(comp.name, cell)}
      className={cn(
        "training-cellb relative inline-grid size-[26px] place-items-center rounded-lg border-0 font-bold text-white transition-transform duration-100 hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        st === "ok" && "shadow-none",
        st === "soon" && "bg-[#E0A030] hover:shadow-[0_6px_16px_rgba(224,160,48,0.4)]",
        st === "over" && "bg-[#C2410C] hover:shadow-[0_6px_16px_rgba(194,65,12,0.35)]",
        st === "none" &&
          "border-[1.5px] border-[#F3B7A3] bg-[#FDE8E0] text-[#C2410C]",
        st === "grace" &&
          "border-[1.5px] border-dashed border-[#C9CBE0] bg-[#EEF0F6] text-muted-foreground",
        st === "na" &&
          "bg-[#F3F4F8] text-[8px] tracking-wide text-[#9A9EB8]",
        desirable && "ring-2 ring-[#C9C2FF] ring-offset-1 ring-offset-background"
      )}
      style={
        st === "ok"
          ? {
              background: `conic-gradient(#1B8F5A ${left}%, #BFE6D0 0)`,
            }
          : undefined
      }
      onMouseEnter={(e) => {
        onTip({
          text: tipText(comp.name, cell),
          x: e.clientX,
          y: e.clientY,
        });
      }}
      onMouseMove={(e) => {
        onTip({
          text: tipText(comp.name, cell),
          x: e.clientX,
          y: e.clientY,
        });
      }}
      onMouseLeave={() => onTip(null)}
      onClick={() => {
        onTip(null);
        onOpen();
      }}
    >
      {st === "ok" ? (
        <span className="absolute inset-[3px] grid place-items-center rounded-[5px] bg-[#1B8F5A] text-[12px] leading-none">
          ✓
        </span>
      ) : (
        <span className={cn(st === "na" ? "text-[8px]" : "text-[12px] leading-none")}>
          {cellIcon(st)}
        </span>
      )}
    </button>
  );
}

function LegendChip({
  st,
  label,
}: {
  st: TrainingCellState | "des";
  label: string;
}) {
  if (st === "des") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="inline-grid size-[18px] place-items-center rounded-md border border-[#E6E8F0] bg-transparent ring-2 ring-[#C9C2FF] ring-offset-1" />
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className={cn(
          "inline-grid size-[18px] place-items-center rounded-md text-[10px] font-bold text-white",
          st === "ok" && "bg-[#1B8F5A]",
          st === "soon" && "bg-[#E0A030]",
          st === "over" && "bg-[#C2410C]",
          st === "none" &&
            "border border-[#F3B7A3] bg-[#FDE8E0] text-[#C2410C]",
          st === "grace" &&
            "border border-dashed border-[#C9CBE0] bg-[#EEF0F6] text-muted-foreground",
          st === "na" && "bg-[#F3F4F8] text-[7px] text-[#9A9EB8]"
        )}
      >
        {cellIcon(st)}
      </span>
      {label}
    </span>
  );
}

export function TrainingMatrixPanel({
  onOpenPerson,
  canEdit = true,
}: TrainingMatrixPanelProps) {
  const matrixQuery = useTrainingMatrixQuery();
  const createRecord = useCreateRecordMutation();
  const setExempt = useSetExemptionMutation();
  const clearExempt = useClearExemptionMutation();

  const [pick, setPick] = useState<CellPick | null>(null);
  const [date, setDate] = useState(todayIso());
  const [result, setResult] = useState<"Pass" | "Pass with observations" | "Fail">(
    "Pass"
  );
  const [provider, setProvider] = useState("");
  const [ref, setRef] = useState("");
  const [fileId, setFileId] = useState<string | null>(null);
  const [dropKey, setDropKey] = useState(0);
  const [naReason, setNaReason] = useState("");
  const [tip, setTip] = useState<TipState | null>(null);
  const [siteFilter, setSiteFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [gapsOnly, setGapsOnly] = useState(false);
  const [hl, setHl] = useState<{ row?: string; col?: string }>({});

  const data = matrixQuery.data;
  const comps = useMemo(
    () => (data?.competencies ?? []).filter((c) => !c.archived),
    [data]
  );
  const roles = data?.roles ?? [];
  const roleName = (id: string) =>
    roles.find((r) => r.id === id || r.key === id)?.name ?? id;

  const sites = useMemo(() => {
    const set = new Set<string>();
    for (const row of data?.people ?? []) {
      if (row.person.site) set.add(row.person.site);
    }
    return [...set].sort();
  }, [data]);

  const rows = useMemo(() => {
    let list = data?.people ?? [];
    if (siteFilter) {
      list = list.filter((r) => r.person.site === siteFilter);
    }
    if (roleFilter) {
      list = list.filter((r) => (r.person.roles || []).includes(roleFilter));
    }
    if (gapsOnly) {
      list = list.filter(
        (r) =>
          r.summary.over > 0 ||
          r.summary.none > 0 ||
          r.summary.soon > 0 ||
          r.summary.grace > 0
      );
    }
    return list;
  }, [data, siteFilter, roleFilter, gapsOnly]);

  const colStats = useMemo(() => {
    return comps.map((c) => {
      let holders = 0;
      let needers = 0;
      for (const row of rows) {
        const cell = row.cells.find(
          (x) => x.req.comp.id === c.id || x.req.cid === c.id
        );
        if (!cell || cell.st === "na" || cell.req.level === "exempt") continue;
        needers += 1;
        if (cell.st === "ok" || cell.st === "soon") holders += 1;
      }
      const pct = needers ? holders / needers : 1;
      return { holders, needers, pct };
    });
  }, [comps, rows]);

  function cellFor(
    row: MatrixPersonRow,
    cid: string
  ): MatrixCell | undefined {
    return row.cells.find((c) => c.req.cid === cid || c.req.comp.id === cid);
  }

  function openCell(row: MatrixPersonRow, cid: string, cell: MatrixCell) {
    setPick({
      personId: row.person.id,
      personName: row.person.name,
      cid,
      cell,
    });
    setDate(todayIso());
    setResult("Pass");
    setProvider("");
    setRef("");
    setFileId(null);
    setDropKey((k) => k + 1);
    setNaReason("");
  }

  async function saveRecord() {
    if (!pick) return;
    if (
      pick.cell.req.comp.evidence === "Certificate" &&
      result !== "Fail" &&
      !ref.trim() &&
      !fileId
    ) {
      notify.error("Certificate courses need a reference or uploaded file");
      return;
    }
    try {
      await createRecord.mutateAsync({
        personId: pick.personId,
        cid: pick.cid,
        date,
        result,
        provider: provider.trim() || undefined,
        ref: ref.trim() || undefined,
        fileId,
      });
      notify.success("Result recorded");
      setPick(null);
      setFileId(null);
    } catch (error) {
      notify.fromError(error, "Unable to record result");
    }
  }

  async function markNa() {
    if (!pick) return;
    if (!naReason.trim()) {
      notify.error("A reason is required for N/A");
      return;
    }
    try {
      await setExempt.mutateAsync({
        id: pick.personId,
        cid: pick.cid,
        reason: naReason.trim(),
      });
      notify.success("Marked N/A");
      setPick(null);
      setNaReason("");
    } catch (error) {
      notify.fromError(error, "Unable to mark N/A");
    }
  }

  async function restore() {
    if (!pick) return;
    try {
      await clearExempt.mutateAsync({
        id: pick.personId,
        cid: pick.cid,
      });
      notify.success("Requirement restored");
      setPick(null);
    } catch (error) {
      notify.fromError(error, "Unable to restore");
    }
  }

  if (matrixQuery.isLoading) {
    return (
      <PageLoader label="Loading matrix…" />
    );
  }

  if (!data) {
    return (
      <EmptyState
        title="Matrix unavailable"
        description="Could not load the training matrix."
      />
    );
  }

  if ((data.people ?? []).length === 0) {
    return (
      <EmptyState
        title="No active people"
        description="Add people to the register to populate the matrix."
      />
    );
  }

  const pending =
    createRecord.isPending || setExempt.isPending || clearExempt.isPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Training matrix
          </h2>
          <p className="text-sm text-muted-foreground">
            Click a cell for details and actions. Hover for a quick summary.
            Ring = validity remaining.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="ims-select ims-field h-9 w-auto min-w-[8rem] text-sm"
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
          >
            <option value="">All sites</option>
            {sites.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className="ims-select ims-field h-9 w-auto min-w-[8rem] text-sm"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All roles</option>
            {roles
              .filter((r) => r.key !== "all")
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
          </select>
          <label className="inline-flex h-9 items-center gap-2 rounded-md border border-border-subtle bg-card px-3 text-sm">
            <input
              type="checkbox"
              checked={gapsOnly}
              onChange={(e) => setGapsOnly(e.target.checked)}
            />
            Gaps only
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border-subtle bg-card px-4 py-2.5">
        {LEGEND.map((item) => (
          <LegendChip key={item.st} st={item.st} label={item.label} />
        ))}
      </div>

      <div className="training-matrixbox max-h-[72vh] overflow-auto rounded-xl border border-border-subtle bg-card">
        <table className="training-matrix w-max min-w-full border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 min-w-[13rem] max-w-[15rem] border-b border-r border-border-subtle bg-card px-3 pb-2.5 pt-3 text-left align-bottom">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Person
                  </span>
                  <span className="text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                    {rows.length} shown
                  </span>
                </div>
              </th>
              {comps.map((c, i) => {
                const stat = colStats[i]!;
                const barColor =
                  stat.pct >= 0.9
                    ? "#1B8F5A"
                    : stat.pct >= 0.6
                      ? "#E0A030"
                      : "#C2410C";
                return (
                  <th
                    key={c.id}
                    className={cn(
                      "sticky top-0 z-20 h-[200px] w-10 min-w-10 max-w-10 overflow-hidden border-b border-border-subtle bg-card p-0 align-bottom",
                      hl.col === c.id && "bg-[#F3F2FF]"
                    )}
                    title={`${c.name}: ${stat.holders} of ${stat.needers} hold it`}
                  >
                    <div className="mx-auto flex h-full w-10 flex-col items-center justify-end gap-2 overflow-hidden pb-2">
                      <div
                        className="flex h-9 w-1.5 shrink-0 items-end overflow-hidden rounded bg-[#EEF0F6]"
                        aria-hidden
                      >
                        <i
                          className="block w-full rounded"
                          style={{
                            height: `${Math.round(stat.pct * 100)}%`,
                            background: barColor,
                          }}
                        />
                      </div>
                      <div className="flex h-[140px] w-full shrink-0 items-center justify-center overflow-hidden">
                        <span
                          className={cn(
                            "max-h-[140px] overflow-hidden text-ellipsis whitespace-nowrap text-center text-[11px] font-semibold leading-none text-foreground [writing-mode:vertical-rl] [transform:rotate(180deg)]",
                            hl.col === c.id && "text-primary"
                          )}
                        >
                          {c.name}
                        </span>
                      </div>
                    </div>
                  </th>
                );
              })}
              <th className="sticky top-0 z-20 w-[92px] min-w-[92px] border-b border-border-subtle bg-card px-2 pb-2.5 text-left align-bottom">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Compliance
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const s = row.summary;
              const pct = s.total
                ? Math.round(((s.ok + s.soon) / s.total) * 100)
                : 100;
              const ringCol =
                pct === 100 && !s.soon
                  ? "#1B8F5A"
                  : s.over + s.none
                    ? "#C2410C"
                    : "#E0A030";
              const ringPct = s.total ? ((s.ok + s.soon) / s.total) * 100 : 100;
              const okShare = s.total ? (s.ok / s.total) * 100 : 100;
              const soonShare = s.total ? (s.soon / s.total) * 100 : 0;
              const badShare = s.total
                ? ((s.over + s.none + s.grace) / s.total) * 100
                : 0;
              const roleLabel = (row.person.roles || [])
                .map((id) => roleName(id))
                .filter(Boolean)
                .join(", ");

              return (
                <tr
                  key={row.person.id}
                  className="group"
                  onMouseLeave={() => setHl({})}
                >
                  <td
                    className={cn(
                      "sticky left-0 z-10 border-b border-r border-border-subtle bg-card px-3 py-2",
                      hl.row === row.person.id && "bg-[#F7F7FD]"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        className="grid size-[38px] shrink-0 place-items-center rounded-full"
                        style={{
                          background: `conic-gradient(${ringCol} ${ringPct}%, #E6E8F0 0)`,
                        }}
                        title={`${pct}% compliant`}
                        onClick={() => onOpenPerson(row.person.id)}
                      >
                        <i className="grid size-[30px] place-items-center rounded-full bg-card text-[11px] font-bold not-italic text-foreground">
                          {initialsFromName(row.person.name)}
                        </i>
                      </button>
                      <div className="min-w-0">
                        <button
                          type="button"
                          className="block truncate text-left text-[13px] font-semibold hover:text-primary"
                          onClick={() => onOpenPerson(row.person.id)}
                        >
                          {row.person.name}
                        </button>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {roleLabel || row.person.site || "—"}
                        </span>
                      </div>
                    </div>
                  </td>
                  {comps.map((c) => {
                    const cell = cellFor(row, c.id);
                    const highlighted =
                      hl.row === row.person.id || hl.col === c.id;
                    return (
                      <td
                        key={c.id}
                        className={cn(
                          "w-10 min-w-10 max-w-10 border-b border-border-subtle px-0 py-1 text-center",
                          highlighted && "bg-[#F3F2FF]"
                        )}
                        onMouseEnter={() =>
                          setHl({ row: row.person.id, col: c.id })
                        }
                      >
                        {cell ? (
                          <MatrixCellButton
                            cell={cell}
                            comp={c}
                            onOpen={() => openCell(row, c.id, cell)}
                            onTip={setTip}
                          />
                        ) : (
                          <span
                            className="inline-grid size-[26px] place-items-center rounded-lg border border-[#E6E8F0] bg-transparent"
                            aria-hidden
                          />
                        )}
                      </td>
                    );
                  })}
                  <td
                    className={cn(
                      "border-b border-border-subtle px-2 py-1.5 text-left",
                      hl.row === row.person.id && "bg-[#F7F7FD]"
                    )}
                  >
                    <div className="grid gap-1">
                      <b
                        className="text-sm font-semibold"
                        style={{ color: ringCol }}
                      >
                        {pct}%
                      </b>
                      <div className="flex h-1.5 overflow-hidden rounded-full bg-[#EEF0F6]">
                        <span
                          className="h-full bg-[#1B8F5A]"
                          style={{ width: `${okShare}%` }}
                        />
                        <span
                          className="h-full bg-[#E0A030]"
                          style={{ width: `${soonShare}%` }}
                        />
                        <span
                          className="h-full bg-[#C2410C]"
                          style={{ width: `${badShare}%` }}
                        />
                      </div>
                      <small className="text-[11px] text-muted-foreground">
                        {s.ok + s.soon} of {s.total} in date
                      </small>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {tip ? (
        <div
          className="pointer-events-none fixed z-40 max-w-[260px] rounded-[10px] bg-[#0B1020] px-2.5 py-2 text-xs leading-snug text-[#EEF0FF] shadow-[0_12px_30px_rgba(7,10,24,0.3)]"
          style={{
            left: Math.min(tip.x + 12, window.innerWidth - 280),
            top: Math.min(tip.y + 14, window.innerHeight - 80),
          }}
        >
          {tip.text}
        </div>
      ) : null}

      {pick ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md space-y-4 rounded-xl border border-border-subtle bg-card p-5 shadow-lg">
            <div>
              <h3 className="text-sm font-semibold">
                {pick.personName} · {pick.cell.req.comp.name}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <TrainingCellBadge state={pick.cell.st} />
                <span className="text-xs capitalize text-muted-foreground">
                  {pick.cell.req.level}
                </span>
                {pick.cell.next ? (
                  <span className="text-xs text-muted-foreground">
                    Valid to {formatDate(pick.cell.next)}
                    {pick.cell.days != null ? ` · ${pick.cell.days}d left` : ""}
                  </span>
                ) : null}
              </div>
              {pick.cell.rec ? (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    Last: {formatDate(pick.cell.rec.date)}
                    {pick.cell.rec.provider
                      ? ` · ${pick.cell.rec.provider}`
                      : ""}
                    {pick.cell.rec.ref ? ` · ${pick.cell.rec.ref}` : ""}
                  </span>
                  {pick.cell.rec.fileId ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void openTrainingEvidence(pick.cell.rec?.fileId)
                      }
                    >
                      <FileText className="size-3.5" /> View certificate
                    </Button>
                  ) : null}
                </div>
              ) : null}
              {pick.cell.reason ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  N/A reason: {pick.cell.reason}
                </p>
              ) : null}
            </div>

            {canEdit && pick.cell.st !== "na" ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Date">
                    <input
                      type="date"
                      className="ims-field"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Result">
                    <select
                      className="ims-select ims-field"
                      value={result}
                      onChange={(e) =>
                        setResult(
                          e.target.value as
                            | "Pass"
                            | "Pass with observations"
                            | "Fail"
                        )
                      }
                    >
                      <option value="Pass">Pass</option>
                      <option value="Pass with observations">
                        Pass with observations
                      </option>
                      <option value="Fail">Fail</option>
                    </select>
                  </FormField>
                  <FormField label="Provider">
                    <input
                      className="ims-field"
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Reference">
                    <input
                      className="ims-field"
                      value={ref}
                      onChange={(e) => setRef(e.target.value)}
                    />
                  </FormField>
                </div>
                <FormField label="Certificate / evidence file">
                  <FileDropZone
                    key={dropKey}
                    path="training"
                    multiple={false}
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    disabled={pending}
                    onUploaded={(meta) =>
                      setFileId(encodeTrainingFileId(meta))
                    }
                    onRemoved={() => setFileId(null)}
                  />
                  {pick.cell.req.comp.evidence === "Certificate" ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Certificate evidence needs a reference or uploaded file.
                    </p>
                  ) : null}
                </FormField>
                <FormField label="Mark N/A — reason">
                  <input
                    className="ims-field"
                    value={naReason}
                    placeholder="e.g. Does not operate this equipment"
                    onChange={(e) => setNaReason(e.target.value)}
                  />
                </FormField>
              </>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenPerson(pick.personId)}
              >
                Open person
              </Button>
              {canEdit && pick.cell.st !== "na" ? (
                <>
                  <Button
                    type="button"
                    disabled={pending}
                    onClick={() => void saveRecord()}
                  >
                    Record result
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() => void markNa()}
                  >
                    Mark N/A
                  </Button>
                </>
              ) : null}
              {canEdit && pick.cell.st === "na" ? (
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() => void restore()}
                >
                  Restore requirement
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPick(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
