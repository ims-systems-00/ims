import { apiRequest } from "@/shared/lib/http";
import type { CreateLegalDutyInput, LegalDuty, LegalRegister } from "../types";

export const getLegalRegister = () => apiRequest<LegalRegister>("/legal-register");

export const createLegalDuty = (body: CreateLegalDutyInput) =>
  apiRequest<LegalDuty>("/legal-register/duties", { method: "POST", body });

export const addCommonLegalDuties = () =>
  apiRequest<{ added: number }>("/legal-register/duties/common", { method: "POST" });

export const removeLegalDuty = (id: string) =>
  apiRequest<{ id: string }>(`/legal-register/duties/${id}`, { method: "DELETE" });

export const addLegalEvidence = (id: string, body: { label: string; url?: string }) =>
  apiRequest<LegalDuty>(`/legal-register/duties/${id}/evidence`, { method: "POST", body });

export const removeLegalEvidence = (id: string, evidenceId: string) =>
  apiRequest<LegalDuty>(`/legal-register/duties/${id}/evidence/${evidenceId}`, {
    method: "DELETE",
  });

export const markLegalRegisterReviewed = () =>
  apiRequest<LegalRegister>("/legal-register/review", { method: "POST" });

export const updateLegalRegisterSettings = (body: { reviewIntervalMonths: number }) =>
  apiRequest<LegalRegister>("/legal-register/settings", { method: "PATCH", body });
