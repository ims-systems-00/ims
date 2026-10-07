import type {
  CreateOrganisationInput,
  Organisation,
  OrganisationLicences,
} from "../types";
import {
  getOrganisationModel,
  type OrganisationDocument,
} from "./organisation.model";

function toDomain(doc: OrganisationDocument): Organisation {
  const licences = (doc.licences ?? {}) as Partial<OrganisationLicences>;
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
    },
    referralSource: doc.referralSource ?? null,
    logoSrc: doc.logoSrc ?? null,
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
        },
        referralSource: input.data.referralSource ?? null,
        logoSrc: null,
        createdBy: input.createdBy,
        createdOn: input.createdOn,
      });
      return toDomain(doc);
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
