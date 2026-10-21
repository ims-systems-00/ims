import { apiRequest } from "@/shared/lib/http";
import type {
  ApplyPartnershipInput,
  Partnership,
  PartnershipDashboard,
  PartnershipLookup,
} from "../types";

export function applyPartnership(
  body: ApplyPartnershipInput
): Promise<Partnership> {
  return apiRequest<Partnership>("/partnerships", {
    method: "POST",
    body,
  });
}

export function listMyPartnerships(): Promise<Partnership[]> {
  return apiRequest<Partnership[]>("/partnerships/mine");
}

export function getPartnershipDashboard(): Promise<PartnershipDashboard> {
  return apiRequest<PartnershipDashboard>("/partnerships/mine/dashboard");
}

export function getPartnershipByCode(
  code: string
): Promise<PartnershipLookup> {
  return apiRequest<PartnershipLookup>(
    `/partnerships/${encodeURIComponent(code)}`
  );
}
