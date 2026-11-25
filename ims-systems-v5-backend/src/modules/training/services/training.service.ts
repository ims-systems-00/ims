/**
 * Training & Competency application service.
 */
import { randomUUID } from "node:crypto";
import type { Authorizer, SecurityIdentity } from "../../../security";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import {
  buildTrainingAuditorPackHtml,
  buildTrainingAuditorPackPdf,
} from "../lib/auditor-pack";
import { buildIcs } from "../lib/ics";
import { buildInviteMail, buildReminderMail } from "../lib/mail";
import {
  acknowledgePolicyAnswers,
  activePeople,
  assertRsvp,
  DEFAULT_COMPETENCIES,
  DEFAULT_ROLES,
  findCompetency,
  gaps,
  histStamp,
  isCompetent,
  isoDate,
  matrixCsv,
  matrixRow,
  personSummary,
  plan,
  readiness,
  remindersDue,
  slug,
  validateCompetencyInput,
  validatePerson,
  validateRecord,
  validateSettingsInput,
} from "../lib/training-rules";
import {
  signRsvpToken,
  signSelfToken,
  verifyRsvpToken,
  verifySelfToken,
  type TrainingRsvpTokenClaims,
  type TrainingSelfTokenClaims,
} from "../lib/tokens";
import {
  storageInfoFromFileId,
  type DocumentModuleLibraryPort,
} from "../../document-management";
import type {
  TrainingEmailPort,
  TrainingFilesPort,
  TrainingNotificationPort,
  TrainingOrgPort,
  TrainingUsersPort,
} from "../ports";
import type { TrainingCompetencyRepository } from "../repositories/training-competency.repository";
import type { TrainingPersonRepository } from "../repositories/training-person.repository";
import type { TrainingRecordRepository } from "../repositories/training-record.repository";
import type { TrainingRoleRepository } from "../repositories/training-role.repository";
import type { TrainingSessionRepository } from "../repositories/training-session.repository";
import type { TrainingSettingsRepository } from "../repositories/training-settings.repository";
import {
  TRAINING_RESOURCE,
  type CompetentResult,
  type CreateCompetencyInput,
  type CreateExternalPersonInput,
  type CreatePersonInput,
  type CreateRecordInput,
  type CreateRoleInput,
  type CreateSessionInput,
  type SessionOutcome,
  type TrainingAttachment,
  type TrainingHistoryEntry,
  type TrainingInviteLog,
  type TrainingModel,
  type TrainingOverview,
  type TrainingPerson,
  type TrainingRecord,
  type TrainingRsvpStatus,
  type TrainingSession,
  type UpdateCompetencyInput,
  type UpdatePersonInput,
  type UpdateRoleInput,
  type UpdateSessionInput,
  type UpdateTrainingSettingsInput,
} from "../types";

function requireOrgIdentity(identity: SecurityIdentity | null | undefined): {
  identity: SecurityIdentity;
  organizationId: string;
  subjectId: string;
} {
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

function actorName(identity: SecurityIdentity): string {
  return identity.email?.trim() || identity.subjectId || "System";
}

function histEntry(what: string, by: string, now?: Date): TrainingHistoryEntry {
  return { t: histStamp(now), by: by || "system", what };
}

function isObjectIdLike(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value);
}

function selfPublicUrl(clientUrl: string, token: string): string {
  return `${clientUrl.replace(/\/$/, "")}/training/t/${token}`;
}

function rsvpPublicUrl(clientUrl: string, token: string): string {
  return `${clientUrl.replace(/\/$/, "")}/training/r/${token}`;
}

function rsvpExpiresAt(sessionDate: string): Date {
  const base = new Date(`${sessionDate}T23:59:59.000Z`);
  const expires = new Date(base.getTime() + 14 * 86_400_000);
  const min = new Date(Date.now() + 7 * 86_400_000);
  return expires > min ? expires : min;
}

export type TrainingServiceDeps = {
  settings: TrainingSettingsRepository;
  competencies: TrainingCompetencyRepository;
  roles: TrainingRoleRepository;
  people: TrainingPersonRepository;
  records: TrainingRecordRepository;
  sessions: TrainingSessionRepository;
  authorizer: Authorizer;
  email: TrainingEmailPort;
  files: TrainingFilesPort;
  org: TrainingOrgPort;
  users: TrainingUsersPort;
  notifications: TrainingNotificationPort;
  documents: DocumentModuleLibraryPort;
  clientUrl: string;
  tokenSecret: string;
};

export type TrainingService = ReturnType<typeof createTrainingService>;

export type TrainingLibrarySyncResult = {
  scanned: number;
  created: number;
  existing: number;
  failed: number;
};

