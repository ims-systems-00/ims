import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import {
  fetchPreviewBytes,
  PREVIEW_TABLE_ROW_CAP,
} from "../../lib/fetch-preview-bytes";
import { PageLoader } from "@/shared/components/ims-loader";

type ExcelViewerProps = {
  url: string;
  fileName: string;
  fill?: boolean;
};

type SheetPreview = {
  name: string;
  headers: string[];
  rows: string[][];
  totalRows: number;
};

function workbookToSheets(buffer: ArrayBuffer): SheetPreview[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    if (!sheet) {
      return {
        name,
        headers: ["Column 1"],
        rows: [] as string[][],
        totalRows: 0,
      };
    }
    const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
      sheet,
      { header: 1, defval: "" }
    ) as (string | number | boolean | null)[][];

    const headerRow = matrix[0] ?? [];
    const headers =
      headerRow.length > 0
        ? headerRow.map((cell, index) =>
            String(cell ?? "").trim() || `Column ${index + 1}`
          )
        : ["Column 1"];

    const dataRows = matrix.slice(1);
    const capped = dataRows.slice(0, PREVIEW_TABLE_ROW_CAP).map((row) =>
      headers.map((_, index) => String(row[index] ?? ""))
    );

    return {
      name,
      headers,
      rows: capped,
      totalRows: dataRows.length,
    };
  });
}

export function ExcelViewer({ url, fileName, fill = false }: ExcelViewerProps) {
  const [activeSheet, setActiveSheet] = useState(0);

  const bytesQuery = useQuery({
    queryKey: ["files", "preview-bytes", url],
    queryFn: () => fetchPreviewBytes(url),
    staleTime: 5 * 60 * 1000,
  });

  const sheets = useMemo(() => {
    if (!bytesQuery.data) return [] as SheetPreview[];
    try {
      return workbookToSheets(bytesQuery.data);
    } catch {
      return [] as SheetPreview[];
    }
  }, [bytesQuery.data]);

  if (bytesQuery.isLoading) {
    return (
      <PageLoader label="Loading spreadsheet…" className="flex-1" />
    );
  }

  if (bytesQuery.isError || sheets.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
        {bytesQuery.error instanceof Error
          ? bytesQuery.error.message
          : `Unable to preview ${fileName}`}
      </div>
    );
  }

  const sheet = sheets[Math.min(activeSheet, sheets.length - 1)]!;
  const truncated = sheet.totalRows > PREVIEW_TABLE_ROW_CAP;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        fill ? "h-full" : "min-h-[32rem]"
      )}
    >
      {sheets.length > 1 ? (
        <div className="flex shrink-0 flex-wrap gap-1 border-b border-border-subtle bg-surface px-3 py-2">
          {sheets.map((item, index) => (
            <Button
              key={item.name}
              type="button"
              size="sm"
              variant={index === activeSheet ? "secondary" : "ghost"}
              onClick={() => setActiveSheet(index)}
            >
              {item.name}
            </Button>
          ))}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-surface-muted">
            <tr>
              {sheet.headers.map((header) => (
                <th
                  key={header}
                  className="border-b border-border-subtle px-3 py-2 font-medium text-foreground"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={sheet.headers.length}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  This sheet has no data rows.
                </td>
              </tr>
            ) : (
              sheet.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="odd:bg-surface even:bg-surface-muted/40">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={`${rowIndex}-${cellIndex}`}
                      className="max-w-[16rem] truncate border-b border-border-subtle/60 px-3 py-1.5 text-foreground"
                      title={cell}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {truncated ? (
        <p className="border-t border-border-subtle px-4 py-2 text-[0.6875rem] text-muted-foreground">
          Showing first {PREVIEW_TABLE_ROW_CAP} of {sheet.totalRows} rows —
          download the file to see the full sheet.
        </p>
      ) : null}
    </div>
  );
}
