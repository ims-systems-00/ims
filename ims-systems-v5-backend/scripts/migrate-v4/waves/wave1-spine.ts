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
import { createBufferedWriter, withSourceTimestamps } from "../upsert";
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
            await writeOne(withSourceTimestamps(d, raw));
            stat.migrated += 1;
          }
          continue;
        }
        await writeOne(
          withSourceTimestamps(mapped as Record<string, unknown>, raw)
        );
        stat.migrated += 1;
      } catch (error) {
        stat.failed += 1;
        if (stat.errors.length < 50) {
          const message = error instanceof Error ? error.message : String(error);
          stat.errors.push(`${asId(raw._id)}: ${message}`);
        }
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

  const orgCount = await countCollection(tenant.connection, "organizations");
  if (!tenant.organizationId && orgCount === 0) {
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

  // Fallback only when a child doc lacks organization; shared multi-org DBs
  // resolve per-document via resolveOrganizationId in transforms.
  const organizationId = tenant.organizationId ?? "";
  notes.push(
    "Wave 1 stamps organizationId from each document's organization field (shared-DB safe)."
  );
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
  const orgModelWriter = createBufferedWriter(orgModel, ctx.dryRun);
  await migrateCollection(
    tenant,
    "organizations",
    stats.organizations,
    ctx,
    (doc) => transformOrganisation(doc),
    (doc) => orgModelWriter.add(doc)
  );
  await orgModelWriter.settle(stats.organizations);

  // Users (with email dedupe)
  stats.users.v4Count = await countCollection(tenant.connection, "users");
  const userWriter = createBufferedWriter(userModel, ctx.dryRun);
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
        await userWriter.add(withSourceTimestamps(result.doc, raw));
        stats.users.migrated += 1;
      } catch (error) {
        stats.users.failed += 1;
        if (stats.users.errors.length < 50) {
          stats.users.errors.push(
            `${asId(raw._id)}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    }
  }

  await userWriter.settle(stats.users);

  // Functional units before memberships (unit membership FKs)
  const fuModelWriter = createBufferedWriter(fuModel, ctx.dryRun);
  await migrateCollection(
    tenant,
    "groups",
    stats.groups,
    ctx,
    (doc) => transformFunctionalUnit(doc, organizationId),
    (doc) => fuModelWriter.add(doc)
  );
  await fuModelWriter.settle(stats.groups);

  // Memberships + derived unit memberships
  stats.memberships.v4Count = await countCollection(
    tenant.connection,
    "memberships"
  );
  const unitDocs: Record<string, unknown>[] = [];
  const membershipWriter = createBufferedWriter(membershipModel, ctx.dryRun);
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
        await membershipWriter.add(withSourceTimestamps(membership, raw));
        stats.memberships.migrated += 1;
        unitDocs.push(...transformUnitMemberships(raw, organizationId, ctx));
      } catch (error) {
        stats.memberships.failed += 1;
        if (stats.memberships.errors.length < 50) {
          stats.memberships.errors.push(
            `${asId(raw._id)}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    }
  }

  await membershipWriter.settle(stats.memberships);

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
    const unitOps = uniqueUnits.map((u) => ({
      updateOne: {
        filter: {
          organizationId: u.organizationId,
          functionalUnitId: u.functionalUnitId,
          userId: u.userId,
        },
        update: { $setOnInsert: u },
        upsert: true,
      },
    }));
    try {
      if (unitOps.length) {
        await unitModel.bulkWrite(unitOps as any, { ordered: false });
      }
      stats.unitmemberships.migrated += unitOps.length;
    } catch (error) {
      const writeErrors = (error as { writeErrors?: unknown[] }).writeErrors;
      const failed = Array.isArray(writeErrors) ? writeErrors.length : unitOps.length;
      stats.unitmemberships.migrated += unitOps.length - failed;
      stats.unitmemberships.failed += failed;
      stats.unitmemberships.errors.push(
        error instanceof Error ? error.message : String(error)
      );
    }
  } else {
    stats.unitmemberships.migrated = uniqueUnits.length;
  }

  const premiseModelWriter = createBufferedWriter(premiseModel, ctx.dryRun);
  await migrateCollection(
    tenant,
    "grouppremises",
    stats.grouppremises,
    ctx,
    (doc) => transformBusinessPremise(doc, organizationId),
    (doc) => premiseModelWriter.add(doc)
  );
  await premiseModelWriter.settle(stats.grouppremises);

  const invitationModelWriter = createBufferedWriter(invitationModel, ctx.dryRun);
  await migrateCollection(
    tenant,
    "invitations",
    stats.invitations,
    ctx,
    (doc) => transformInvitation(doc, organizationId, ctx),
    (doc) => invitationModelWriter.add(doc)
  );
  await invitationModelWriter.settle(stats.invitations);

  const partnershipModelWriter = createBufferedWriter(partnershipModel, ctx.dryRun);
  await migrateCollection(
    tenant,
    "partnership_programs",
    stats.partnership_programs,
    ctx,
    (doc) => transformPartnership(doc, organizationId, ctx),
    (doc) => partnershipModelWriter.add(doc)
  );
  await partnershipModelWriter.settle(stats.partnership_programs);

  // LR- references are globally unique. V5 restarted its own LR-1… sequence,
  // so a V4 request whose reference is now held by a different (V5-created)
  // request keeps a recognisable `LR-n-V4` reference instead of failing.
  const takenReferences = new Map<string, string>();
  for (const row of await licenceModel.collection
    .find({}, { projection: { reference: 1 } })
    .toArray()) {
    if (row.reference) takenReferences.set(String(row.reference), String(row._id));
  }
  const licenceModelWriter = createBufferedWriter(licenceModel, ctx.dryRun);
  await migrateCollection(
    tenant,
    "licenserequests",
    stats.licenserequests,
    ctx,
    (doc) => {
      const mapped = transformLicenceRequest(doc, organizationId, ctx);
      const ref = mapped?.reference ? String(mapped.reference) : null;
      const holder = ref ? takenReferences.get(ref) : undefined;
      if (mapped && ref && holder && holder !== String(mapped._id)) {
        mapped.reference = `${ref}-V4`;
        notes.push(`Licence request ${String(mapped._id)}: ${ref} already used in V5 → ${ref}-V4`);
      }
      return mapped;
    },
    (doc) => licenceModelWriter.add(doc)
  );
  await licenceModelWriter.settle(stats.licenserequests);

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
