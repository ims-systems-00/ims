import type {
  CreateSessionInput,
  TrainingAttachment,
  TrainingInviteLog,
  TrainingRsvpEntry,
  TrainingSession,
  UpdateSessionInput,
} from "../types";
import {
  getTrainingSessionModel,
  type TrainingSessionDocument,
} from "./training-session.model";

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

function toAttachments(raw: unknown): TrainingAttachment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v) => v && typeof v === "object")
    .map((v) => {
      const row = v as Record<string, unknown>;
      return {
        id: String(row.id ?? ""),
        name: String(row.name ?? ""),
        size: Number(row.size ?? 0),
        type: String(row.type ?? ""),
        fileId: (row.fileId as string | null | undefined) ?? null,
        url: (row.url as string | null | undefined) ?? null,
        shared: Boolean(row.shared),
        note: String(row.note ?? ""),
        by: String(row.by ?? ""),
        t: String(row.t ?? ""),
      };
    });
}

function toInvites(raw: unknown): TrainingInviteLog[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v) => v && typeof v === "object")
    .map((v) => {
      const row = v as Record<string, unknown>;
      return {
        personId: String(row.personId ?? ""),
        to: String(row.to ?? ""),
        status: row.status as TrainingInviteLog["status"],
        t: String(row.t ?? ""),
        by: typeof row.by === "string" ? row.by : undefined,
        error: typeof row.error === "string" ? row.error : undefined,
      };
    });
}

function toRsvp(raw: unknown): Record<string, TrainingRsvpEntry> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, TrainingRsvpEntry> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!val || typeof val !== "object") continue;
    const v = val as Record<string, unknown>;
    out[key] = {
      status: v.status as TrainingRsvpEntry["status"],
      note: String(v.note ?? ""),
      t: String(v.t ?? ""),
    };
  }
  return out;
}

function toDomain(doc: TrainingSessionDocument): TrainingSession {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    cid: doc.cid,
    date: doc.date,
    time: doc.time ?? "",
    duration: doc.duration ?? 0,
    location: doc.location ?? "",
    trainer: doc.trainer ?? "",
    provider: doc.provider ?? "",
    cost: doc.cost ?? 0,
    note: doc.note ?? "",
    attendees: [...(doc.attendees ?? [])],
    materials: toAttachments(doc.materials),
    outputs: toAttachments(doc.outputs),
    invites: toInvites(doc.invites),
    rsvp: toRsvp(doc.rsvp),
    status: doc.status as TrainingSession["status"],
    cancelReason: doc.cancelReason ?? "",
    completedBy: doc.completedBy ?? null,
    completedAt: iso(doc.completedAt),
    createdBy: doc.createdBy,
    createdOn: iso(doc.createdOn) ?? new Date().toISOString(),
    createdAt: iso(doc.createdAt) ?? new Date().toISOString(),
    updatedAt: iso(doc.updatedAt) ?? new Date().toISOString(),
  };
}

export type UpdateTrainingSessionFields = UpdateSessionInput & {
  materials?: TrainingAttachment[];
  outputs?: TrainingAttachment[];
  invites?: TrainingInviteLog[];
  rsvp?: Record<string, TrainingRsvpEntry>;
  status?: TrainingSession["status"];
  cancelReason?: string;
  completedBy?: string | null;
  completedAt?: string | Date | null;
};

export type TrainingSessionRepository = ReturnType<
  typeof createTrainingSessionRepository
>;

export function createTrainingSessionRepository() {
  const Model = getTrainingSessionModel();

  return {
    async list(
      organizationId: string,
      opts?: { status?: string; cid?: string }
    ): Promise<TrainingSession[]> {
      const filter: Record<string, unknown> = { organizationId };
      if (opts?.status) filter.status = opts.status;
      if (opts?.cid) filter.cid = opts.cid;
      const docs = await Model.find(filter).sort({ date: 1 }).lean();
      return docs.map((d) => toDomain(d as TrainingSessionDocument));
    },

    async findById(
      organizationId: string,
      id: string
    ): Promise<TrainingSession | null> {
      const doc = await Model.findOne({ _id: id, organizationId }).lean();
      return doc ? toDomain(doc as TrainingSessionDocument) : null;
    },

    async create(
      organizationId: string,
      input: CreateSessionInput & {
        createdBy: string;
        status?: TrainingSession["status"];
        materials?: TrainingAttachment[];
        outputs?: TrainingAttachment[];
        invites?: TrainingInviteLog[];
        rsvp?: Record<string, TrainingRsvpEntry>;
      }
    ): Promise<TrainingSession> {
      const now = new Date();
      const doc = await Model.create({
        organizationId,
        cid: input.cid,
        date: input.date,
        time: input.time ?? "",
        duration: input.duration ?? 0,
        location: input.location?.trim() ?? "",
        trainer: input.trainer?.trim() ?? "",
        provider: input.provider?.trim() ?? "",
        cost: input.cost ?? 0,
        note: input.note?.trim() ?? "",
        attendees: input.attendees ?? [],
        materials: input.materials ?? [],
        outputs: input.outputs ?? [],
        invites: input.invites ?? [],
        rsvp: input.rsvp ?? {},
        status: input.status ?? "Planned",
        cancelReason: "",
        completedBy: null,
        completedAt: null,
        createdBy: input.createdBy,
        createdOn: now,
      });
      return toDomain(doc.toObject() as TrainingSessionDocument);
    },

    async update(
      organizationId: string,
      id: string,
      input: UpdateTrainingSessionFields
    ): Promise<TrainingSession | null> {
      const $set: Record<string, unknown> = {};
      if (input.cid !== undefined) $set.cid = input.cid;
      if (input.date !== undefined) $set.date = input.date;
      if (input.time !== undefined) $set.time = input.time;
      if (input.duration !== undefined) $set.duration = input.duration;
      if (input.location !== undefined) $set.location = input.location.trim();
      if (input.trainer !== undefined) $set.trainer = input.trainer.trim();
      if (input.provider !== undefined) $set.provider = input.provider.trim();
      if (input.cost !== undefined) $set.cost = input.cost;
      if (input.note !== undefined) $set.note = input.note.trim();
      if (input.attendees !== undefined) $set.attendees = input.attendees;
      if (input.materials !== undefined) $set.materials = input.materials;
      if (input.outputs !== undefined) $set.outputs = input.outputs;
      if (input.invites !== undefined) $set.invites = input.invites;
      if (input.rsvp !== undefined) $set.rsvp = input.rsvp;
      if (input.status !== undefined) $set.status = input.status;
      if (input.cancelReason !== undefined) {
        $set.cancelReason = input.cancelReason;
      }
      if (input.completedBy !== undefined) {
        $set.completedBy = input.completedBy;
      }
      if (input.completedAt !== undefined) {
        $set.completedAt =
          input.completedAt === null
            ? null
            : typeof input.completedAt === "string"
              ? new Date(input.completedAt)
              : input.completedAt;
      }

      if (!Object.keys($set).length) {
        return this.findById(organizationId, id);
      }

      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId },
        { $set },
        { new: true }
      ).lean();
      return doc ? toDomain(doc as TrainingSessionDocument) : null;
    },
  };
}
