import type {
  CreateOrganisationInput,
  DocumentReviewReminderOffset,
  GoLiveOrganisationInput,
  IncidentResolutionTargets,
  Organisation,
  OrganisationLicences,
  OrganisationLogoStorage,
  OrganisationPaymentStatus,
  OrganisationPaymentType,
} from "../types";
import { DOCUMENT_REVIEW_REMINDER_OFFSETS } from "../types";
import {
  getOrganisationModel,
  type OrganisationDocument,
} from "./organisation.model";

const OFFSET_SET = new Set<string>(DOCUMENT_REVIEW_REMINDER_OFFSETS);

function normalizeReminderOffsets(
  value: unknown
): DocumentReviewReminderOffset[] {
  if (!Array.isArray(value)) return [];
  const unique = new Set<DocumentReviewReminderOffset>();
  for (const item of value) {
    if (typeof item === "string" && OFFSET_SET.has(item)) {
      unique.add(item as DocumentReviewReminderOffset);
    }
  }
  return DOCUMENT_REVIEW_REMINDER_OFFSETS.filter((offset) =>
    unique.has(offset)
  );
}

export function normalizeIncidentResolutionTargets(
  value: unknown
): IncidentResolutionTargets {
  const raw = (value ?? {}) as Record<string, unknown>;
  const pick = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
  return { P1: pick(raw.P1), P2: pick(raw.P2), P3: pick(raw.P3), P4: pick(raw.P4) };
}

