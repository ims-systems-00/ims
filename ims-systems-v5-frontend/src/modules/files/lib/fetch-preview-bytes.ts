import { useQuery } from "@tanstack/react-query";

/** Cap for tabular previews (Excel / CSV). */
export const PREVIEW_TABLE_ROW_CAP = 500;

/**
 * Fetch raw bytes from a signed view URL for client-side document parsers.
 */
export async function fetchPreviewBytes(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load file (${response.status})`);
  }
  return response.arrayBuffer();
}

export function usePreviewBytesQuery(url: string, fileName: string) {
  return useQuery({
    queryKey: ["files", "preview-bytes", fileName, url],
    queryFn: () => fetchPreviewBytes(url),
    enabled: Boolean(url) && !url.startsWith("memory://"),
    staleTime: 60_000,
  });
}
