import { getOrganisationModel } from "../../../src/modules/organisation/repositories/organisation.model";
import { getOrganisationMembershipModel } from "../../../src/modules/organisation/repositories/organisation-membership.model";
import { getUserModel } from "../../../src/modules/users/repositories/user.model";
import { getUnitMembershipModel } from "../../../src/modules/users/repositories/unit-membership.model";
import { getFunctionalUnitModel } from "../../../src/modules/functional-units/repositories/functional-unit.model";
import { getBusinessPremiseModel } from "../../../src/modules/business-premise/repositories/business-premise.model";
import { getInvitationModel } from "../../../src/modules/invitations/repositories/invitation.model";
import { getPartnershipModel } from "../../../src/modules/partnerships/repositories/partnership.model";
import { getLicenceRequestModel } from "../../../src/modules/licence-requests/repositories/licence-request.model";
import type { EntityStat, MigrateContext, TenantHandle, WaveReport } from "../types";
import { emptyEntityStat } from "../report";
import { countCollection, iterateCollection } from "../v4-connection";
import { upsertById } from "../upsert";
import { asId } from "../transforms/common";
import {
  transformBusinessPremise,
  transformFunctionalUnit,
  transformInvitation,
  transformLicenceRequest,
  transformMembership,
  transformOrganisation,
  transformPartnership,
  transformUnitMemberships,
  transformUser,
} from "../transforms/wave1";
import { attachValidation } from "../validation";

async function migrateCollection(
  tenant: TenantHandle,
  v4Name: string,
  stat: EntityStat,
  ctx: MigrateContext,
  mapDoc: (
    doc: Record<string, unknown>
  ) => Record<string, unknown> | null | { skip?: boolean; docs?: Record<string, unknown>[] }
  ,
  writeOne: (doc: Record<string, unknown>) => Promise<void>
): Promise<void> {
  stat.v4Count = await countCollection(tenant.connection, v4Name);
  for await (const batch of iterateCollection(tenant.connection, v4Name)) {
    for (const raw of batch) {
      try {
        const mapped = mapDoc(raw);
        if (!mapped) {
          stat.skipped += 1;
          continue;
        }
        if ("skip" in mapped && mapped.skip) {
          stat.skipped += 1;
          continue;
        }
        if ("docs" in mapped && mapped.docs) {
          for (const d of mapped.docs) {
            await writeOne(d);
            stat.migrated += 1;
          }
          continue;
        }
        await writeOne(mapped as Record<string, unknown>);
        stat.migrated += 1;
      } catch (error) {
        stat.failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        stat.errors.push(`${asId(raw._id)}: ${message}`);
      }
    }
  }
}

