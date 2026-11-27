import { cn } from "@/shared/lib/utils";
import { useModuleHealthQuery } from "../hooks/use-live-compliance";
import type { LiveModule } from "../types";
import { AdviceCards } from "./advice-cards";
import { ComplianceHeader } from "./compliance-header";

/**
 * Live ISO compliance on top of a module page: a summary card with a
 * progress ring, then this module's "do next" cards. Renders nothing when
 * the organisation has no ISO 9001/14001/45001 toolkit.
 */
export function ModuleComplianceStrip({
  module,
  className,
}: {
  module: LiveModule;
  className?: string;
}) {
  const health = useModuleHealthQuery(module);
  if (!health.data?.clauses.length) return null;
  return (
    <section
      aria-label={`ISO compliance for ${health.data.name}`}
      className={cn("space-y-3", className)}
    >
      <ComplianceHeader module={module} />
      <AdviceCards module={module} limit={3} emptyText={null} />
    </section>
  );
}
