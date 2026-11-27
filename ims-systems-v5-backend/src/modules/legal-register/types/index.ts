/**
 * Legal register — legal and other requirements the organisation must meet
 * (ISO 14001 / 45001 6.1.3) and the evidence that each is met (9.1.2).
 */

/** Authorised as Compliance (read / create / update / delete). */
export const LEGAL_REGISTER_RESOURCE = "compliance" as const;

export type LegalEvidence = {
  id: string;
  /** What shows the duty is met, e.g. "Waste transfer notes 2026". */
  label: string;
  url?: string;
  addedBy: string;
  addedAt: Date;
};

export type LegalDuty = {
  id: string;
  organizationId: string;
  name: string;
  legislation: string;
  /** Regulation / article, e.g. "reg 11". */
  reference?: string;
  /** Activities / sites it applies to. */
  appliesTo?: string;
  evidence: LegalEvidence[];
  lastCheckedOn: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type LegalRegisterSettings = {
  lastReviewedOn: Date | null;
  lastReviewedBy: string | null;
  reviewIntervalMonths: number;
};

export type LegalRegister = {
  settings: LegalRegisterSettings;
  /** Date the next register review falls due (null until first review). */
  nextReviewDue: Date | null;
  duties: LegalDuty[];
};

export type CreateLegalDutyInput = {
  name: string;
  legislation: string;
  reference?: string;
  appliesTo?: string;
};

export type UpdateLegalDutyInput = {
  name?: string;
  legislation?: string;
  reference?: string | null;
  appliesTo?: string | null;
};

/** Common UK duties offered as a starting point (user confirms each). */
export const COMMON_UK_DUTIES: CreateLegalDutyInput[] = [
  { name: "Health and safety risk assessment", legislation: "Management of Health and Safety at Work Regulations 1999", reference: "reg 3" },
  { name: "Work equipment guarding and maintenance", legislation: "Provision and Use of Work Equipment Regulations 1998 (PUWER)", reference: "reg 5, 11" },
  { name: "Thorough examination of lifting equipment", legislation: "Lifting Operations and Lifting Equipment Regulations 1998 (LOLER)", reference: "reg 9" },
  { name: "Hazardous substances assessment", legislation: "Control of Substances Hazardous to Health Regulations 2002 (COSHH)", reference: "reg 6" },
  { name: "Fire risk assessment", legislation: "Regulatory Reform (Fire Safety) Order 2005", reference: "art 9" },
  { name: "Waste duty of care and transfer notes", legislation: "Environmental Protection Act 1990", reference: "s34" },
  { name: "Noise risk assessment", legislation: "Control of Noise at Work Regulations 2005", reference: "reg 5" },
  { name: "Electrical systems maintained safe", legislation: "Electricity at Work Regulations 1989", reference: "reg 4" },
  { name: "Reporting injuries and dangerous occurrences", legislation: "RIDDOR 2013" },
  { name: "First aid provision", legislation: "Health and Safety (First-Aid) Regulations 1981" },
];
