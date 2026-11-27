export type LegalEvidence = {
  id: string;
  label: string;
  url?: string;
  addedBy: string;
  addedAt: string;
};

export type LegalDuty = {
  id: string;
  name: string;
  legislation: string;
  reference?: string;
  appliesTo?: string;
  evidence: LegalEvidence[];
  lastCheckedOn: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LegalRegister = {
  settings: {
    lastReviewedOn: string | null;
    lastReviewedBy: string | null;
    reviewIntervalMonths: number;
  };
  nextReviewDue: string | null;
  duties: LegalDuty[];
};

export type CreateLegalDutyInput = {
  name: string;
  legislation: string;
  reference?: string;
  appliesTo?: string;
};
