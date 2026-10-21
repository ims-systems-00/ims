import {
  getLicenceRequestCounterModel,
  getLicenceRequestModel,
  type LicenceRequestDocument,
} from "./licence-request.model";
import type {
  CreateLicenceRequestInput,
  LicenceRequest,
  PaginatedLicenceRequests,
} from "../types";

function toDomain(doc: LicenceRequestDocument): LicenceRequest {
  return {
    id: String(doc._id),
    reference: doc.reference,
    organizationId: doc.organizationId,
    requestedBy: doc.requestedBy,
    superUser: doc.superUser ?? 0,
    users: doc.users ?? 0,
    groups: doc.groups ?? 0,
    complianceTools: [...(doc.complianceTools ?? [])],
    additionalModules: [...(doc.additionalModules ?? [])],
    message: doc.message ?? "",
    status: doc.status,
    grantedBy: doc.grantedBy ?? null,
    grantedOn: doc.grantedOn ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type LicenceRequestRepository = ReturnType<
  typeof createLicenceRequestRepository
>;

export function createLicenceRequestRepository() {
  const Model = getLicenceRequestModel();
  const Counter = getLicenceRequestCounterModel();

  async function nextReference(): Promise<string> {
    const counter = await Counter.findOneAndUpdate(
      { name: "licence-request" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    return `LR-${counter?.seq ?? 1}`;
  }

  return {
    async createPending(input: {
      organizationId: string;
      requestedBy: string;
      data: CreateLicenceRequestInput;
    }): Promise<LicenceRequest> {
      const reference = await nextReference();
      const doc = await Model.create({
        reference,
        organizationId: input.organizationId,
        requestedBy: input.requestedBy,
        superUser: input.data.superUser ?? 0,
        users: input.data.users ?? 0,
        groups: input.data.groups ?? 0,
        complianceTools: input.data.complianceTools ?? [],
        additionalModules: input.data.additionalModules ?? [],
        message: input.data.message ?? "",
        status: "Pending",
      });
      return toDomain(doc as LicenceRequestDocument);
    },

    async markGranted(
      id: string,
      grantedBy: string
    ): Promise<LicenceRequest | null> {
      const doc = await Model.findByIdAndUpdate(
        id,
        { status: "Granted", grantedBy, grantedOn: new Date() },
        { new: true }
      ).lean();
      return doc ? toDomain(doc as LicenceRequestDocument) : null;
    },

    async listByOrganization(
      organizationId: string,
      query: { page?: number; pageSize?: number }
    ): Promise<PaginatedLicenceRequests> {
      const page = Math.max(1, query.page ?? 1);
      const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
      const [total, docs] = await Promise.all([
        Model.countDocuments({ organizationId }),
        Model.find({ organizationId })
          .sort({ createdAt: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .lean(),
      ]);
      return {
        items: docs.map((doc) =>
          toDomain(doc as LicenceRequestDocument)
        ),
        total,
        page,
        pageSize,
      };
    },

    async findByIdForOrganization(
      organizationId: string,
      id: string
    ): Promise<LicenceRequest | null> {
      const doc = await Model.findOne({ _id: id, organizationId }).lean();
      return doc ? toDomain(doc as LicenceRequestDocument) : null;
    },
  };
}
