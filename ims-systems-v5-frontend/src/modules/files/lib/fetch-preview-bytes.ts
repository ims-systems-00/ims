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
