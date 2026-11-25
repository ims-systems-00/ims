import type {
  CreatePersonInput,
  TrainingExemption,
  TrainingHistoryEntry,
  TrainingPerson,
  UpdatePersonInput,
} from "../types";
import {
  getTrainingPersonModel,
  type TrainingPersonDocument,
} from "./training-person.model";

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

function toDomain(doc: TrainingPersonDocument): TrainingPerson {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    name: doc.name,
    roles: [...(doc.roles ?? [])],
    site: doc.site ?? "",
    manager: doc.manager ?? "",
    start: doc.start ?? "",
    email: doc.email ?? "",
    status: doc.status as TrainingPerson["status"],
    end: doc.end ?? "",
    extra: [...(doc.extra ?? [])],
    exempt: (doc.exempt ?? []).map((e) => ({
      cid: e.cid,
      reason: e.reason ?? "",
      by: e.by ?? "",
      date: e.date,
    })),
    external: Boolean(doc.external),
    company: doc.company ?? "",
    userId: doc.userId ?? null,
    hist: (doc.hist ?? []).map((h) => ({
      t: h.t,
      by: h.by,
      what: h.what,
    })),
    createdAt: iso(doc.createdAt) ?? new Date().toISOString(),
    updatedAt: iso(doc.updatedAt) ?? new Date().toISOString(),
  };
}

export type ListTrainingPeopleFilters = {
  status?: string;
  site?: string;
  external?: boolean;
  role?: string;
  search?: string;
};

export type TrainingPersonRepository = ReturnType<
  typeof createTrainingPersonRepository
>;

export function createTrainingPersonRepository() {
  const Model = getTrainingPersonModel();

  return {
    async list(
      organizationId: string,
      filters?: ListTrainingPeopleFilters
    ): Promise<TrainingPerson[]> {
      const filter: Record<string, unknown> = { organizationId };
      if (filters?.status) filter.status = filters.status;
      if (filters?.site) filter.site = filters.site;
      if (filters?.external !== undefined) filter.external = filters.external;
      if (filters?.role) filter.roles = filters.role;
      if (filters?.search?.trim()) {
        const q = filters.search.trim();
        filter.$or = [
          { name: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
          { company: { $regex: q, $options: "i" } },
          { manager: { $regex: q, $options: "i" } },
        ];
      }

      const docs = await Model.find(filter).sort({ name: 1 }).lean();
      return docs.map((d) => toDomain(d as TrainingPersonDocument));
    },

    async findById(
      organizationId: string,
      id: string
    ): Promise<TrainingPerson | null> {
      const doc = await Model.findOne({ _id: id, organizationId }).lean();
      return doc ? toDomain(doc as TrainingPersonDocument) : null;
    },

    async findByEmail(
      organizationId: string,
      email: string
    ): Promise<TrainingPerson | null> {
      const normalized = email.trim().toLowerCase();
      if (!normalized) return null;
      const doc = await Model.findOne({
        organizationId,
        email: { $regex: `^${escapeRegex(normalized)}$`, $options: "i" },
      }).lean();
      return doc ? toDomain(doc as TrainingPersonDocument) : null;
    },

    async findByUserId(
      organizationId: string,
      userId: string
    ): Promise<TrainingPerson | null> {
      const id = userId.trim();
      if (!id) return null;
      const doc = await Model.findOne({ organizationId, userId: id }).lean();
      return doc ? toDomain(doc as TrainingPersonDocument) : null;
    },

    async create(
      organizationId: string,
      input: CreatePersonInput & {
        hist?: TrainingHistoryEntry[];
        exempt?: TrainingExemption[];
        end?: string;
      }
    ): Promise<TrainingPerson> {
      const doc = await Model.create({
        organizationId,
        name: input.name.trim(),
        roles: input.roles ?? [],
        site: input.site?.trim() ?? "",
        manager: input.manager?.trim() ?? "",
        start: input.start ?? "",
        email: input.email?.trim() ?? "",
        status: input.status ?? "Active",
        end: input.end ?? "",
        extra: input.extra ?? [],
        exempt: input.exempt ?? [],
        external: Boolean(input.external),
        company: input.company?.trim() ?? "",
        userId: input.userId ?? null,
        hist: input.hist ?? [],
      });
      return toDomain(doc.toObject() as TrainingPersonDocument);
    },

    async update(
      organizationId: string,
      id: string,
      input: UpdatePersonInput & {
        hist?: TrainingHistoryEntry[];
        exempt?: TrainingExemption[];
        /** Push a single history entry (prepended). */
        pushHist?: TrainingHistoryEntry;
      }
    ): Promise<TrainingPerson | null> {
      const $set: Record<string, unknown> = {};
      if (input.name !== undefined) $set.name = input.name.trim();
      if (input.roles !== undefined) $set.roles = input.roles;
      if (input.site !== undefined) $set.site = input.site.trim();
      if (input.manager !== undefined) $set.manager = input.manager.trim();
      if (input.start !== undefined) $set.start = input.start;
      if (input.email !== undefined) $set.email = input.email.trim();
      if (input.status !== undefined) $set.status = input.status;
      if (input.end !== undefined) $set.end = input.end;
      if (input.extra !== undefined) $set.extra = input.extra;
      if (input.exempt !== undefined) $set.exempt = input.exempt;
      if (input.external !== undefined) $set.external = input.external;
      if (input.company !== undefined) $set.company = input.company.trim();
      if (input.userId !== undefined) $set.userId = input.userId;
      if (input.hist !== undefined) $set.hist = input.hist;

      const update: Record<string, unknown> = {};
      if (Object.keys($set).length) update.$set = $set;
      if (input.pushHist) {
        update.$push = {
          hist: {
            $each: [input.pushHist],
            $position: 0,
            $slice: 500,
          },
        };
      }

      if (!Object.keys(update).length) {
        return this.findById(organizationId, id);
      }

      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId },
        update,
        { new: true }
      ).lean();
      return doc ? toDomain(doc as TrainingPersonDocument) : null;
    },
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
