import type { EmitEvidenceInput } from "./types";

/**
 * Collectors gather Tier-3 evidence facts from other iMS modules.
 * Facts only — never documents or personal records.
 */
export interface RelyableEvidenceCollectorPort {
  collect(organizationId: string): Promise<EmitEvidenceInput[]>;
}

export class NoOpRelyableEvidenceCollector
  implements RelyableEvidenceCollectorPort
{
  async collect(_organizationId: string): Promise<EmitEvidenceInput[]> {
    return [];
  }
}

export interface RelyableOrgPort {
  getLegalName(organizationId: string): Promise<string | null>;
}

export class NoOpRelyableOrgAdapter implements RelyableOrgPort {
  async getLegalName(_organizationId: string): Promise<string | null> {
    return null;
  }
}