export function createTrainingService(deps: TrainingServiceDeps) {
  async function registerTrainingFile(input: {
    organizationId: string;
    createdBy: string;
    sourceKey: string;
    name: string;
    fileId: string | null | undefined;
    sourceLabel?: string | null;
    folderName?: string | null;
  }): Promise<"created" | "existing" | "skipped" | "failed"> {
    // Keep storageInfo.Name as the real object filename (from the key).
    // Passing the display label breaks PDF preview / signed Content-Disposition.
    const storageInfo = storageInfoFromFileId(input.fileId);
    if (!storageInfo) return "skipped";
    try {
      const result = await deps.documents.registerDocument({
        organizationId: input.organizationId,
        createdBy: input.createdBy,
        sourceModule: "training",
        sourceKey: input.sourceKey,
        name: input.name,
        storageInfo,
        purpose: "Document",
        sourceLabel: input.sourceLabel ?? null,
        folderName: input.folderName ?? null,
      });
      if (!result) return "skipped";
      return result.created ? "created" : "existing";
    } catch {
      // Non-fatal — training write already succeeded.
      return "failed";
    }
  }

  function queueTrainingFile(
    input: Parameters<typeof registerTrainingFile>[0]
  ): void {
    void registerTrainingFile(input);
  }

  async function assertAllowed(
    identity: SecurityIdentity,
    action: "read" | "create" | "delete",
    resourceId?: string
  ): Promise<void> {
    const allowed = await deps.authorizer.allow({
      identity,
      action,
      resourceType: TRAINING_RESOURCE,
      resourceId,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError(
        "User does not have permission to access training"
      );
    }
  }

  async function syncOrgMembers(organizationId: string): Promise<number> {
    const members = await deps.users.listOrgMembers(organizationId);
    if (!members.length) return 0;
    const settings = await deps.settings.getOrCreate(organizationId);
    const defaultSite =
      settings.sites[0]?.trim() || settings.siteLabel || "Organisation";
    let created = 0;
    for (const member of members) {
      if (!member.userId || !member.email?.trim()) continue;
      const byUser = await deps.people.findByUserId(
        organizationId,
        member.userId
      );
      if (byUser) {
        if (
          byUser.name !== member.name.trim() ||
          byUser.email.toLowerCase() !== member.email.trim().toLowerCase()
        ) {
          await deps.people.update(organizationId, byUser.id, {
            name: member.name.trim() || byUser.name,
            email: member.email.trim(),
          });
        }
        continue;
      }
      const byEmail = await deps.people.findByEmail(
        organizationId,
        member.email
      );
      if (byEmail) {
        if (!byEmail.userId) {
          await deps.people.update(organizationId, byEmail.id, {
            userId: member.userId,
            name: member.name.trim() || byEmail.name,
          });
        }
        continue;
      }
      await deps.people.create(organizationId, {
        name: member.name.trim() || member.email.trim(),
        email: member.email.trim(),
        site: defaultSite,
        status: "Active",
        roles: [],
        userId: member.userId,
        external: false,
        hist: [
          histEntry("Synced from organisation membership", "system"),
        ],
      });
      created += 1;
    }
    return created;
  }

  async function loadModel(organizationId: string): Promise<TrainingModel> {
    const [settings, competencies, roles, people, records, sessions] =
      await Promise.all([
        deps.settings.getOrCreate(organizationId),
        deps.competencies.list(organizationId, { includeArchived: true }),
        deps.roles.list(organizationId),
        deps.people.list(organizationId),
        deps.records.list(organizationId),
        deps.sessions.list(organizationId),
      ]);
    return {
      org: settings.orgName || "",
      settings: {
        leadDays: settings.leadDays,
        inductionDays: settings.inductionDays,
        reminderDays: settings.reminderDays,
        inviteSubject: settings.inviteSubject,
        inviteBody: settings.inviteBody,
        organiserEmail: settings.organiserEmail,
        allowSelfUpload: settings.allowSelfUpload,
        requireVerification: settings.requireVerification,
        selfTokenDays: settings.selfTokenDays,
        siteLabel: settings.siteLabel,
        sites: settings.sites,
        providers: settings.providers,
      },
      competencies,
      roles,
      people,
      records,
      sessions,
      log: settings.log,
    };
  }

  async function resolveCompetencyId(
    organizationId: string,
    idOrKey: string
  ): Promise<string> {
    const raw = idOrKey.trim();
    if (!raw) throw new ValidationAppError("Competency is required");
    if (isObjectIdLike(raw)) {
      const byId = await deps.competencies.findById(organizationId, raw);
      if (byId) return byId.id;
    }
    const byKey = await deps.competencies.findByKey(organizationId, raw);
    if (byKey) return byKey.id;
    throw new ValidationAppError(`Unknown competency: ${raw}`, {
      code: "invalid_competency",
    });
  }

  async function resolveCompetencyIds(
    organizationId: string,
    values: string[] | undefined
  ): Promise<string[]> {
    if (!values?.length) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const v of values) {
      const id = await resolveCompetencyId(organizationId, v);
      if (!seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
    return out;
  }

  async function resolveRoleId(
    organizationId: string,
    idOrKey: string
  ): Promise<string> {
    const raw = idOrKey.trim();
    if (!raw) throw new ValidationAppError("Role is required");
    if (isObjectIdLike(raw)) {
      const byId = await deps.roles.findById(organizationId, raw);
      if (byId) return byId.id;
    }
    const byKey = await deps.roles.findByKey(organizationId, raw);
    if (byKey) return byKey.id;
    throw new ValidationAppError(`Unknown role: ${raw}`, {
      code: "invalid_role",
    });
  }

  async function resolveRoleIds(
    organizationId: string,
    values: string[] | undefined
  ): Promise<string[]> {
    if (!values?.length) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const v of values) {
      const id = await resolveRoleId(organizationId, v);
      if (!seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
    return out;
  }

  async function uniqueCompetencyKey(
    organizationId: string,
    base: string
  ): Promise<string> {
    let key = slug(base);
    while (await deps.competencies.findByKey(organizationId, key)) {
      key = `${slug(base)}-${Math.random().toString(36).slice(2, 5)}`;
    }
    return key;
  }

  async function uniqueRoleKey(
    organizationId: string,
    base: string
  ): Promise<string> {
    let key = slug(base);
    while (await deps.roles.findByKey(organizationId, key)) {
      key = `${slug(base)}-${Math.random().toString(36).slice(2, 5)}`;
    }
    return key;
  }

  async function requirePerson(
    organizationId: string,
    id: string
  ): Promise<TrainingPerson> {
    const row = await deps.people.findById(organizationId, id);
    if (!row) throw new NotFoundError("Person not found");
    return row;
  }

  async function requireSession(
    organizationId: string,
    id: string
  ): Promise<TrainingSession> {
    const row = await deps.sessions.findById(organizationId, id);
    if (!row) throw new NotFoundError("Session not found");
    return row;
  }

  async function requireRecord(
    organizationId: string,
    id: string
  ): Promise<TrainingRecord> {
    const row = await deps.records.findById(organizationId, id);
    if (!row) throw new NotFoundError("Record not found");
    return row;
  }

  async function appendPersonHist(
    organizationId: string,
    personId: string,
    what: string,
    by: string
  ): Promise<TrainingPerson | null> {
    return deps.people.update(organizationId, personId, {
      pushHist: histEntry(what, by),
    });
  }

  async function buildInviteFor(
    M: TrainingModel,
    session: TrainingSession,
    person: TrainingPerson
  ): Promise<{
    to: string;
    subject: string;
    text: string;
    html: string;
    ics: string;
  }> {
    const S = M.settings;
    const c = findCompetency(M, session.cid);

    const selfToken = await signSelfToken(
      deps.tokenSecret,
      { organizationId: person.organizationId, personId: person.id },
      S.selfTokenDays || 90
    );
    const rsvpToken = await signRsvpToken(
      deps.tokenSecret,
      {
        organizationId: person.organizationId,
        sessionId: session.id,
        personId: person.id,
      },
      rsvpExpiresAt(session.date)
    );
    const selfLink = selfPublicUrl(deps.clientUrl, selfToken);
    const rsvpLink = rsvpPublicUrl(deps.clientUrl, rsvpToken);

    const mail = buildInviteMail({
      model: M,
      session,
      competency: c,
      person,
      selfUrl: selfLink,
      acceptUrl: `${rsvpLink}?a=accept`,
      declineUrl: `${rsvpLink}?a=decline`,
    });

    const ics = buildIcs({
      session,
      competency: c,
      orgName: M.org || "",
      person,
      organiserEmail: S.organiserEmail,
    });

    return {
      to: person.email || "",
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      ics,
    };
  }

  async function verifySelfClaims(
    token: string
  ): Promise<TrainingSelfTokenClaims> {
    try {
      return await verifySelfToken(deps.tokenSecret, token);
    } catch {
      throw new ForbiddenError("Invalid or expired self-service link");
    }
  }

  async function verifyRsvpClaims(
    token: string
  ): Promise<TrainingRsvpTokenClaims> {
    try {
      return await verifyRsvpToken(deps.tokenSecret, token);
    } catch {
      throw new ForbiddenError("Invalid or expired RSVP link");
    }
  }

  return {
    // --- Settings ---
    async getSettings(identity: SecurityIdentity | null | undefined) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      return deps.settings.getOrCreate(organizationId);
    },

    async updateSettings(
      identity: SecurityIdentity | null | undefined,
      input: UpdateTrainingSettingsInput
    ) {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      const current = await deps.settings.getOrCreate(organizationId);
      validateSettingsInput(
        {
          leadDays: current.leadDays,
          inductionDays: current.inductionDays,
          reminderDays: current.reminderDays,
          inviteSubject: current.inviteSubject,
          inviteBody: current.inviteBody,
          organiserEmail: current.organiserEmail,
          allowSelfUpload: current.allowSelfUpload,
          requireVerification: current.requireVerification,
          selfTokenDays: current.selfTokenDays,
          siteLabel: current.siteLabel,
          sites: current.sites,
          providers: current.providers,
        },
        input
      );
      const updated = await deps.settings.update(
        organizationId,
        input,
        subjectId
      );
      await deps.settings.appendLog(organizationId, {
        t: histStamp(),
        by: actorName(actor),
        what: `Settings updated: ${Object.keys(input).join(", ")}`,
      });
      return updated;
    },

    async getLog(identity: SecurityIdentity | null | undefined) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const settings = await deps.settings.getOrCreate(organizationId);
      return settings.log;
    },

    // --- Bootstrap ---
    async ensureCatalogue(identity: SecurityIdentity | null | undefined) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      const existing = await deps.competencies.list(organizationId, {
        includeArchived: true,
      });
      if (existing.length) {
        return { seeded: false as const, competencies: existing.length };
      }

      const who = actorName(actor);
      const keyToId = new Map<string, string>();
      for (const seed of DEFAULT_COMPETENCIES) {
        const created = await deps.competencies.create(organizationId, {
          key: seed.key,
          name: seed.name,
          months: seed.months,
          evidence: seed.evidence,
          basis: seed.basis,
          covers: seed.covers,
          quiz: seed.quiz ?? [],
          custom: false,
          archived: false,
        });
        keyToId.set(seed.key, created.id);
      }

      for (const seed of DEFAULT_ROLES) {
        const resolve = (keys: string[]) =>
          keys
            .map((k) => keyToId.get(k))
            .filter((id): id is string => Boolean(id));
        await deps.roles.create(organizationId, {
          key: seed.key,
          name: seed.name,
          mandatory: resolve(seed.mandatory),
          desirable: resolve(seed.desirable),
        });
      }

      await deps.settings.appendLog(organizationId, {
        t: histStamp(),
        by: who,
        what: `Seeded default catalogue: ${DEFAULT_COMPETENCIES.length} competencies, ${DEFAULT_ROLES.length} roles`,
      });

      return {
        seeded: true as const,
        competencies: DEFAULT_COMPETENCIES.length,
        roles: DEFAULT_ROLES.length,
      };
    },

    // --- Competencies ---
    async listCompetencies(
      identity: SecurityIdentity | null | undefined,
      opts?: { includeArchived?: boolean }
    ) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      return deps.competencies.list(organizationId, opts);
    },

    async createCompetency(
      identity: SecurityIdentity | null | undefined,
      input: CreateCompetencyInput
    ) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      validateCompetencyInput(input);
      const key =
        input.key?.trim() ||
        (await uniqueCompetencyKey(organizationId, input.name));
      if (await deps.competencies.findByKey(organizationId, key)) {
        throw new ValidationAppError(`Competency key "${key}" already exists`);
      }
      const created = await deps.competencies.create(organizationId, {
        ...input,
        key,
        custom: true,
      });
      await deps.settings.appendLog(organizationId, {
        t: histStamp(),
        by: actorName(actor),
        what: `Added competency "${created.name}" (${created.months ? `renews every ${created.months} mo` : "no expiry"}, ${created.evidence})`,
      });
      return created;
    },

    async updateCompetency(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateCompetencyInput
    ) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      const existing = await deps.competencies.findById(organizationId, id);
      if (!existing) throw new NotFoundError("Competency not found");
      if (
        input.name !== undefined ||
        input.months !== undefined ||
        input.evidence !== undefined ||
        input.quiz !== undefined
      ) {
        validateCompetencyInput({
          name: input.name ?? existing.name,
          months: input.months ?? existing.months,
          evidence: input.evidence ?? existing.evidence,
          quiz: input.quiz ?? existing.quiz,
        });
      }
      if (input.key && input.key !== existing.key) {
        const clash = await deps.competencies.findByKey(
          organizationId,
          input.key
        );
        if (clash && clash.id !== id) {
          throw new ValidationAppError(
            `Competency key "${input.key}" already exists`
          );
        }
      }
      const updated = await deps.competencies.update(
        organizationId,
        id,
        input
      );
      if (!updated) throw new NotFoundError("Competency not found");
      await deps.settings.appendLog(organizationId, {
        t: histStamp(),
        by: actorName(actor),
        what: `Updated competency "${updated.name}"`,
      });
      return updated;
    },

    async archiveCompetency(
      identity: SecurityIdentity | null | undefined,
      id: string
    ) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "delete");
      const archived = await deps.competencies.archive(organizationId, id);
      if (!archived) throw new NotFoundError("Competency not found");
      await deps.roles.removeCompetencyFromAll(organizationId, id);
      await deps.settings.appendLog(organizationId, {
        t: histStamp(),
        by: actorName(actor),
        what: `Archived competency "${archived.name}" (records retained)`,
      });
      return archived;
    },

    // --- Roles ---
    async listRoles(identity: SecurityIdentity | null | undefined) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      return deps.roles.list(organizationId);
    },

    async createRole(
      identity: SecurityIdentity | null | undefined,
      input: CreateRoleInput
    ) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      if (!input.name?.trim()) {
        throw new ValidationAppError("role name is required");
      }
      const key =
        input.key?.trim() ||
        (await uniqueRoleKey(organizationId, input.name));
      if (await deps.roles.findByKey(organizationId, key)) {
        throw new ValidationAppError(`Role key "${key}" already exists`);
      }
      const mandatory = await resolveCompetencyIds(
        organizationId,
        input.mandatory
      );
      const desirable = (
        await resolveCompetencyIds(organizationId, input.desirable)
      ).filter((id) => !mandatory.includes(id));
      const created = await deps.roles.create(organizationId, {
        key,
        name: input.name.trim(),
        mandatory,
        desirable,
        description: input.description,
      });
      await deps.settings.appendLog(organizationId, {
        t: histStamp(),
        by: actorName(actor),
        what: `Added role "${created.name}": ${mandatory.length} mandatory, ${desirable.length} desirable`,
      });
      return created;
    },

    async updateRole(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateRoleInput
    ) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      const existing = await deps.roles.findById(organizationId, id);
      if (!existing) throw new NotFoundError("Role not found");
      if (input.key && input.key !== existing.key) {
        if (existing.key === "all") {
          throw new ValidationAppError('The "All staff" role key cannot change');
        }
        const clash = await deps.roles.findByKey(organizationId, input.key);
        if (clash && clash.id !== id) {
          throw new ValidationAppError(`Role key "${input.key}" already exists`);
        }
      }
      const patch: UpdateRoleInput = { ...input };
      if (input.mandatory !== undefined) {
        patch.mandatory = await resolveCompetencyIds(
          organizationId,
          input.mandatory
        );
      }
      if (input.desirable !== undefined) {
        const mand =
          patch.mandatory ??
          existing.mandatory;
        patch.desirable = (
          await resolveCompetencyIds(organizationId, input.desirable)
        ).filter((cid) => !mand.includes(cid));
      }
      const updated = await deps.roles.update(organizationId, id, patch);
      if (!updated) throw new NotFoundError("Role not found");
      await deps.settings.appendLog(organizationId, {
        t: histStamp(),
        by: actorName(actor),
        what: `Updated role "${updated.name}": ${updated.mandatory.length} mandatory, ${updated.desirable.length} desirable`,
      });
      return updated;
    },

    async removeRole(
      identity: SecurityIdentity | null | undefined,
      id: string
    ) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "delete");
      const role = await deps.roles.findById(organizationId, id);
      if (!role) throw new NotFoundError("Role not found");
      if (role.key === "all") {
        throw new ValidationAppError(
          'The "All staff" role cannot be removed'
        );
      }
      const removed = await deps.roles.remove(organizationId, id);
      if (!removed) throw new NotFoundError("Role not found");

      const people = await deps.people.list(organizationId);
      for (const p of people) {
        if (!(p.roles || []).includes(id)) continue;
        await deps.people.update(organizationId, p.id, {
          roles: p.roles.filter((r) => r !== id),
          pushHist: histEntry(
            `Role removed: ${role.name}`,
            actorName(actor)
          ),
        });
      }

      await deps.settings.appendLog(organizationId, {
        t: histStamp(),
        by: actorName(actor),
        what: `Removed role "${role.name}"`,
      });
      return { ok: true as const };
    },

    // --- People ---
    async listPeople(
      identity: SecurityIdentity | null | undefined,
      filters?: {
        status?: string;
        site?: string;
        external?: boolean;
        role?: string;
        search?: string;
      }
    ) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      try {
        await syncOrgMembers(organizationId);
      } catch {
        // Non-fatal: people list still works without sync
      }
      let roleFilter = filters?.role;
      if (roleFilter && !isObjectIdLike(roleFilter)) {
        const role = await deps.roles.findByKey(organizationId, roleFilter);
        roleFilter = role?.id;
      }
      return deps.people.list(organizationId, {
        ...filters,
        role: roleFilter,
      });
    },

    async getPerson(
      identity: SecurityIdentity | null | undefined,
      id: string
    ) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read", id);
      return requirePerson(organizationId, id);
    },

    async createPerson(
      identity: SecurityIdentity | null | undefined,
      input: CreatePersonInput
    ) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      const M = await loadModel(organizationId);
      const roles = await resolveRoleIds(organizationId, input.roles);
      const extra = await resolveCompetencyIds(organizationId, input.extra);
      const draft = {
        name: input.name,
        status: input.status ?? ("Active" as const),
        site: input.site,
        roles,
        email: input.email ?? "",
      };
      const pr = validatePerson(M, draft);
      if (pr.length) throw new ValidationAppError(pr.join("; "));
      const who = actorName(actor);
      return deps.people.create(organizationId, {
        ...input,
        roles,
        extra,
        status: draft.status,
        hist: [histEntry("Added to the matrix", who)],
      });
    },

    async updatePerson(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdatePersonInput
    ) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "create", id);
      const existing = await requirePerson(organizationId, id);
      const M = await loadModel(organizationId);
      const roles =
        input.roles !== undefined
          ? await resolveRoleIds(organizationId, input.roles)
          : existing.roles;
      const extra =
        input.extra !== undefined
          ? await resolveCompetencyIds(organizationId, input.extra)
          : existing.extra;
      const draft = {
        name: input.name ?? existing.name,
        status: input.status ?? existing.status,
        site: input.site ?? existing.site,
        roles,
        email:
          input.email !== undefined ? input.email : existing.email,
      };
      const pr = validatePerson(M, draft);
      if (pr.length) throw new ValidationAppError(pr.join("; "));
      const who = actorName(actor);
      const changed: string[] = [];
      for (const key of [
        "name",
        "roles",
        "site",
        "manager",
        "start",
        "email",
        "status",
        "end",
        "extra",
        "external",
        "company",
      ] as const) {
        if (input[key] !== undefined) changed.push(key);
      }
      return (
        (await deps.people.update(organizationId, id, {
          ...input,
          roles: input.roles !== undefined ? roles : undefined,
          extra: input.extra !== undefined ? extra : undefined,
          pushHist: changed.length
            ? histEntry(`Updated: ${changed.join(", ")}`, who)
            : undefined,
        })) ?? existing
      );
    },

    async markLeaver(
      identity: SecurityIdentity | null | undefined,
      id: string,
      date?: string
    ) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "create", id);
      await requirePerson(organizationId, id);
      const end = date || isoDate();
      const who = actorName(actor);
      const updated = await deps.people.update(organizationId, id, {
        status: "Leaver",
        end,
        pushHist: histEntry(`Marked as leaver · ${end}`, who),
      });
      if (!updated) throw new NotFoundError("Person not found");
      return updated;
    },

    async addExternal(
      identity: SecurityIdentity | null | undefined,
      input: CreateExternalPersonInput
    ) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      if (!input.name?.trim()) {
        throw new ValidationAppError("name is required");
      }
      if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
        throw new ValidationAppError(
          "a valid email is required for external people"
        );
      }
      const existing = await deps.people.findByEmail(
        organizationId,
        input.email
      );
      if (existing?.external) return existing;
      const who = actorName(actor);
      return deps.people.create(organizationId, {
        name: input.name.trim(),
        email: input.email.trim(),
        site: input.company?.trim() || "External",
        company: input.company?.trim() || "",
        external: true,
        status: "Active",
        roles: [],
        hist: [histEntry("Added as external attendee", who)],
      });
    },

    async setExemption(
      identity: SecurityIdentity | null | undefined,
      personId: string,
      cid: string,
      reason: string
    ) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "create", personId);
      const person = await requirePerson(organizationId, personId);
      const competencyId = await resolveCompetencyId(organizationId, cid);
      const comp = await deps.competencies.findById(
        organizationId,
        competencyId
      );
      if (!comp) throw new ValidationAppError("Unknown competency");
      if (!reason?.trim()) {
        throw new ValidationAppError(
          "A reason is required (the auditor will ask)"
        );
      }
      const who = actorName(actor);
      const exempt = [
        ...(person.exempt || []).filter((e) => e.cid !== competencyId),
        {
          cid: competencyId,
          reason: reason.trim(),
          by: who,
          date: isoDate(),
        },
      ];
      const updated = await deps.people.update(organizationId, personId, {
        exempt,
        pushHist: histEntry(
          `Not applicable: ${comp.name} — ${reason.trim()}`,
          who
        ),
      });
      if (!updated) throw new NotFoundError("Person not found");
      return updated;
    },

    async clearExemption(
      identity: SecurityIdentity | null | undefined,
      personId: string,
      cid: string
    ) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "create", personId);
      const person = await requirePerson(organizationId, personId);
      const competencyId = await resolveCompetencyId(organizationId, cid);
      const had = (person.exempt || []).some(
        (e) => e.cid === competencyId || e.cid === cid
      );
      const comp = await deps.competencies.findById(
        organizationId,
        competencyId
      );
      const who = actorName(actor);
      const updated = await deps.people.update(organizationId, personId, {
        exempt: (person.exempt || []).filter(
          (e) => e.cid !== competencyId && e.cid !== cid
        ),
        pushHist: had
          ? histEntry(
              `${comp?.name || cid} applies again`,
              who
            )
          : undefined,
      });
      if (!updated) throw new NotFoundError("Person not found");
      return updated;
    },

    async issueSelfToken(
      identity: SecurityIdentity | null | undefined,
      personId: string
    ) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "create", personId);
      await requirePerson(organizationId, personId);
      const settings = await deps.settings.getOrCreate(organizationId);
      const token = await signSelfToken(
        deps.tokenSecret,
        { organizationId, personId },
        settings.selfTokenDays || 90
      );
      return {
        token,
        url: selfPublicUrl(deps.clientUrl, token),
        expiresInDays: settings.selfTokenDays || 90,
      };
    },

    // --- Records ---
    async listRecords(
      identity: SecurityIdentity | null | undefined,
      opts?: { personId?: string }
    ) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      return deps.records.list(organizationId, opts);
    },

    async createRecord(
      identity: SecurityIdentity | null | undefined,
      input: CreateRecordInput
    ) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      const M = await loadModel(organizationId);
      const cid = await resolveCompetencyId(organizationId, input.cid);
      const { date, comp } = validateRecord(M, { ...input, cid });
      const who = actorName(actor);
      const result = input.result || "Pass";
      const record = await deps.records.create(organizationId, {
        personId: input.personId,
        cid,
        date,
        result,
        provider: input.provider,
        ref: input.ref,
        fileId: input.fileId,
        note: input.note,
        verifiedBy: who,
        toVerify: false,
        t: histStamp(),
      });
      await appendPersonHist(
        organizationId,
        input.personId,
        `${comp.name}: ${result}${input.ref ? ` · ${input.ref}` : ""}${
          input.provider ? ` · ${input.provider}` : ""
        }`,
        who
      );
      const person = await deps.people.findById(organizationId, input.personId);
      const fileName =
        storageInfoFromFileId(input.fileId)?.Name || "evidence";
      queueTrainingFile({
        organizationId,
        createdBy: actor.subjectId,
        sourceKey: `training:record:${record.id}`,
        name: `${person?.name || "Person"} — ${comp.name} — ${fileName}`,
        fileId: input.fileId,
        sourceLabel: person?.name || null,
        folderName: "Records",
      });
      return record;
    },

    async verifyRecord(
      identity: SecurityIdentity | null | undefined,
      id: string
    ) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      const existing = await requireRecord(organizationId, id);
      const who = actorName(actor);
      const updated = await deps.records.update(organizationId, id, {
        toVerify: false,
        verifiedBy: who,
      });
      if (!updated) throw new NotFoundError("Record not found");
      const comp = await deps.competencies.findById(
        organizationId,
        existing.cid
      );
      await appendPersonHist(
        organizationId,
        existing.personId,
        `Verified: ${comp?.name || existing.cid}`,
        who
      );
      return updated;
    },

    async acknowledgePolicy(
      identity: SecurityIdentity | null | undefined,
      personId: string,
      cid: string,
      answers?: number[]
    ) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      const person = await requirePerson(organizationId, personId);
      const competencyId = await resolveCompetencyId(organizationId, cid);
      const comp = await deps.competencies.findById(
        organizationId,
        competencyId
      );
      if (!comp) throw new ValidationAppError("Unknown competency");
      acknowledgePolicyAnswers(comp, answers);
      const who = actorName(actor);
      const date = isoDate();
      const record = await deps.records.create(organizationId, {
        personId,
        cid: competencyId,
        date,
        result: "Pass",
        provider: "Self-service",
        ref: `ack ${date}`,
        verifiedBy: who,
        toVerify: false,
        t: histStamp(),
      });
      await appendPersonHist(
        organizationId,
        personId,
        `${comp.name}: Pass · ack ${date}`,
        who || person.name
      );
      return record;
    },

    // --- Sessions ---
    async listSessions(
      identity: SecurityIdentity | null | undefined,
      opts?: { status?: string; cid?: string }
    ) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      let cid = opts?.cid;
      if (cid && !isObjectIdLike(cid)) {
        const comp = await deps.competencies.findByKey(organizationId, cid);
        cid = comp?.id;
      }
      return deps.sessions.list(organizationId, {
        status: opts?.status,
        cid,
      });
    },

    async getSession(
      identity: SecurityIdentity | null | undefined,
      id: string
    ) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read", id);
      return requireSession(organizationId, id);
    },

    async createSession(
      identity: SecurityIdentity | null | undefined,
      input: CreateSessionInput
    ) {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      if (!input.date) {
        throw new ValidationAppError("Session date is required");
      }
      const cid = await resolveCompetencyId(organizationId, input.cid);
      const comp = await deps.competencies.findById(organizationId, cid);
      if (!comp) throw new ValidationAppError("Unknown competency");
      const who = actorName(actor);
      const attendees = [...new Set(input.attendees || [])];
      const session = await deps.sessions.create(organizationId, {
        ...input,
        cid,
        attendees,
        createdBy: subjectId,
        status: "Planned",
      });
      for (const pid of attendees) {
        const p = await deps.people.findById(organizationId, pid);
        if (p) {
          await appendPersonHist(
            organizationId,
            pid,
            `Booked: ${comp.name} on ${session.date}${
              session.provider ? ` · ${session.provider}` : ""
            }`,
            who
          );
        }
      }
      return session;
    },

    async updateSession(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateSessionInput
    ) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "create", id);
      const existing = await requireSession(organizationId, id);
      if (
        existing.status === "Completed" &&
        (input.date || input.cid)
      ) {
        throw new ValidationAppError(
          "A completed session cannot be re-dated"
        );
      }
      const who = actorName(actor);
      let cid = existing.cid;
      if (input.cid) {
        cid = await resolveCompetencyId(organizationId, input.cid);
      }
      const comp = await deps.competencies.findById(organizationId, cid);
      if (!comp) throw new ValidationAppError("Unknown competency");

      const nextAttendees = input.attendees
        ? [...new Set(input.attendees)]
        : undefined;
      const added =
        nextAttendees?.filter((pid) => !existing.attendees.includes(pid)) ||
        [];

      const updated = await deps.sessions.update(organizationId, id, {
        ...input,
        cid,
        attendees: nextAttendees,
      });
      if (!updated) throw new NotFoundError("Session not found");

      for (const pid of added) {
        const p = await deps.people.findById(organizationId, pid);
        if (p) {
          await appendPersonHist(
            organizationId,
            pid,
            `Booked: ${comp.name} on ${updated.date}${
              updated.provider ? ` · ${updated.provider}` : ""
            }`,
            who
          );
        }
      }
      return updated;
    },

    async cancelSession(
      identity: SecurityIdentity | null | undefined,
      id: string,
      reason?: string
    ) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "create", id);
      const existing = await requireSession(organizationId, id);
      const who = actorName(actor);
      const comp = await deps.competencies.findById(
        organizationId,
        existing.cid
      );
      const updated = await deps.sessions.update(organizationId, id, {
        status: "Cancelled",
        cancelReason: reason || "",
      });
      if (!updated) throw new NotFoundError("Session not found");
      for (const pid of existing.attendees) {
        await appendPersonHist(
          organizationId,
          pid,
          `Session cancelled: ${comp?.name || existing.cid} on ${existing.date}${
            reason ? ` · ${reason}` : ""
          }`,
          who
        );
      }
      return updated;
    },

    async completeSession(
      identity: SecurityIdentity | null | undefined,
      id: string,
      outcomes?: Record<string, SessionOutcome>
    ) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "create", id);
      const session = await requireSession(organizationId, id);
      if (session.status === "Cancelled") {
        throw new ValidationAppError("Session was cancelled");
      }
      if (session.status === "Completed") {
        throw new ValidationAppError("Session already completed");
      }
      const who = actorName(actor);
      const M = await loadModel(organizationId);
      const comp = findCompetency(M, session.cid);
      const outputFileId =
        (session.outputs || []).find((o) => o.fileId)?.fileId || null;
      const made: TrainingRecord[] = [];

      for (const pid of session.attendees) {
        const o = (outcomes && outcomes[pid]) || { result: "Pass" as const };
        if (o.result === "Absent") {
          await appendPersonHist(
            organizationId,
            pid,
            `Did not attend: ${comp?.name || session.cid} on ${session.date}`,
            who
          );
          continue;
        }
        const result = (o.result || "Pass") as Exclude<
          SessionOutcome["result"],
          "Absent" | undefined
        >;
        const fileId = o.fileId !== undefined ? o.fileId : outputFileId;
        const { date } = validateRecord(M, {
          personId: pid,
          cid: session.cid,
          date: session.date,
          result,
          provider: session.provider,
          ref: o.ref || `session ${session.id}`,
          fileId,
          note: o.note,
        });
        const record = await deps.records.create(organizationId, {
          personId: pid,
          cid: session.cid,
          date,
          result,
          provider: session.provider,
          ref: o.ref || `session ${session.id}`,
          fileId,
          note: o.note,
          verifiedBy: who,
          toVerify: false,
          t: histStamp(),
        });
        await appendPersonHist(
          organizationId,
          pid,
          `${comp?.name || session.cid}: ${result}${
            record.ref ? ` · ${record.ref}` : ""
          }${session.provider ? ` · ${session.provider}` : ""}`,
          who
        );
        const person = await deps.people.findById(organizationId, pid);
        const fileName =
          storageInfoFromFileId(fileId)?.Name || "evidence";
        queueTrainingFile({
          organizationId,
          createdBy: actor.subjectId,
          sourceKey: `training:record:${record.id}`,
          name: `${person?.name || "Person"} — ${comp?.name || session.cid} — ${fileName}`,
          fileId,
          sourceLabel: person?.name || null,
          folderName: "Records",
        });
        made.push(record);
      }

      const updated = await deps.sessions.update(organizationId, id, {
        status: "Completed",
        completedBy: who,
        completedAt: new Date(),
      });
      if (!updated) throw new NotFoundError("Session not found");
      return { session: updated, records: made };
    },

    async addAttachment(
      identity: SecurityIdentity | null | undefined,
      sessionId: string,
      kind: "materials" | "outputs",
      file: {
        name: string;
        size?: number;
        type?: string;
        fileId?: string | null;
        url?: string | null;
        shared?: boolean;
        note?: string;
      }
    ) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "create", sessionId);
      const session = await requireSession(organizationId, sessionId);
      if (!file?.name?.trim()) {
        throw new ValidationAppError("file name is required");
      }
      const who = actorName(actor);
      const attachment: TrainingAttachment = {
        id: randomUUID().replace(/-/g, "").slice(0, 12),
        name: file.name.trim(),
        size: Number(file.size) || 0,
        type: file.type || "",
        fileId: file.fileId ?? null,
        url: file.url ?? null,
        shared: kind === "materials" ? file.shared !== false : false,
        note: file.note || "",
        by: who,
        t: histStamp(),
      };
      const list =
        kind === "materials"
          ? [...session.materials, attachment]
          : [...session.outputs, attachment];
      const updated = await deps.sessions.update(organizationId, sessionId, {
        [kind]: list,
      });
      if (!updated) throw new NotFoundError("Session not found");
      const competency = await deps.competencies.findById(
        organizationId,
        session.cid
      );
      queueTrainingFile({
        organizationId,
        createdBy: actor.subjectId,
        sourceKey: `training:session:${sessionId}:${attachment.id}`,
        name: `${competency?.name || "Session"} — ${attachment.name}`,
        fileId: attachment.fileId,
        sourceLabel: competency?.name || null,
        folderName: kind === "materials" ? "Materials" : "Outputs",
      });
      return attachment;
    },

    async removeAttachment(
      identity: SecurityIdentity | null | undefined,
      sessionId: string,
      kind: "materials" | "outputs",
      attachmentId: string
    ) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "create", sessionId);
      const session = await requireSession(organizationId, sessionId);
      const list = (kind === "materials" ? session.materials : session.outputs)
        .filter((a) => a.id !== attachmentId);
      const updated = await deps.sessions.update(organizationId, sessionId, {
        [kind]: list,
      });
      if (!updated) throw new NotFoundError("Session not found");
      return { ok: true as const };
    },

    async inviteSession(
      identity: SecurityIdentity | null | undefined,
      sessionId: string,
      opts?: { personIds?: string[] }
    ) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "create", sessionId);
      const session = await requireSession(organizationId, sessionId);
      const M = await loadModel(organizationId);
      const who = actorName(actor);
      const ids =
        opts?.personIds?.length ? opts.personIds : session.attendees;
      const results: Array<{
        personId: string;
        to: string;
        status: TrainingInviteLog["status"];
        error?: string;
        subject?: string;
      }> = [];
      const inviteLogs: TrainingInviteLog[] = [...session.invites];

      for (const pid of ids) {
        const person = await deps.people.findById(organizationId, pid);
        if (!person) continue;
        const inv = await buildInviteFor(M, session, person);
        if (!inv.to) {
          const log: TrainingInviteLog = {
            personId: pid,
            to: "",
            status: "no-email",
            t: histStamp(),
            by: who,
          };
          inviteLogs.push(log);
          results.push({
            personId: pid,
            to: "",
            status: "no-email",
          });
          continue;
        }
        try {
          await deps.email.send({
            to: [inv.to],
            subject: inv.subject,
            html: inv.html,
            text: inv.text,
            organizationId,
            attachments: [
              {
                filename: "invite.ics",
                content: inv.ics,
                contentType: "text/calendar; method=REQUEST; charset=UTF-8",
              },
            ],
          });
          const log: TrainingInviteLog = {
            personId: pid,
            to: inv.to,
            status: "sent",
            t: histStamp(),
            by: who,
          };
          inviteLogs.push(log);
          results.push({
            personId: pid,
            to: inv.to,
            status: "sent",
            subject: inv.subject,
          });
        } catch (err) {
          const error =
            err instanceof Error ? err.message : "Failed to send invite";
          inviteLogs.push({
            personId: pid,
            to: inv.to,
            status: "error",
            t: histStamp(),
            by: who,
            error,
          });
          results.push({
            personId: pid,
            to: inv.to,
            status: "error",
            error,
          });
        }
      }

      const updated = await deps.sessions.update(organizationId, sessionId, {
        invites: inviteLogs,
      });
      if (!updated) throw new NotFoundError("Session not found");

      const sent = results.filter((r) => r.status === "sent").length;
      const notSent = results.length - sent;
      const comp = findCompetency(M, session.cid);
      await deps.settings.appendLog(organizationId, {
        t: histStamp(),
        by: who,
        what: `Invitations for ${comp?.name || session.cid} on ${session.date}: ${sent} sent, ${notSent} not sent`,
      });

      return { session: updated, results };
    },

    async rsvpSession(
      identity: SecurityIdentity | null | undefined,
      sessionId: string,
      personId: string,
      status: TrainingRsvpStatus,
      note?: string
    ) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "create", sessionId);
      const session = await requireSession(organizationId, sessionId);
      assertRsvp(session, personId, status);
      const who = actorName(actor);
      const person = await requirePerson(organizationId, personId);
      const entry = {
        status,
        note: (note || "").trim().slice(0, 300),
        t: histStamp(),
      };
      const rsvp = { ...session.rsvp, [personId]: entry };
      const updated = await deps.sessions.update(organizationId, sessionId, {
        rsvp,
      });
      if (!updated) throw new NotFoundError("Session not found");
      const comp = await deps.competencies.findById(
        organizationId,
        session.cid
      );
      await appendPersonHist(
        organizationId,
        personId,
        `${status.charAt(0).toUpperCase() + status.slice(1)}: ${
          comp?.name || session.cid
        } on ${session.date}${
          note ? ` · ${note.trim().slice(0, 120)}` : ""
        }`,
        who || person.name
      );
      return entry;
    },

    // --- Read models ---
    async overview(
      identity: SecurityIdentity | null | undefined
    ): Promise<TrainingOverview> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      try {
        await syncOrgMembers(organizationId);
      } catch {
        // Non-fatal
      }
      const M = await loadModel(organizationId);
      const ppl = activePeople(M);
      const g = gaps(M);
      const RD = readiness(M);
      const compliantPeople = ppl.filter(
        (p) => personSummary(M, p).compliant
      ).length;
      return {
        peopleActive: ppl.length,
        peopleLeavers: M.people.filter((p) => p.status === "Leaver").length,
        competencies: M.competencies.filter((c) => !c.archived).length,
        roles: M.roles.length,
        gapsMissing: g.filter((x) => x.st === "none" || x.st === "grace")
          .length,
        gapsOver: g.filter((x) => x.st === "over").length,
        gapsSoon: g.filter((x) => x.st === "soon").length,
        sessionsPlanned: M.sessions.filter((s) => s.status === "Planned")
          .length,
        readinessOk: RD.filter((r) => r.ok).length,
        readinessTotal: RD.length,
        compliantPeople,
      };
    },

    async matrix(identity: SecurityIdentity | null | undefined) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      try {
        await syncOrgMembers(organizationId);
      } catch {
        // Non-fatal
      }
      const M = await loadModel(organizationId);
      const people = activePeople(M).map((p) => ({
        person: p,
        summary: personSummary(M, p),
        cells: matrixRow(M, p),
      }));
      return {
        competencies: M.competencies.filter((c) => !c.archived),
        roles: M.roles,
        people,
      };
    },

    async gaps(identity: SecurityIdentity | null | undefined) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const M = await loadModel(organizationId);
      return gaps(M).map((g) => ({
        personId: g.person.id,
        person: g.person.name,
        cid: g.comp.id,
        competency: g.comp.name,
        st: g.st,
        next: g.next,
        days: g.days,
      }));
    },

    async plan(
      identity: SecurityIdentity | null | undefined,
      months = 3
    ) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const M = await loadModel(organizationId);
      return plan(M, months).map((n) => ({
        cid: n.comp.id,
        competency: n.comp.name,
        soonest: n.soonest,
        people: n.people.map((p) => p.id),
        unbooked: n.unbooked.map((p) => p.id),
      }));
    },

    async readiness(identity: SecurityIdentity | null | undefined) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const M = await loadModel(organizationId);
      return readiness(M);
    },

    async auditorPack(
      identity: SecurityIdentity | null | undefined,
      format: "html" | "pdf" = "html"
    ): Promise<{
      contentType: string;
      body: Buffer | string;
      filename: string;
      /** Present for HTML so existing `{ html }` clients keep working. */
      html?: string;
    }> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const M = await loadModel(organizationId);
      if (!M.org) {
        try {
          M.org = await deps.org.getOrganizationName(organizationId);
        } catch {
          M.org = "Organisation";
        }
      }
      const asOf = new Date().toISOString().slice(0, 10);
      if (format === "pdf") {
        const body = await buildTrainingAuditorPackPdf({ model: M });
        return {
          contentType: "application/pdf",
          body,
          filename: `training-auditor-pack-${asOf}.pdf`,
        };
      }
      const html = buildTrainingAuditorPackHtml({ model: M });
      return {
        contentType: "text/html; charset=utf-8",
        body: html,
        filename: `training-auditor-pack-${asOf}.html`,
        html,
      };
    },

    async exportMatrixCsv(identity: SecurityIdentity | null | undefined) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const M = await loadModel(organizationId);
      return matrixCsv(M);
    },

    async competent(
      identity: SecurityIdentity | null | undefined,
      personId: string,
      covers: string
    ): Promise<CompetentResult> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const M = await loadModel(organizationId);
      return isCompetent(M, personId, covers);
    },

    // --- Public self ---
    async resolveSelfToken(token: string) {
      return verifySelfClaims(token);
    },

    async getSelfView(token: string) {
      const claims = await verifySelfClaims(token);
      const M = await loadModel(claims.organizationId);
      const person = await requirePerson(
        claims.organizationId,
        claims.personId
      );
      if (person.status === "Leaver") {
        throw new ForbiddenError("This person is no longer active");
      }
      const cells = matrixRow(M, person);
      const summary = personSummary(M, person);
      const booked = M.sessions.filter(
        (s) =>
          s.status === "Planned" && s.attendees.includes(person.id)
      );
      return {
        organizationId: claims.organizationId,
        orgName: M.org,
        person,
        summary,
        cells,
        booked,
        settings: {
          allowSelfUpload: M.settings.allowSelfUpload,
          requireVerification: M.settings.requireVerification,
        },
        competencies: M.competencies.filter((c) => !c.archived),
      };
    },

    async selfAcknowledge(
      token: string,
      input: { cid: string; answers?: number[] }
    ) {
      const claims = await verifySelfClaims(token);
      const person = await requirePerson(
        claims.organizationId,
        claims.personId
      );
      const competencyId = await resolveCompetencyId(
        claims.organizationId,
        input.cid
      );
      const comp = await deps.competencies.findById(
        claims.organizationId,
        competencyId
      );
      if (!comp) throw new ValidationAppError("Unknown competency");
      acknowledgePolicyAnswers(comp, input.answers);
      const date = isoDate();
      const record = await deps.records.create(claims.organizationId, {
        personId: person.id,
        cid: competencyId,
        date,
        result: "Pass",
        provider: "Self-service",
        ref: `ack ${date}`,
        verifiedBy: person.name,
        toVerify: false,
        t: histStamp(),
      });
      await appendPersonHist(
        claims.organizationId,
        person.id,
        `${comp.name}: Pass · ack ${date}`,
        person.name
      );
      return record;
    },

    async selfUpload(
      token: string,
      input: {
        cid: string;
        date?: string;
        provider?: string;
        ref?: string;
        fileId?: string | null;
        note?: string;
      }
    ) {
      const claims = await verifySelfClaims(token);
      const settings = await deps.settings.getOrCreate(claims.organizationId);
      if (!settings.allowSelfUpload) {
        throw new ForbiddenError("Self-service upload is disabled");
      }
      const person = await requirePerson(
        claims.organizationId,
        claims.personId
      );
      const M = await loadModel(claims.organizationId);
      const cid = await resolveCompetencyId(claims.organizationId, input.cid);
      const providerBase = input.provider?.trim() || "Self-uploaded";
      const provider = `${providerBase} · to verify`;
      const { date, comp } = validateRecord(M, {
        personId: person.id,
        cid,
        date: input.date,
        result: "Pass",
        provider,
        ref: input.ref,
        fileId: input.fileId,
        note: input.note,
      });
      const record = await deps.records.create(claims.organizationId, {
        personId: person.id,
        cid,
        date,
        result: "Pass",
        provider,
        ref: input.ref,
        fileId: input.fileId,
        note: input.note,
        verifiedBy: "",
        toVerify: settings.requireVerification,
        t: histStamp(),
      });
      await appendPersonHist(
        claims.organizationId,
        person.id,
        `${comp.name}: Pass${input.ref ? ` · ${input.ref}` : ""} · ${provider}`,
        person.name
      );
      const fileName =
        storageInfoFromFileId(input.fileId)?.Name || "evidence";
      queueTrainingFile({
        organizationId: claims.organizationId,
        createdBy: person.userId || person.id,
        sourceKey: `training:record:${record.id}`,
        name: `${person.name} — ${comp.name} — ${fileName}`,
        fileId: input.fileId,
        sourceLabel: person.name,
        folderName: "Records",
      });
      if (person.manager) {
        try {
          await deps.notifications.notifyPerson({
            organizationId: claims.organizationId,
            title: `Training evidence to verify: ${person.name}`,
            body: `${person.name} uploaded evidence for ${comp.name}.`,
          });
        } catch {
          // non-fatal
        }
      }
      return record;
    },

    async prepareSelfUpload(
      token: string,
      input: {
        fileName: string;
        contentType?: string;
        fileSize?: number;
      }
    ) {
      const claims = await verifySelfClaims(token);
      const settings = await deps.settings.getOrCreate(claims.organizationId);
      if (!settings.allowSelfUpload) {
        throw new ForbiddenError("Self-service upload is disabled");
      }
      await requirePerson(claims.organizationId, claims.personId);
      if (!input.fileName?.trim()) {
        throw new ValidationAppError("fileName is required");
      }
      return deps.files.createSignedUpload({
        organizationId: claims.organizationId,
        fileName: input.fileName.trim(),
        contentType: input.contentType,
        fileSize: input.fileSize,
      });
    },

    // --- Public RSVP ---
    async resolveRsvpToken(token: string) {
      return verifyRsvpClaims(token);
    },

    async getRsvpView(token: string) {
      const claims = await verifyRsvpClaims(token);
      const [session, person, settings] = await Promise.all([
        requireSession(claims.organizationId, claims.sessionId),
        requirePerson(claims.organizationId, claims.personId),
        deps.settings.getOrCreate(claims.organizationId),
      ]);
      if (!session.attendees.includes(person.id)) {
        throw new ForbiddenError("Not invited to this session");
      }
      const comp = await deps.competencies.findById(
        claims.organizationId,
        session.cid
      );
      const current = session.rsvp?.[person.id] || null;
      return {
        organizationId: claims.organizationId,
        orgName: settings.orgName,
        session,
        person,
        competency: comp,
        current,
        materials: (session.materials || []).filter((a) => a.shared),
      };
    },

    async publicRsvp(
      token: string,
      input: { status: TrainingRsvpStatus; note?: string }
    ) {
      const claims = await verifyRsvpClaims(token);
      const session = await requireSession(
        claims.organizationId,
        claims.sessionId
      );
      assertRsvp(session, claims.personId, input.status);
      const person = await requirePerson(
        claims.organizationId,
        claims.personId
      );
      const entry = {
        status: input.status,
        note: (input.note || "").trim().slice(0, 300),
        t: histStamp(),
      };
      const rsvp = { ...session.rsvp, [claims.personId]: entry };
      const updated = await deps.sessions.update(
        claims.organizationId,
        claims.sessionId,
        { rsvp }
      );
      if (!updated) throw new NotFoundError("Session not found");
      const comp = await deps.competencies.findById(
        claims.organizationId,
        session.cid
      );
      await appendPersonHist(
        claims.organizationId,
        claims.personId,
        `${input.status.charAt(0).toUpperCase() + input.status.slice(1)}: ${
          comp?.name || session.cid
        } on ${session.date}${
          input.note ? ` · ${input.note.trim().slice(0, 120)}` : ""
        }`,
        person.name
      );
      return entry;
    },

    // --- Chase ---
    listOrganizationIds: () => deps.settings.listOrganizationIds(),

    async runDailyChase(organizationId: string): Promise<{
      sessionReminders: number;
      expiring: number;
      expired: number;
    }> {
      const M = await loadModel(organizationId);
      if (!M.org) {
        try {
          M.org = await deps.org.getOrganizationName(organizationId);
        } catch {
          M.org = "Organisation";
        }
      }
      const due = remindersDue(M);
      let sessionReminders = 0;
      let expiring = 0;
      let expired = 0;

      for (const d of due) {
        const person = M.people.find((p) => p.id === d.personId);
        if (!person?.email) continue;

        try {
          if (d.kind === "session") {
            const session = M.sessions.find((s) => s.id === d.sessionId);
            if (!session) continue;
            const inv = await buildInviteFor(M, session, person);
            const pendingNote =
              d.rsvp === "pending"
                ? "You have not yet responded to this invitation.\n\n"
                : "";
            const mail = buildReminderMail({
              kind: "session",
              orgName: M.org,
              personName: person.name,
              course: findCompetency(M, session.cid)?.name,
              sessionDate: session.date,
              days: d.days,
              selfUrl: selfPublicUrl(
                deps.clientUrl,
                await signSelfToken(
                  deps.tokenSecret,
                  { organizationId, personId: person.id },
                  M.settings.selfTokenDays || 90
                )
              ),
            });
            await deps.email.send({
              to: [person.email],
              subject: `Reminder (${d.days} day${
                d.days === 1 ? "" : "s"
              }): ${inv.subject}`,
              html: mail.html,
              text: pendingNote + (mail.text || inv.text),
              organizationId,
              attachments: [
                {
                  filename: "invite.ics",
                  content: inv.ics,
                  contentType:
                    "text/calendar; method=REQUEST; charset=UTF-8",
                },
              ],
            });
            sessionReminders += 1;
          } else {
            const comp = findCompetency(M, d.cid);
            const selfToken = await signSelfToken(
              deps.tokenSecret,
              {
                organizationId,
                personId: person.id,
              },
              M.settings.selfTokenDays || 90
            );
            const selfLink = selfPublicUrl(deps.clientUrl, selfToken);
            const mail = buildReminderMail({
              kind: d.kind,
              orgName: M.org,
              personName: person.name,
              course: comp?.name || d.cid,
              days: d.days,
              manager: d.manager,
              selfUrl: selfLink,
            });
            await deps.email.send({
              to: [person.email],
              subject: mail.subject,
              html: mail.html,
              text: mail.text,
              organizationId,
            });
            if (d.kind === "expiring") expiring += 1;
            else expired += 1;
          }
        } catch {
          // Continue other reminders
        }
      }

      return { sessionReminders, expiring, expired };
    },

    async syncDocumentsToLibrary(
      identity: SecurityIdentity | null | undefined
    ): Promise<TrainingLibrarySyncResult> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const result: TrainingLibrarySyncResult = {
        scanned: 0,
        created: 0,
        existing: 0,
        failed: 0,
      };
      const tally = (status: Awaited<ReturnType<typeof registerTrainingFile>>) => {
        result.scanned += 1;
        if (status === "created") result.created += 1;
        else if (status === "existing") result.existing += 1;
        else if (status === "failed") result.failed += 1;
      };

      const [records, sessions, people, competencies] = await Promise.all([
        deps.records.list(organizationId),
        deps.sessions.list(organizationId),
        deps.people.list(organizationId),
        deps.competencies.list(organizationId),
      ]);
      const personById = new Map(people.map((p) => [p.id, p]));
      const competencyById = new Map(competencies.map((c) => [c.id, c]));

      for (const record of records) {
        if (!record.fileId) continue;
        const person = personById.get(record.personId);
        const comp = competencyById.get(record.cid);
        const fileName =
          storageInfoFromFileId(record.fileId)?.Name || "evidence";
        tally(
          await registerTrainingFile({
            organizationId,
            createdBy: subjectId,
            sourceKey: `training:record:${record.id}`,
            name: `${person?.name || "Person"} — ${comp?.name || record.cid} — ${fileName}`,
            fileId: record.fileId,
            sourceLabel: person?.name || null,
            folderName: "Records",
          })
        );
      }

      for (const session of sessions) {
        const competency = competencyById.get(session.cid);
        for (const kind of ["materials", "outputs"] as const) {
          const list =
            kind === "materials" ? session.materials : session.outputs;
          for (const attachment of list || []) {
            if (!attachment.fileId) continue;
            tally(
              await registerTrainingFile({
                organizationId,
                createdBy: subjectId,
                sourceKey: `training:session:${session.id}:${attachment.id}`,
                name: `${competency?.name || "Session"} — ${attachment.name}`,
                fileId: attachment.fileId,
                sourceLabel: competency?.name || null,
                folderName: kind === "materials" ? "Materials" : "Outputs",
              })
            );
          }
        }
      }

      return result;
    },
  };
}
