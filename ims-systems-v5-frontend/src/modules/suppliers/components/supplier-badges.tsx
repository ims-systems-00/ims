import { StatusBadge } from "@/shared/components/status-badge";

export function SupplierComplianceBadge({
  isCompliant,
}: {
  isCompliant: boolean;
}) {
  return (
    <StatusBadge tone={isCompliant ? "success" : "warning"}>
      {isCompliant ? "Compliant" : "Not compliant"}
    </StatusBadge>
  );
}

export function SupplierRiskLevelBadge({
  riskLevel,
}: {
  riskLevel: string;
}) {
  const tone =
    riskLevel === "Safe" || riskLevel === "Secure"
      ? "success"
      : riskLevel === "Unsecure"
        ? "warning"
        : "destructive";
  return <StatusBadge tone={tone}>{riskLevel}</StatusBadge>;
}
