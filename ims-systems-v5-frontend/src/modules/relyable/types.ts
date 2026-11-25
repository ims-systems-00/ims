export type RelyableBand = "A" | "B" | "C" | "D" | "E";

export type RelyableCap = {
  limit: number | null;
  reason: string;
};

export type RelyableScope = {
  family: string;
  sizeBand: string;
  attrs: Record<string, 0 | 1>;
  confirmed: boolean;
  declarations: Array<{
    attr: string;
    contradicted: boolean;
    reason?: string;
  }>;
};

export type RelyableModuleContribution = {
  id: string;
  name: string;
  emits: string;
  points: number;
  max: number;
  share: number;
  gap: number;
};

export type RelyableRaiseItItem = {
  type: string;
  level: number;
  from: number;
  to: number;
  delta: number;
  afterCap: boolean;
  label: string;
};

export type RelyableNextRisk = {
  type: string;
  in: number;
  what: "expired" | "expires" | "decays";
  validUntil?: string;
  halfLife?: number;
  label: string;
};

export type RelyableDashboard = {
  rating: number;
  band: RelyableBand;
  bandName: string;
  tier: number;
  verifiedRatio: number;
  domains: Record<string, number | null>;
  caps: RelyableCap[];
  scope: RelyableScope;
  listedCertifications: string[];
  modelVersion: string;
  computedAt: string;
  lastSyncedAt: string | null;
  weekDelta: number | null;
  weekDeltaReason: string | null;
  modules: RelyableModuleContribution[];
  raiseIt: RelyableRaiseItItem[];
  nextRisks: RelyableNextRisk[];
  riskIndicators: { clear: number; total: number };
  chainValid: boolean;
};

export type RelyableSyncResult = {
  emitted: number;
  duplicates: number;
  dashboard: RelyableDashboard;
};
