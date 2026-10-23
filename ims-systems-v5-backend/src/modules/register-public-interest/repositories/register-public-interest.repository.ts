import type {
  RegisterPublicInterest,
  RegisterPublicInterestInput,
} from "../types";
import {
  getRegisterPublicInterestModel,
  type RegisterPublicInterestDocument,
} from "./register-public-interest.model";

function toDomain(doc: RegisterPublicInterestDocument): RegisterPublicInterest {
  return {
    id: String(doc._id),
    name: doc.name,
    email: doc.email,
    companyName: doc.companyName,
    product: doc.product,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type RegisterPublicInterestRepository = ReturnType<
  typeof createRegisterPublicInterestRepository
>;

export function createRegisterPublicInterestRepository() {
  const Model = getRegisterPublicInterestModel();

  return {
    async findByEmail(email: string): Promise<RegisterPublicInterest | null> {
      const doc = await Model.findOne({
        email: email.trim().toLowerCase(),
      }).lean();
      return doc ? toDomain(doc as RegisterPublicInterestDocument) : null;
    },

    async create(
      input: RegisterPublicInterestInput
    ): Promise<RegisterPublicInterest> {
      const doc = await Model.create({
        name: input.name,
        email: input.email.trim().toLowerCase(),
        companyName: input.companyName,
        product: input.product,
      });
      return toDomain(doc as RegisterPublicInterestDocument);
    },
  };
}
