import type {
  CreateOrganisationInput,
  GoLiveOrganisationInput,
  Organisation,
  OrganisationLicences,
  OrganisationPaymentStatus,
  OrganisationPaymentType,
} from "../types";
import {
  getOrganisationModel,
  type OrganisationDocument,
} from "./organisation.model";

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
    referralSource: doc.referralSource ?? null,
    logoSrc: doc.logoSrc ?? null,
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
  };
}
