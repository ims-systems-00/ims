/**
 * Legal register application service (ISO 14001 / 45001 6.1.3, 9.1.2).
 */
import type { Authorizer, SecurityIdentity } from "../../../security";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../../../shared";
import type { LegalRegisterRepository } from "../repositories/legal-register.repository";
import {
  COMMON_UK_DUTIES,
  LEGAL_REGISTER_RESOURCE,
  type CreateLegalDutyInput,
  type LegalDuty,
  type LegalRegister,
  type LegalRegisterSettings,
  type UpdateLegalDutyInput,
} from "../types";

function requireOrgIdentity(identity: SecurityIdentity | null | undefined) {
  if (!identity?.subjectId) throw new UnauthorizedError();
  if (!identity.organizationId) {
    throw new ForbiddenError("Organisation context is required");
  }
  return {
    identity,
    organizationId: identity.organizationId,
    subjectId: identity.subjectId,
  };
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date.getTime());
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

export type LegalRegisterService = ReturnType<typeof createLegalRegisterService>;

export function createLegalRegisterService(deps: {
  repository: LegalRegisterRepository;
  authorizer: Authorizer;
}) {
  const { repository, authorizer } = deps;

  async function assertAllowed(
    identity: SecurityIdentity,
    action: "read" | "create" | "update" | "delete"
  ): Promise<void> {
    const allowed = await authorizer.allow({
      identity,
      action,
      resourceType: LEGAL_REGISTER_RESOURCE,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError("User does not have permission to access the legal register");
    }
  }

  async function requireDuty(organizationId: string, id: string): Promise<LegalDuty> {
    const duty = await repository.findDuty(organizationId, id);
    if (!duty) throw new NotFoundError("Legal duty not found");
    return duty;
  }

  async function registerFor(organizationId: string): Promise<LegalRegister> {
    const [settings, duties] = await Promise.all([
      repository.getSettings(organizationId),
      repository.listDuties(organizationId),
    ]);
    return {
      settings,
      nextReviewDue: settings.lastReviewedOn
        ? addMonths(settings.lastReviewedOn, settings.reviewIntervalMonths)
        : null,
      duties,
    };
  }

  return {
    /** Identity-free read for the Live Compliance collector. */
    registerForOrganization: registerFor,

    async get(identity: SecurityIdentity | null | undefined): Promise<LegalRegister> {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "read");
      return registerFor(ctx.organizationId);
    },

    async createDuty(
      identity: SecurityIdentity | null | undefined,
      input: CreateLegalDutyInput
    ): Promise<LegalDuty> {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "create");
      const [created] = await repository.createDuties(ctx.organizationId, [input], ctx.subjectId);
      return created!;
    },

    /** Add the common UK duties that are not already in the register. */
    async addCommonDuties(
      identity: SecurityIdentity | null | undefined
    ): Promise<{ added: number }> {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "create");
      const existing = new Set(
        (await repository.listDuties(ctx.organizationId)).map((d) => d.name.toLowerCase())
      );
      const missing = COMMON_UK_DUTIES.filter((d) => !existing.has(d.name.toLowerCase()));
      await repository.createDuties(ctx.organizationId, missing, ctx.subjectId);
      return { added: missing.length };
    },

    async updateDuty(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateLegalDutyInput
    ): Promise<LegalDuty> {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "update");
      await requireDuty(ctx.organizationId, id);
      const updated = await repository.updateDuty(ctx.organizationId, id, input);
      if (!updated) throw new NotFoundError("Legal duty not found");
      return updated;
    },

    async removeDuty(identity: SecurityIdentity | null | undefined, id: string): Promise<{ id: string }> {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "delete");
      const ok = await repository.softDeleteDuty(ctx.organizationId, id);
      if (!ok) throw new NotFoundError("Legal duty not found");
      return { id };
    },

    async addEvidence(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: { label: string; url?: string }
    ): Promise<LegalDuty> {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "update");
      const updated = await repository.addEvidence(ctx.organizationId, id, {
        label: input.label,
        ...(input.url ? { url: input.url } : {}),
        addedBy: ctx.subjectId,
      });
      if (!updated) throw new NotFoundError("Legal duty not found");
      return updated;
    },

    async removeEvidence(
      identity: SecurityIdentity | null | undefined,
      id: string,
      evidenceId: string
    ): Promise<LegalDuty> {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "update");
      const duty = await requireDuty(ctx.organizationId, id);
      if (!duty.evidence.some((e) => e.id === evidenceId)) {
        throw new NotFoundError("Evidence not found");
      }
      const updated = await repository.removeEvidence(ctx.organizationId, id, evidenceId);
      return updated!;
    },

    /** ISO 6.1.3: confirm the register is current; schedules the next review. */
    async markReviewed(identity: SecurityIdentity | null | undefined): Promise<LegalRegister> {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "update");
      const duties = await repository.listDuties(ctx.organizationId);
      if (!duties.length) {
        throw new ConflictError("Add the legal duties that apply before marking the register reviewed");
      }
      await repository.updateSettings(ctx.organizationId, {
        lastReviewedOn: new Date(),
        lastReviewedBy: ctx.subjectId,
      });
      return registerFor(ctx.organizationId);
    },

    async updateSettings(
      identity: SecurityIdentity | null | undefined,
      input: Pick<LegalRegisterSettings, "reviewIntervalMonths">
    ): Promise<LegalRegister> {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "update");
      await repository.updateSettings(ctx.organizationId, input);
      return registerFor(ctx.organizationId);
    },
  };
}