function toDomain(doc: OrganisationDocument): Organisation {
  const licences = (doc.licences ?? {}) as Partial<OrganisationLicences> & {
    complianceTools?: string[];
    additionalModules?: string[];
    carbocalc?: boolean;
    imsforms?: boolean;
    projectims?: boolean;
  };
  const address = doc.address ?? {
    line1: "",
    line2: "",
    city: "",
    county: "",
    postCode: "",
    country: "",
  };
  const country = doc.country ?? {
    name: "",
    code: "",
    currency: "",
    phoneCode: 0,
  };
  const payment = (doc.paymentSystem ?? {}) as {
    type?: OrganisationPaymentType | null;
    status?: OrganisationPaymentStatus;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
  };
  const systemDate = (doc.systemDate ?? {}) as {
    start?: Date | null;
    end?: Date | null;
    unset?: boolean;
  };
  return {
    id: String(doc._id),
    reference: doc.reference,
    name: doc.name,
    industry: doc.industry,
    sizeOfOrganisation: doc.sizeOfOrganisation,
    officeEmail: doc.officeEmail,
    campaignEmail:
      typeof (doc as { campaignEmail?: string }).campaignEmail === "string"
        ? (doc as { campaignEmail?: string }).campaignEmail
        : undefined,
    contactNumber: doc.contactNumber ?? "",
    companyNumber: doc.companyNumber ?? "",
    vatNumber: doc.vatNumber ?? "",
    address: {
      line1: address.line1,
      line2: address.line2 ?? "",
      city: address.city,
      county: address.county,
      postCode: address.postCode,
      country: address.country,
    },
    country: {
      name: country.name,
      code: country.code,
      currency: country.currency,
      phoneCode: country.phoneCode,
    },
    isCustomer: Boolean(doc.isCustomer),
    isPartner: Boolean(doc.isPartner),
    status: doc.status as Organisation["status"],
    licences: {
      superUser: {
        allocated: licences.superUser?.allocated ?? 1,
        used: licences.superUser?.used ?? 0,
      },
      users: {
        allocated: licences.users?.allocated ?? 0,
        used: licences.users?.used ?? 0,
      },
      groups: {
        allocated: licences.groups?.allocated ?? 0,
        used: licences.groups?.used ?? 0,
      },
      complianceTools: [...(licences.complianceTools ?? [])],
      additionalModules: [...(licences.additionalModules ?? [])],
      carbocalc: Boolean(licences.carbocalc),
      imsforms: Boolean(licences.imsforms),
      projectims: Boolean(licences.projectims),
    },
    paymentSystem: {
      type: payment.type ?? null,
      status: payment.status ?? "Trial",
      stripeCustomerId: payment.stripeCustomerId ?? null,
      stripeSubscriptionId: payment.stripeSubscriptionId ?? null,
    },
    systemDate: {
      start: systemDate.start ?? null,
      end: systemDate.end ?? null,
      unset: systemDate.unset !== false && !systemDate.start,
    },
    documentReviewReminderOffsets: normalizeReminderOffsets(
      (doc as { documentReviewReminderOffsets?: unknown })
        .documentReviewReminderOffsets
    ),
    incidentResolutionTargets: normalizeIncidentResolutionTargets(
      (doc as { incidentResolutionTargets?: unknown }).incidentResolutionTargets
    ),
    referralSource: doc.referralSource ?? null,
    logoSrc: doc.logoSrc ?? null,
    logoStorage: doc.logoStorage?.bucket
      ? {
          bucket: doc.logoStorage.bucket,
          key: doc.logoStorage.key,
          fileName: doc.logoStorage.fileName ?? undefined,
        }
      : null,
    auth0OrganizationId: doc.auth0OrganizationId?.trim()
      ? doc.auth0OrganizationId.trim()
      : null,
    createdBy: doc.createdBy,
    createdOn: doc.createdOn,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type OrganisationRepository = ReturnType<
  typeof createOrganisationRepository
>;

export function createOrganisationRepository() {
  const Model = getOrganisationModel();

  return {
    async create(input: {
      id?: string;
      reference: string;
      data: CreateOrganisationInput;
      createdBy: string;
      createdOn: Date;
    }): Promise<Organisation> {
      const doc = await Model.create({
        ...(input.id ? { _id: input.id } : {}),
        reference: input.reference,
        name: input.data.name,
        industry: input.data.industry,
        sizeOfOrganisation: input.data.sizeOfOrganisation,
        officeEmail: input.data.officeEmail,
        contactNumber: input.data.contactNumber,
        companyNumber: input.data.companyNumber ?? "",
        vatNumber: input.data.vatNumber ?? "",
        address: {
          line1: input.data.address.line1,
          line2: input.data.address.line2 ?? "",
          city: input.data.address.city,
          county: input.data.address.county,
          postCode: input.data.address.postCode,
          country: input.data.country.name,
        },
        country: input.data.country,
        isCustomer: false,
        isPartner: false,
        status: "Running",
        licences: {
          superUser: { allocated: 1, used: 0 },
          users: { allocated: 0, used: 0 },
          groups: { allocated: 0, used: 0 },
          complianceTools: [],
          additionalModules: [],
          carbocalc: false,
          imsforms: false,
          projectims: false,
        },
        paymentSystem: {
          type: null,
          status: "Trial",
          stripeCustomerId: null,
          stripeSubscriptionId: null,
        },
        systemDate: {
          start: null,
          end: null,
          unset: true,
        },
        documentReviewReminderOffsets: [],
        referralSource: input.data.referralSource ?? null,
        logoSrc: input.data.logoSrc?.trim() ? input.data.logoSrc.trim() : null,
        createdBy: input.createdBy,
        createdOn: input.createdOn,
      });
      return toDomain(doc);
    },

    async applyGoLive(input: {
      id: string;
      data: GoLiveOrganisationInput;
      paymentStatus: OrganisationPaymentStatus;
      systemStart: Date;
      systemEnd: Date;
    }): Promise<Organisation | null> {
      if (!/^[a-fA-F0-9]{24}$/.test(input.id)) {
        return null;
      }

      const doc = await Model.findOneAndUpdate(
        { _id: input.id, isCustomer: false },
        {
          $set: {
            isCustomer: true,
            "licences.superUser.allocated": input.data.superUser,
            "licences.users.allocated": input.data.users,
            "licences.groups.allocated": input.data.groups,
            "licences.complianceTools": [
              ...(input.data.complianceTools ?? []),
            ],
            "licences.additionalModules": [
              ...(input.data.additionalModules ?? []),
            ],
            "licences.carbocalc": Boolean(input.data.carbocalc),
            "licences.imsforms": Boolean(input.data.imsforms),
            "licences.projectims": Boolean(input.data.projectims),
            "paymentSystem.type": input.data.paymentType,
            "paymentSystem.status": input.paymentStatus,
            "systemDate.start": input.systemStart,
            "systemDate.end": input.systemEnd,
            "systemDate.unset": false,
          },
        },
        { returnDocument: "after" }
      ).lean();
      return doc ? toDomain(doc as OrganisationDocument) : null;
    },

    async setPaymentStatus(
      id: string,
      status: OrganisationPaymentStatus
    ): Promise<Organisation | null> {
      if (!/^[a-fA-F0-9]{24}$/.test(id)) {
        return null;
      }
      const doc = await Model.findByIdAndUpdate(
        id,
        { $set: { "paymentSystem.status": status } },
        { returnDocument: "after" }
      ).lean();
      return doc ? toDomain(doc as OrganisationDocument) : null;
    },

    async updatePaymentSystem(
      id: string,
      patch: {
        type?: OrganisationPaymentType | null;
        status?: OrganisationPaymentStatus;
        stripeCustomerId?: string | null;
        stripeSubscriptionId?: string | null;
      }
    ): Promise<Organisation | null> {
      if (!/^[a-fA-F0-9]{24}$/.test(id)) {
        return null;
      }
      const $set: Record<string, unknown> = {};
      if (patch.type !== undefined) {
        $set["paymentSystem.type"] = patch.type;
      }
      if (patch.status !== undefined) {
        $set["paymentSystem.status"] = patch.status;
      }
      if (patch.stripeCustomerId !== undefined) {
        $set["paymentSystem.stripeCustomerId"] = patch.stripeCustomerId;
      }
      if (patch.stripeSubscriptionId !== undefined) {
        $set["paymentSystem.stripeSubscriptionId"] = patch.stripeSubscriptionId;
      }
      if (Object.keys($set).length === 0) {
        return this.findById(id);
      }
      const doc = await Model.findByIdAndUpdate(
        id,
        { $set },
        { returnDocument: "after" }
      ).lean();
      return doc ? toDomain(doc as OrganisationDocument) : null;
    },

    async findByStripeCustomerId(
      stripeCustomerId: string
    ): Promise<Organisation | null> {
      const id = stripeCustomerId.trim();
      if (!id) return null;
      const doc = await Model.findOne({
        "paymentSystem.stripeCustomerId": id,
      }).lean();
      return doc ? toDomain(doc as OrganisationDocument) : null;
    },

    async findByStripeSubscriptionId(
      stripeSubscriptionId: string
    ): Promise<Organisation | null> {
      const id = stripeSubscriptionId.trim();
      if (!id) return null;
      const doc = await Model.findOne({
        "paymentSystem.stripeSubscriptionId": id,
      }).lean();
      return doc ? toDomain(doc as OrganisationDocument) : null;
    },

    async markSubscribedByStripeCustomerId(
      stripeCustomerId: string,
      stripeSubscriptionId: string
    ): Promise<Organisation | null> {
      const customerId = stripeCustomerId.trim();
      if (!customerId) return null;
      const doc = await Model.findOneAndUpdate(
        { "paymentSystem.stripeCustomerId": customerId },
        {
          $set: {
            "paymentSystem.status": "Subscribed",
            "paymentSystem.stripeSubscriptionId": stripeSubscriptionId,
          },
        },
        { returnDocument: "after" }
      ).lean();
      return doc ? toDomain(doc as OrganisationDocument) : null;
    },

    async markUnsubscribedByStripeCustomerId(
      stripeCustomerId: string
    ): Promise<Organisation | null> {
      const customerId = stripeCustomerId.trim();
      if (!customerId) return null;
      const doc = await Model.findOneAndUpdate(
        { "paymentSystem.stripeCustomerId": customerId },
        {
          $set: {
            "paymentSystem.status": "Unsubscribed",
            "paymentSystem.stripeSubscriptionId": null,
          },
        },
        { returnDocument: "after" }
      ).lean();
      return doc ? toDomain(doc as OrganisationDocument) : null;
    },

    async resetPaymentSystemByStripeCustomerId(
      stripeCustomerId: string
    ): Promise<Organisation | null> {
      const customerId = stripeCustomerId.trim();
      if (!customerId) return null;
      const doc = await Model.findOneAndUpdate(
        { "paymentSystem.stripeCustomerId": customerId },
        {
          $set: {
            "paymentSystem.status": "Unsubscribed",
            "paymentSystem.stripeCustomerId": null,
            "paymentSystem.stripeSubscriptionId": null,
          },
        },
        { returnDocument: "after" }
      ).lean();
      return doc ? toDomain(doc as OrganisationDocument) : null;
    },

    async findById(id: string): Promise<Organisation | null> {
      const doc = await Model.findById(id).lean();
      return doc ? toDomain(doc as OrganisationDocument) : null;
    },

    async findByIds(ids: string[]): Promise<Organisation[]> {
      if (ids.length === 0) return [];
      const docs = await Model.find({ _id: { $in: ids } }).lean();
      return docs.map((doc) => toDomain(doc as OrganisationDocument));
    },

    /** Resolve Auth0 Organization id → IMS organisation (auth rollout M2+). */
    async findByAuth0OrganizationId(
      auth0OrganizationId: string
    ): Promise<Organisation | null> {
      const orgId = auth0OrganizationId.trim();
      if (!orgId) return null;
      const doc = await Model.findOne({ auth0OrganizationId: orgId }).lean();
      return doc ? toDomain(doc as OrganisationDocument) : null;
    },

    /** Link or clear Auth0 Organization id on an IMS organisation. */
    async linkAuth0OrganizationId(
      id: string,
      auth0OrganizationId: string | null
    ): Promise<Organisation | null> {
      if (!/^[a-fA-F0-9]{24}$/.test(id)) {
        return null;
      }
      const next =
        typeof auth0OrganizationId === "string" && auth0OrganizationId.trim()
          ? auth0OrganizationId.trim()
          : null;
      const doc = await Model.findByIdAndUpdate(
        id,
        { $set: { auth0OrganizationId: next } },
        { returnDocument: "after" }
      ).lean();
      return doc ? toDomain(doc as OrganisationDocument) : null;
    },

    async incrementSuperUserUsed(id: string, by = 1): Promise<void> {
      await Model.updateOne(
        { _id: id },
        { $inc: { "licences.superUser.used": by } }
      );
    },

    async incrementGroupsUsed(id: string, by = 1): Promise<void> {
      await Model.updateOne(
        { _id: id },
        { $inc: { "licences.groups.used": by } }
      );
    },

    /**
     * Upsert the fixed development-stub organisation document.
     * Used when GET /current runs before seed:demo has been executed.
     */
    async upsertDemoOrganisation(input: {
      id: string;
      reference: string;
      createdBy: string;
      createdOn: Date;
    }): Promise<Organisation> {
      const doc = await Model.findByIdAndUpdate(
        input.id,
        {
          $setOnInsert: {
            reference: input.reference,
            name: "Demo Organisation",
            industry: "Information technology",
            sizeOfOrganisation: 120,
            officeEmail: "ops@demo.local",
            contactNumber: "+44 20 7946 0000",
            companyNumber: "12345678",
            vatNumber: "GB123456789",
            address: {
              line1: "1 Demo Street",
              line2: "",
              city: "London",
              county: "Greater London",
              postCode: "EC2A 4BX",
              country: "United Kingdom",
            },
            country: {
              name: "United Kingdom",
              code: "GB",
              currency: "GBP",
              phoneCode: 44,
            },
            isCustomer: true,
            isPartner: false,
            status: "Running",
            licences: {
              superUser: { allocated: 5, used: 1 },
              users: { allocated: 25, used: 6 },
              groups: { allocated: 10, used: 5 },
              complianceTools: [],
              additionalModules: [],
              carbocalc: false,
              imsforms: false,
              projectims: false,
            },
            paymentSystem: {
              type: "Monthly invoice",
              status: "Subscribed",
              stripeCustomerId: null,
              stripeSubscriptionId: null,
            },
            systemDate: {
              start: input.createdOn,
              end: new Date(
                input.createdOn.getTime() + 86400000 * 365
              ),
              unset: false,
            },
            documentReviewReminderOffsets: [
              "1_month",
              "1_week",
              "1_day",
            ],
            referralSource: null,
            logoSrc: null,
            createdBy: input.createdBy,
            createdOn: input.createdOn,
          },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      ).lean();
      return toDomain(doc as OrganisationDocument);
    },

    async updateLogo(
      id: string,
      logoSrc: string | null,
      logoStorage: OrganisationLogoStorage | null
    ): Promise<Organisation | null> {
      const doc = await Model.findByIdAndUpdate(
        id,
        { $set: { logoSrc, logoStorage } },
        { returnDocument: "after" }
      ).lean();
      return doc ? toDomain(doc as OrganisationDocument) : null;
    },

    async updateIncidentResolutionTargets(
      id: string,
      targets: IncidentResolutionTargets
    ): Promise<Organisation | null> {
      const doc = await Model.findByIdAndUpdate(
        id,
        { $set: { incidentResolutionTargets: normalizeIncidentResolutionTargets(targets) } },
        { returnDocument: "after" }
      ).lean();
      return doc ? toDomain(doc as OrganisationDocument) : null;
    },

    async updateDocumentReviewReminders(
      id: string,
      offsets: DocumentReviewReminderOffset[]
    ): Promise<Organisation | null> {
      const doc = await Model.findByIdAndUpdate(
        id,
        {
          $set: {
            documentReviewReminderOffsets: normalizeReminderOffsets(offsets),
          },
        },
        { returnDocument: "after" }
      ).lean();
      return doc ? toDomain(doc as OrganisationDocument) : null;
    },

    async applyLicenceRequest(
      id: string,
      input: {
        superUser?: number;
        users?: number;
        groups?: number;
        complianceTools?: string[];
        additionalModules?: string[];
      }
    ): Promise<Organisation | null> {
      const $inc: Record<string, number> = {};
      if ((input.superUser ?? 0) > 0) {
        $inc["licences.superUser.allocated"] = input.superUser!;
      }
      if ((input.users ?? 0) > 0) {
        $inc["licences.users.allocated"] = input.users!;
      }
      if ((input.groups ?? 0) > 0) {
        $inc["licences.groups.allocated"] = input.groups!;
      }

      const $addToSet: Record<string, { $each: string[] }> = {};
      if (input.complianceTools?.length) {
        $addToSet["licences.complianceTools"] = {
          $each: [...new Set(input.complianceTools)],
        };
      }
      if (input.additionalModules?.length) {
        $addToSet["licences.additionalModules"] = {
          $each: [...new Set(input.additionalModules)],
        };
      }

      const update: Record<string, unknown> = {};
      if (Object.keys($inc).length > 0) update.$inc = $inc;
      if (Object.keys($addToSet).length > 0) update.$addToSet = $addToSet;
      if (Object.keys(update).length === 0) {
        return this.findById(id);
      }

      await Model.updateOne({ _id: id }, update);
      return this.findById(id);
    },

    /** Partnership acceptance: flag the organisation as an iMS partner. */
    async markAsPartner(id: string): Promise<Organisation | null> {
      const doc = await Model.findByIdAndUpdate(
        id,
        { $set: { isPartner: true } },
        { returnDocument: "after" }
      ).lean();
      return doc ? toDomain(doc as OrganisationDocument) : null;
    },

    /** Organisations referred by a partner code (partnership record id). */
    async listByReferralSource(
      referralSource: string
    ): Promise<Organisation[]> {
      const docs = await Model.find({ referralSource })
        .sort({ createdAt: -1 })
        .lean();
      return docs.map((doc) => toDomain(doc as OrganisationDocument));
    },
  };
}