export async function runWave1(
  tenant: TenantHandle,
  ctx: MigrateContext
): Promise<WaveReport> {
  const startedAt = new Date().toISOString();
  const notes: string[] = [];

  if (!tenant.organizationId) {
    return {
      wave: 1,
      tenantDb: tenant.dbName,
      organizationId: null,
      dryRun: ctx.dryRun,
      startedAt,
      finishedAt: new Date().toISOString(),
      entities: [],
      orphanFks: [],
      notes: ["Skipped Wave 1 — no organization in tenant DB"],
    };
  }

  const organizationId = tenant.organizationId;
  const orgModel = getOrganisationModel();
  const userModel = getUserModel();
  const membershipModel = getOrganisationMembershipModel();
  const unitModel = getUnitMembershipModel();
  const fuModel = getFunctionalUnitModel();
  const premiseModel = getBusinessPremiseModel();
  const invitationModel = getInvitationModel();
  const partnershipModel = getPartnershipModel();
  const licenceModel = getLicenceRequestModel();

  const stats: Record<string, EntityStat> = {
    organizations: emptyEntityStat("organizations"),
    users: emptyEntityStat("users"),
    memberships: emptyEntityStat("memberships"),
    unitmemberships: emptyEntityStat("unitmemberships"),
    groups: emptyEntityStat("groups"),
    grouppremises: emptyEntityStat("grouppremises"),
    invitations: emptyEntityStat("invitations"),
    partnership_programs: emptyEntityStat("partnership_programs"),
    licenserequests: emptyEntityStat("licenserequests"),
  };

  // Organisations
  await migrateCollection(
    tenant,
    "organizations",
    stats.organizations,
    ctx,
    (doc) => transformOrganisation(doc),
    async (doc) => {
      await upsertById(orgModel, doc, ctx.dryRun);
    }
  );

  // Users (with email dedupe)
  stats.users.v4Count = await countCollection(tenant.connection, "users");
  for await (const batch of iterateCollection(tenant.connection, "users")) {
    for (const raw of batch) {
      try {
        const result = transformUser(raw, ctx);
        if (!result) {
          stats.users.skipped += 1;
          continue;
        }
        if (result.remapped) {
          stats.users.skipped += 1;
          notes.push(
            `User email dedupe: ${asId(raw._id)} → ${ctx.userIdRemap.get(asId(raw._id)!)}`
          );
          continue;
        }
        await upsertById(userModel, result.doc, ctx.dryRun);
        stats.users.migrated += 1;
      } catch (error) {
        stats.users.failed += 1;
        stats.users.errors.push(
          `${asId(raw._id)}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  // Functional units before memberships (unit membership FKs)
  await migrateCollection(
    tenant,
    "groups",
    stats.groups,
    ctx,
    (doc) => transformFunctionalUnit(doc, organizationId),
    async (doc) => {
      await upsertById(fuModel, doc, ctx.dryRun);
    }
  );

  // Memberships + derived unit memberships
  stats.memberships.v4Count = await countCollection(
    tenant.connection,
    "memberships"
  );
  const unitDocs: Record<string, unknown>[] = [];
  for await (const batch of iterateCollection(
    tenant.connection,
    "memberships"
  )) {
    for (const raw of batch) {
      try {
        const membership = transformMembership(raw, organizationId, ctx);
        if (!membership) {
          stats.memberships.skipped += 1;
          continue;
        }
        await upsertById(membershipModel, membership, ctx.dryRun);
        stats.memberships.migrated += 1;
        unitDocs.push(...transformUnitMemberships(raw, organizationId, ctx));
      } catch (error) {
        stats.memberships.failed += 1;
        stats.memberships.errors.push(
          `${asId(raw._id)}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  // Deduplicate unit memberships by unique key
  const seenUnit = new Set<string>();
  const uniqueUnits: Record<string, unknown>[] = [];
  for (const u of unitDocs) {
    const key = `${u.organizationId}|${u.functionalUnitId}|${u.userId}`;
    if (seenUnit.has(key)) continue;
    seenUnit.add(key);
    uniqueUnits.push(u);
  }
  stats.unitmemberships.v4Count = unitDocs.length;
  if (!ctx.dryRun) {
    for (const u of uniqueUnits) {
      try {
        await unitModel.updateOne(
          {
            organizationId: u.organizationId,
            functionalUnitId: u.functionalUnitId,
            userId: u.userId,
          },
          { $setOnInsert: u },
          { upsert: true }
        );
        stats.unitmemberships.migrated += 1;
      } catch (error) {
        stats.unitmemberships.failed += 1;
        stats.unitmemberships.errors.push(
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  } else {
    stats.unitmemberships.migrated = uniqueUnits.length;
  }

  await migrateCollection(
    tenant,
    "grouppremises",
    stats.grouppremises,
    ctx,
    (doc) => transformBusinessPremise(doc, organizationId),
    async (doc) => {
      await upsertById(premiseModel, doc, ctx.dryRun);
    }
  );

  await migrateCollection(
    tenant,
    "invitations",
    stats.invitations,
    ctx,
    (doc) => transformInvitation(doc, organizationId, ctx),
    async (doc) => {
      await upsertById(invitationModel, doc, ctx.dryRun);
    }
  );

  await migrateCollection(
    tenant,
    "partnership_programs",
    stats.partnership_programs,
    ctx,
    (doc) => transformPartnership(doc, organizationId, ctx),
    async (doc) => {
      await upsertById(partnershipModel, doc, ctx.dryRun);
    }
  );

  await migrateCollection(
    tenant,
    "licenserequests",
    stats.licenserequests,
    ctx,
    (doc) => transformLicenceRequest(doc, organizationId, ctx),
    async (doc) => {
      await upsertById(licenceModel, doc, ctx.dryRun);
    }
  );

  const report: WaveReport = {
    wave: 1,
    tenantDb: tenant.dbName,
    organizationId,
    dryRun: ctx.dryRun,
    startedAt,
    finishedAt: new Date().toISOString(),
    entities: Object.values(stats),
    orphanFks: [],
    notes,
  };

  if (!ctx.dryRun) {
    await attachValidation(report, 1);
  }

  return report;
}
