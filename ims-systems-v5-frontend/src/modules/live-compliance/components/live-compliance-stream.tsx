import { useLiveComplianceStream } from "../hooks/use-live-compliance-stream";
import { useLiveComplianceEnabled } from "../lib/action-centre";

/**
 * Mounted once in the application shell. Opens the live-compliance stream
 * when the organisation has an ISO 9001/14001/45001 toolkit (same licence
 * rule as the sidebar; dev-stub mode always connects). Renders nothing.
 */
export function LiveComplianceStream() {
  const enabled = useLiveComplianceEnabled();
  // Unit tests render the shell without an API; they test the hook directly.
  useLiveComplianceStream(enabled && import.meta.env.MODE !== "test");
  return null;
}
