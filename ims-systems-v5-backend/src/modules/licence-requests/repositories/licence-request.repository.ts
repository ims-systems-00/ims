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

function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === 11000
  );
}

export type LicenceRequestRepository = ReturnType<
  typeof createLicenceRequestRepository
>;

export function createLicenceRequestRepository() {
  const Model = getLicenceRequestModel();
  const Counter = getLicenceRequestCounterModel();

  /**
   * Highest numeric suffix already used in `LR-{n}` references.
   * Keeps the counter from drifting behind migrated / seed data.
   */
  async function highestExistingSeq(): Promise<number> {
    const rows = await Model.aggregate<{ max: number | null }>([
      { $match: { reference: { $regex: /^LR-\d+$/ } } },
      {
        $project: {
          n: {
            $convert: {
              input: { $arrayElemAt: [{ $split: ["$reference", "-"] }, 1] },
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },
        },
      },
      { $group: { _id: null, max: { $max: "$n" } } },
    ]);
    return rows[0]?.max ?? 0;
  }

  async function nextReference(): Promise<string> {
    const floor = await highestExistingSeq();
    // Raise the counter if it lagged behind existing LR-* documents.
    await Counter.findOneAndUpdate(
      { name: "licence-request" },
      { $max: { seq: floor } },
      { upsert: true }
    );
    const counter = await Counter.findOneAndUpdate(
      { name: "licence-request" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    return `LR-${counter?.seq ?? floor + 1}`;
  }

  return {
    async createPending(input: {
      organizationId: string;
      requestedBy: string;
      data: CreateLicenceRequestInput;
    }): Promise<LicenceRequest> {
      const maxAttempts = 5;
      let lastError: unknown;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const reference = await nextReference();
        try {
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
        } catch (error) {
          lastError = error;
          if (!isDuplicateKeyError(error)) throw error;
          // Race / lag: allocate another reference and retry.
        }
      }
      throw lastError instanceof Error
        ? lastError
        : new Error("Unable to allocate a unique licence request reference");
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
