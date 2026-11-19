import { useQuery } from "@tanstack/react-query";

/**
 * Fetch signed-URL bytes for client-side preview libraries
 * (docx-preview, SheetJS, etc.).
 */
export function usePreviewBytesQuery(url: string | undefined, fileName: string) {
  return useQuery({
    queryKey: ["files", "preview-bytes", url],
    enabled: Boolean(url),
    queryFn: async () => {
      if (!url) throw new Error("Missing preview URL");
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Unable to load ${fileName} (${response.status})`);
      }
      return response.arrayBuffer();
    },
    staleTime: 5 * 60 * 1000,
  });
}
