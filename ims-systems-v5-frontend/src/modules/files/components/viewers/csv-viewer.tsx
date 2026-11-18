import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Papa from "papaparse";
import { Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  fetchPreviewBytes,
  PREVIEW_TABLE_ROW_CAP,
} from "../../lib/fetch-preview-bytes";

type CsvViewerProps = {
  url: string;
  fileName: string;
  fill?: boolean;
};

type CsvPreview = {
  headers: string[];
  rows: string[][];
  totalRows: number;
};

function parseCsv(buffer: ArrayBuffer): CsvPreview {
  const text = new TextDecoder("utf-8").decode(buffer);
  const parsed = Papa.parse<string[]>(text, {
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    throw new Error(parsed.errors[0]?.message || "Unable to parse CSV");
  }

  const matrix = parsed.data;
  const headerRow = matrix[0] ?? [];
  const headers =
    headerRow.length > 0
      ? headerRow.map((cell, index) =>
          String(cell ?? "").trim() || `Column ${index + 1}`
        )
      : ["Column 1"];

  const dataRows = matrix.slice(1);
  const rows = dataRows.slice(0, PREVIEW_TABLE_ROW_CAP).map((row) =>
    headers.map((_, index) => String(row[index] ?? ""))
  );

  return {
    headers,
    rows,
    totalRows: dataRows.length,
  };
}

export function CsvViewer({ url, fileName, fill = false }: CsvViewerProps) {
  const bytesQuery = useQuery({
    queryKey: ["files", "preview-bytes", url],
    queryFn: () => fetchPreviewBytes(url),
    staleTime: 5 * 60 * 1000,
  });

  const preview = useMemo(() => {
    if (!bytesQuery.data) return null;
    try {
      return parseCsv(bytesQuery.data);
    } catch {
      return null;
    }
  }, [bytesQuery.data]);

  if (bytesQuery.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading CSV…
      </div>
    );
  }

  if (bytesQuery.isError || !preview) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
        {bytesQuery.error instanceof Error
          ? bytesQuery.error.message
          : `Unable to preview ${fileName}`}
      </div>
    );
  }

  const truncated = preview.totalRows > PREVIEW_TABLE_ROW_CAP;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        fill ? "h-full" : "min-h-[32rem]"
      )}
    >
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-surface-muted">
            <tr>
              {preview.headers.map((header) => (
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
            {preview.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={preview.headers.length}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  This CSV has no data rows.
                </td>
              </tr>
            ) : (
              preview.rows.map((row, rowIndex) => (
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
          Showing first {PREVIEW_TABLE_ROW_CAP} of {preview.totalRows} rows —
          download the file to see the full content.
        </p>
      ) : null}
    </div>
  );
}
