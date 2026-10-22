import { createHash, randomBytes } from "node:crypto";
import type { OrganisationRole } from "../../organisation/types";
import type { Invitation } from "../types";
import {
  getInvitationModel,
  type InvitationDocument,
} from "./invitation.model";

export function hashInvitationToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateInvitationToken(): string {
  return randomBytes(32).toString("hex");
}

function toDomain(doc: InvitationDocument): Invitation {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    email: doc.email,
    role: doc.role as OrganisationRole,
    createdBy: doc.createdBy,
    inviterName: doc.inviterName ?? "",
    organisationName: doc.organisationName ?? "",
    expiresAt: doc.expiresAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type InvitationRepository = ReturnType<
  typeof createInvitationRepository
>;

export function createInvitationRepository() {
  const Model = getInvitationModel();

  return {
    async create(input: {
      organizationId: string;
      email: string;
      role: OrganisationRole;
      createdBy: string;
      inviterName: string;
      organisationName: string;
      rawToken: string;
      expiresAt: Date;
    }): Promise<Invitation> {
      const doc = await Model.create({
        organizationId: input.organizationId,
        email: input.email,
        role: input.role,
        createdBy: input.createdBy,
        inviterName: input.inviterName,
        organisationName: input.organisationName,
        tokenHash: hashInvitationToken(input.rawToken),
        expiresAt: input.expiresAt,
      });
      return toDomain(doc as InvitationDocument);
    },

    async findById(id: string): Promise<Invitation | null> {
      if (!/^[a-fA-F0-9]{24}$/.test(id)) return null;
      const doc = await Model.findById(id).lean();
      return doc ? toDomain(doc as InvitationDocument) : null;
    },

    async findByOrgAndEmail(
      organizationId: string,
      email: string
    ): Promise<Invitation | null> {
      const doc = await Model.findOne({
        organizationId,
        email: email.toLowerCase(),
      }).lean();
      return doc ? toDomain(doc as InvitationDocument) : null;
    },

    async findByRawToken(rawToken: string): Promise<Invitation | null> {
      const doc = await Model.findOne({
        tokenHash: hashInvitationToken(rawToken),
      }).lean();
      return doc ? toDomain(doc as InvitationDocument) : null;
    },

    async listByOrganization(
      organizationId: string,
      options: { page: number; pageSize: number; search?: string }
    ): Promise<{ items: Invitation[]; total: number }> {
      const filter: Record<string, unknown> = { organizationId };
      if (options.search) {
        filter.email = {
          $regex: options.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          $options: "i",
        };
      }
      const total = await Model.countDocuments(filter);
      const docs = await Model.find(filter)
        .sort({ createdAt: -1 })
        .skip((options.page - 1) * options.pageSize)
        .limit(options.pageSize)
        .lean();
      return {
        items: docs.map((doc) => toDomain(doc as InvitationDocument)),
        total,
      };
    },

    /** Pending invitations addressed to an email (recipient routing). */
    async listByEmail(email: string): Promise<Invitation[]> {
      const docs = await Model.find({ email: email.toLowerCase() })
        .sort({ createdAt: -1 })
        .lean();
      return docs.map((doc) => toDomain(doc as InvitationDocument));
    },

    async listAllByOrganization(
      organizationId: string
    ): Promise<Invitation[]> {
      const docs = await Model.find({ organizationId }).lean();
      return docs.map((doc) => toDomain(doc as InvitationDocument));
    },

    async countByOrganization(organizationId: string): Promise<number> {
      return Model.countDocuments({ organizationId });
    },

    /** Regenerate the acceptance token (resend). Old links stop working. */
    async rotateToken(
      id: string,
      rawToken: string,
      expiresAt: Date
    ): Promise<Invitation | null> {
      const doc = await Model.findByIdAndUpdate(
        id,
        {
          $set: {
            tokenHash: hashInvitationToken(rawToken),
            expiresAt,
          },
        },
        { returnDocument: "after" }
      ).lean();
      return doc ? toDomain(doc as InvitationDocument) : null;
    },

    async remove(id: string): Promise<boolean> {
      const result = await Model.deleteOne({ _id: id });
      return result.deletedCount > 0;
    },
  };
}
