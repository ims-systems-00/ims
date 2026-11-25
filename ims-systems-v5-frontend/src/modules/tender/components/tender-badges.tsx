import { StatusBadge } from "@/shared/components/status-badge";
import {
  gateVerdictLabel,
  questionStatusLabel,
  questionnaireStatusLabel,
  requirementStatusLabel,
} from "../lib/tender-display";
import type {
  TenderGateVerdict,
  TenderQuestionStatus,
  TenderQuestionnaireStatus,
  TenderRequirementStatus,
} from "../types";

export function TenderQuestionnaireStatusBadge({
  status,
}: {
  status: TenderQuestionnaireStatus | string;
}) {
  const tone =
    status === "ready" || status === "submitted"
      ? "success"
      : status === "drafting" || status === "review"
        ? "warning"
        : status === "new"
          ? "info"
          : "neutral";
  return (
    <StatusBadge tone={tone}>{questionnaireStatusLabel(status)}</StatusBadge>
  );
}

export function TenderQuestionStatusBadge({
  status,
}: {
  status: TenderQuestionStatus | string;
}) {
  const tone =
    status === "approved" || status === "accepted"
      ? "success"
      : status === "needs-input"
        ? "warning"
        : status === "draft" || status === "edited"
          ? "info"
          : "neutral";
  return <StatusBadge tone={tone}>{questionStatusLabel(status)}</StatusBadge>;
}

export function TenderGateBadge({
  verdict,
}: {
  verdict: TenderGateVerdict | string;
}) {
  const tone =
    verdict === "bid"
      ? "success"
      : verdict === "review"
        ? "warning"
        : verdict === "no-bid-risk"
          ? "destructive"
          : "neutral";
  return <StatusBadge tone={tone}>{gateVerdictLabel(verdict)}</StatusBadge>;
}

export function TenderRequirementStatusBadge({
  status,
}: {
  status: TenderRequirementStatus | string;
}) {
  const tone =
    status === "comply"
      ? "success"
      : status === "partial"
        ? "warning"
        : status === "no"
          ? "destructive"
          : "neutral";
  return (
    <StatusBadge tone={tone}>{requirementStatusLabel(status)}</StatusBadge>
  );
}

export function TenderHealthBadge({
  label,
  ok,
}: {
  label: string;
  ok: boolean;
}) {
  return (
    <StatusBadge tone={ok ? "success" : "warning"}>{label}</StatusBadge>
  );
}

export function TenderExpiryBadge({
  expires,
  warnDays = 60,
}: {
  expires?: string | null;
  warnDays?: number;
}) {
  if (!expires) {
    return <StatusBadge tone="neutral">No expiry</StatusBadge>;
  }
  const days = Math.ceil(
    (new Date(expires).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
  );
  if (Number.isNaN(days)) {
    return <StatusBadge tone="neutral">{expires}</StatusBadge>;
  }
  if (days < 0) {
    return <StatusBadge tone="destructive">Expired</StatusBadge>;
  }
  if (days <= warnDays) {
    return <StatusBadge tone="warning">Expires in {days}d</StatusBadge>;
  }
  return <StatusBadge tone="success">Valid</StatusBadge>;
}
