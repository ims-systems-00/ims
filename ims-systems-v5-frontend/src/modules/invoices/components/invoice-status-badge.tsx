import { Badge } from "@/shared/components/ui/badge";
import type { InvoiceStatus } from "../types";

const STATUS_VARIANT: Record<
  InvoiceStatus,
  "destructive" | "secondary" | "default"
> = {
  Draft: "destructive",
  Sent: "secondary",
  Paid: "default",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>;
}
