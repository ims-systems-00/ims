/**
 * Live Relyable evidence collectors — repos + pure rules, no identity.
 */
import { buildSchedule } from "../../inventory/lib/inventory-rules";
import { createInventoryAssetRepository } from "../../inventory/repositories/inventory-asset.repository";
import { createInventorySettingsRepository } from "../../inventory/repositories/inventory-settings.repository";
import { createManagementReviewRepository } from "../../management-reviews/repositories/management-review.repository";
import { createAslSupplierRepository } from "../../supplier/repositories/asl-supplier.repository";
import { createTrainingCompetencyRepository } from "../../training/repositories/training-competency.repository";
import { createTrainingPersonRepository } from "../../training/repositories/training-person.repository";
import { createTrainingRecordRepository } from "../../training/repositories/training-record.repository";
import { createTrainingRoleRepository } from "../../training/repositories/training-role.repository";
import { createTrainingSessionRepository } from "../../training/repositories/training-session.repository";
import { createTrainingSettingsRepository } from "../../training/repositories/training-settings.repository";
import type { TrainingModel } from "../../training/types";
import {
  aggregateAslEvidence,
  aggregateInventoryEvidence,
  aggregateManagementReviewEvidence,
  aggregateTrainingEvidence,
} from "../lib/collectors-aggregate";
import type { RelyableEvidenceCollectorPort } from "../ports";
import type { EmitEvidenceInput } from "../types";

async function loadTrainingModel(
  organizationId: string
): Promise<TrainingModel> {
  const settingsRepo = createTrainingSettingsRepository();
  const competenciesRepo = createTrainingCompetencyRepository();
  const rolesRepo = createTrainingRoleRepository();
  const peopleRepo = createTrainingPersonRepository();
  const recordsRepo = createTrainingRecordRepository();
  const sessionsRepo = createTrainingSessionRepository();

  const [settings, competencies, roles, people, records, sessions] =
    await Promise.all([
      settingsRepo.getOrCreate(organizationId),
      competenciesRepo.list(organizationId, { includeArchived: true }),
      rolesRepo.list(organizationId),
      peopleRepo.list(organizationId),
      recordsRepo.list(organizationId),
      sessionsRepo.list(organizationId),
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

export function createTrainingEvidenceCollector(): RelyableEvidenceCollectorPort {
  return {
    async collect(organizationId: string): Promise<EmitEvidenceInput[]> {
      try {
        const model = await loadTrainingModel(organizationId);
        return aggregateTrainingEvidence(model);
      } catch {
        return [];
      }
    },
  };
}

export function createInventoryEvidenceCollector(): RelyableEvidenceCollectorPort {
  const assets = createInventoryAssetRepository();
  const settingsRepo = createInventorySettingsRepository();
  return {
    async collect(organizationId: string): Promise<EmitEvidenceInput[]> {
      try {
        const [allAssets, settings] = await Promise.all([
          assets.listAll(organizationId, { includeDisposed: true }),
          settingsRepo.getOrCreate(organizationId),
        ]);
        const rows = buildSchedule(
          allAssets,
          {},
          undefined,
          {
            leadDays: settings.leadDays,
            categoryOverrides: settings.categoryOverrides,
            competentPersons: settings.competentPersons ?? [],
          }
        );
        return aggregateInventoryEvidence(rows);
      } catch {
        return [];
      }
    },
  };
}

export function createAslEvidenceCollector(): RelyableEvidenceCollectorPort {
  const suppliers = createAslSupplierRepository();
  return {
    async collect(organizationId: string): Promise<EmitEvidenceInput[]> {
      try {
        const live = await suppliers.listAllLive(organizationId);
        return aggregateAslEvidence(live);
      } catch {
        return [];
      }
    },
  };
}

export function createManagementReviewEvidenceCollector(): RelyableEvidenceCollectorPort {
  const reviews = createManagementReviewRepository();
  return {
    async collect(organizationId: string): Promise<EmitEvidenceInput[]> {
      try {
        const stats = await reviews.stats(organizationId, { mode: "all" });
        return aggregateManagementReviewEvidence({
          completed: stats.completed,
          total: stats.total,
        });
      } catch {
        return [];
      }
    },
  };
}

/** All live collectors used by production Sync. */
export function createLiveRelyableCollectors(): RelyableEvidenceCollectorPort[] {
  return [
    createTrainingEvidenceCollector(),
    createInventoryEvidenceCollector(),
    createAslEvidenceCollector(),
    createManagementReviewEvidenceCollector(),
  ];
}
