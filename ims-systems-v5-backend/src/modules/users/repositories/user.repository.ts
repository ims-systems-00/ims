import {
  getUserModel,
  type UserDocument,
} from "./user.model";
import type {
  AccessPolicyBinding,
  AddWorkingLocationInput,
  ProfileImage,
  ProvisionUserInput,
  SignatureInfo,
  SystemAccessStatus,
  UpdatePreferencesInput,
  UpdateProfileImageInput,
  UpdateSignatureInput,
  UpdateUserProfileInput,
  User,
  UserType,
} from "../types";

function toDomain(doc: UserDocument): User {
  return {
    id: String(doc._id),
    reference: doc.reference,
    type: doc.type as UserType,
    firstName: doc.firstName,
    lastName: doc.lastName,
    name: doc.name,
    email: doc.email,
    emailVerified: {
      status: (doc.emailVerified?.status as User["emailVerified"]["status"]) ??
        "pending",
      on: doc.emailVerified?.on ?? null,
    },
    phone: doc.phone ?? "",
    phoneVerified: {
      status:
        (doc.phoneVerified?.status as User["phoneVerified"]["status"]) ??
        "pending",
      on: doc.phoneVerified?.on ?? null,
    },
    systemPasswordStatus:
      (doc.systemPassword?.status as User["systemPasswordStatus"]) ?? "active",
    systemAccess: {
      status:
        (doc.systemAccess?.status as SystemAccessStatus) ?? "Active",
      period: doc.systemAccess?.period ?? "Full time",
      expires: doc.systemAccess?.expires ?? null,
      updatedOn: doc.systemAccess?.updatedOn ?? null,
    },
    accessPolicies: (doc.accessPolicies ?? []).map((policy) => ({
      groupId: policy.groupId,
      roleId: policy.roleId ?? undefined,
    })),
    profileImage: {
      url:
        doc.profileImage?.url ??
        "https://assets.imssystems.tech/images/system/avatar-placeholder.jpg",
      fileName: doc.profileImage?.fileName ?? undefined,
      storageKey: doc.profileImage?.storageKey ?? undefined,
    },
    signatureInfo: {
      url: doc.signatureInfo?.url ?? undefined,
      fileName: doc.signatureInfo?.fileName ?? undefined,
      storageKey: doc.signatureInfo?.storageKey ?? undefined,
    },
    preferences: {
      darkMode: Boolean(doc.preferences?.darkMode),
      activeTheme: doc.preferences?.activeTheme ?? "blue",
    },
    country: {
      name: doc.country?.name ?? "United Kingdom",
      code: doc.country?.code ?? "GB",
    },
    locations: (doc.locations ?? []).map((location) => ({
      id: String((location as { _id?: unknown })._id ?? ""),
      type: location.type,
      address: location.address,
    })),
    loggedIn: {
      status: doc.loggedIn?.status ?? null,
      on: doc.loggedIn?.on ?? null,
    },
    createdBy: doc.createdBy ?? null,
    createdOn: doc.createdOn ?? null,
    badAttempts: doc.badAttempts ?? 0,
    lockedUntil: doc.lockedUntil ?? null,
    deletedAt: doc.deletedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type SoftDeletePayload = {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type UserRepository = {
  create: (
    input: ProvisionUserInput & {
      reference: string;
      passwordHash: string;
      systemPasswordStatus: "active" | "blocked";
      systemAccessExpires: Date | null;
    }
  ) => Promise<User>;
  findById: (id: string) => Promise<User | null>;
  findByIdIncludingDeleted: (id: string) => Promise<User | null>;
  findByEmail: (email: string) => Promise<User | null>;
  findPasswordHash: (id: string) => Promise<string | null>;
  listActiveByIds: (
    ids: string[],
    options: {
      page: number;
      pageSize: number;
      search?: string;
    }
  ) => Promise<{ items: User[]; total: number }>;
  listAllActiveIds: () => Promise<Array<Pick<User, "id">>>;
  updateProfile: (
    id: string,
    input: UpdateUserProfileInput & { name: string }
  ) => Promise<User | null>;
  updatePreferences: (
    id: string,
    input: UpdatePreferencesInput
  ) => Promise<User | null>;
  updateSystemAccess: (
    id: string,
    input: {
      status: SystemAccessStatus;
      expires: Date | null;
    }
  ) => Promise<User | null>;
  updatePassword: (
    id: string,
    passwordHash: string,
    systemPasswordStatus: "active" | "blocked"
  ) => Promise<boolean>;
  updateProfileImage: (
    id: string,
    input: UpdateProfileImageInput
  ) => Promise<User | null>;
  updateSignature: (
    id: string,
    input: UpdateSignatureInput
  ) => Promise<User | null>;
  addLocation: (
    id: string,
    input: AddWorkingLocationInput
  ) => Promise<User | null>;
  removeLocation: (id: string, locationId: string) => Promise<User | null>;
  softDelete: (id: string, payload: SoftDeletePayload) => Promise<User | null>;
  setAccessPolicies: (
    id: string,
    accessPolicies: AccessPolicyBinding[]
  ) => Promise<User | null>;
};

export function createUserRepository(): UserRepository {
  const model = getUserModel();

  return {
    async create(input) {
      const created = await model.create({
        reference: input.reference,
        type: input.type,
        firstName: input.firstName,
        lastName: input.lastName,
        name: `${input.firstName} ${input.lastName}`.trim(),
        email: input.email.toLowerCase(),
        passwordHash: input.passwordHash,
        systemPassword: { status: input.systemPasswordStatus },
        systemAccess: {
          status: "Active",
          period: input.systemAccessPeriod ?? "Full time",
          expires: input.systemAccessExpires,
          updatedOn: new Date(),
        },
        createdBy: input.createdBy ?? null,
        createdOn: new Date(),
        deletedAt: null,
      });
      return toDomain(created);
    },

    async findById(id) {
      if (!/^[a-fA-F0-9]{24}$/.test(id)) {
        return null;
      }
      const doc = await model
        .findOne({ _id: id, deletedAt: null })
        .exec();
      return doc ? toDomain(doc) : null;
    },

    async findByIdIncludingDeleted(id) {
      if (!/^[a-fA-F0-9]{24}$/.test(id)) {
        return null;
      }
      const doc = await model.findById(id).exec();
      return doc ? toDomain(doc) : null;
    },

    async findByEmail(email) {
      const doc = await model
        .findOne({ email: email.toLowerCase(), deletedAt: null })
        .exec();
      return doc ? toDomain(doc) : null;
    },

    async findPasswordHash(id) {
      if (!/^[a-fA-F0-9]{24}$/.test(id)) {
        return null;
      }
      const doc = await model
        .findOne({ _id: id, deletedAt: null })
        .select("passwordHash")
        .lean()
        .exec();
      return doc?.passwordHash ?? null;
    },

    async listActiveByIds(ids, options) {
      if (ids.length === 0) {
        return { items: [], total: 0 };
      }

      const filter: Record<string, unknown> = {
        _id: { $in: ids },
        deletedAt: null,
        "systemAccess.status": "Active",
      };

      if (options.search && options.search.length > 0) {
        const escaped = options.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "i");
        filter.$or = [
          { name: regex },
          { email: regex },
          { firstName: regex },
          { lastName: regex },
          { reference: regex },
        ];
      }

      const skip = (options.page - 1) * options.pageSize;
      const [items, total] = await Promise.all([
        model
          .find(filter)
          .sort({ name: 1 })
          .skip(skip)
          .limit(options.pageSize)
          .exec(),
        model.countDocuments(filter).exec(),
      ]);

      return { items: items.map(toDomain), total };
    },

    async listAllActiveIds() {
      const docs = await model
        .find({
          deletedAt: null,
          "systemAccess.status": "Active",
        })
        .select("_id")
        .lean()
        .exec();
      return docs.map((doc) => ({ id: String(doc._id) }));
    },

    async updateProfile(id, input) {
      const doc = await model
        .findOneAndUpdate(
          { _id: id, deletedAt: null },
          {
            $set: {
              firstName: input.firstName,
              lastName: input.lastName,
              name: input.name,
            },
          },
          { returnDocument: "after" }
        )
        .exec();
      return doc ? toDomain(doc) : null;
    },

    async updatePreferences(id, input) {
      const $set: Record<string, unknown> = {};
      if (input.darkMode !== undefined) {
        $set["preferences.darkMode"] = input.darkMode;
      }
      if (input.activeTheme !== undefined) {
        $set["preferences.activeTheme"] = input.activeTheme;
      }
      const doc = await model
        .findOneAndUpdate(
          { _id: id, deletedAt: null },
          { $set },
          { returnDocument: "after" }
        )
        .exec();
      return doc ? toDomain(doc) : null;
    },

    async updateSystemAccess(id, input) {
      const doc = await model
        .findOneAndUpdate(
          { _id: id, deletedAt: null },
          {
            $set: {
              "systemAccess.status": input.status,
              "systemAccess.expires": input.expires,
              "systemAccess.updatedOn": new Date(),
            },
          },
          { returnDocument: "after" }
        )
        .exec();
      return doc ? toDomain(doc) : null;
    },

    async updatePassword(id, passwordHash, systemPasswordStatus) {
      const result = await model
        .updateOne(
          { _id: id, deletedAt: null },
          {
            $set: {
              passwordHash,
              "systemPassword.status": systemPasswordStatus,
            },
          }
        )
        .exec();
      return result.modifiedCount === 1;
    },

    async updateProfileImage(id, input) {
      const $set: ProfileImage = {
        url: input.url,
        fileName: input.fileName,
        storageKey: input.storageKey,
      };
      const doc = await model
        .findOneAndUpdate(
          { _id: id, deletedAt: null },
          { $set: { profileImage: $set } },
          { returnDocument: "after" }
        )
        .exec();
      return doc ? toDomain(doc) : null;
    },

    async updateSignature(id, input) {
      const $set: SignatureInfo = {
        url: input.url,
        fileName: input.fileName,
        storageKey: input.storageKey,
      };
      const doc = await model
        .findOneAndUpdate(
          { _id: id, deletedAt: null },
          { $set: { signatureInfo: $set } },
          { returnDocument: "after" }
        )
        .exec();
      return doc ? toDomain(doc) : null;
    },

    async addLocation(id, input) {
      const doc = await model
        .findOneAndUpdate(
          { _id: id, deletedAt: null },
          { $push: { locations: input } },
          { returnDocument: "after" }
        )
        .exec();
      return doc ? toDomain(doc) : null;
    },

    async removeLocation(id, locationId) {
      const doc = await model
        .findOneAndUpdate(
          { _id: id, deletedAt: null },
          { $pull: { locations: { _id: locationId } } },
          { returnDocument: "after" }
        )
        .exec();
      return doc ? toDomain(doc) : null;
    },

    async softDelete(id, payload) {
      const doc = await model
        .findOneAndUpdate(
          { _id: id, deletedAt: null },
          {
            $set: {
              name: payload.name,
              firstName: payload.firstName,
              lastName: payload.lastName,
              email: payload.email,
              accessPolicies: [],
              systemAccess: {
                status: "Deactivated",
                period: "Full time",
                expires: null,
                updatedOn: new Date(),
              },
              deletedAt: new Date(),
            },
          },
          { returnDocument: "after" }
        )
        .exec();
      return doc ? toDomain(doc) : null;
    },

    async setAccessPolicies(id, accessPolicies) {
      const doc = await model
        .findOneAndUpdate(
          { _id: id, deletedAt: null },
          { $set: { accessPolicies } },
          { returnDocument: "after" }
        )
        .exec();
      return doc ? toDomain(doc) : null;
    },
  };
}
