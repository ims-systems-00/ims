import type {
  AiChatMessage,
  AiChatPinnedRecord,
  AiChatThread,
  AiChatThreadSummary,
} from "../types/chat";
import {
  getAiChatThreadModel,
  type AiChatThreadDocument,
} from "./ai-chat-thread.model";

function mapMessage(
  raw: AiChatThreadDocument["messages"][number]
): AiChatMessage {
  const row = raw as typeof raw & { _id?: { toString(): string } };
  return {
    id: row._id?.toString?.() ?? String(Date.now()),
    role: row.role as AiChatMessage["role"],
    content: row.content,
    citations: (row.citations ?? []).map((c) => ({
      module: c.module,
      id: c.id,
      reference: c.reference ?? null,
      title: c.title,
      href: c.href,
    })),
    createdAt: row.createdAt,
  };
}

function mapDoc(doc: AiChatThreadDocument): AiChatThread {
  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    userId: doc.userId,
    title: doc.title,
    pinnedRecords: (doc.pinnedRecords ?? []).map((p) => ({
      module: p.module,
      id: p.id,
    })),
    messages: (doc.messages ?? []).map(mapMessage),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type AiChatThreadRepository = ReturnType<
  typeof createAiChatThreadRepository
>;

export function createAiChatThreadRepository() {
  const Model = getAiChatThreadModel();

  return {
    async create(input: {
      organizationId: string;
      userId: string;
      title?: string;
      pinnedRecords?: AiChatPinnedRecord[];
    }): Promise<AiChatThread> {
      const created = await Model.create({
        organizationId: input.organizationId,
        userId: input.userId,
        title: input.title?.trim() || "New chat",
        pinnedRecords: input.pinnedRecords ?? [],
        messages: [],
      });
      return mapDoc(created.toObject() as AiChatThreadDocument);
    },

    async findById(
      organizationId: string,
      userId: string,
      id: string
    ): Promise<AiChatThread | null> {
      const doc = await Model.findOne({
        _id: id,
        organizationId,
        userId,
      }).lean();
      return doc ? mapDoc(doc as AiChatThreadDocument) : null;
    },

    async listSummaries(
      organizationId: string,
      userId: string,
      limit = 20
    ): Promise<AiChatThreadSummary[]> {
      const docs = await Model.find({ organizationId, userId })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .select({ title: 1, updatedAt: 1, messages: 1 })
        .lean();
      return docs.map((doc) => ({
        id: String(doc._id),
        title: String(doc.title ?? "New chat"),
        updatedAt: doc.updatedAt as Date,
        messageCount: Array.isArray(doc.messages) ? doc.messages.length : 0,
      }));
    },

    async appendMessages(
      organizationId: string,
      userId: string,
      id: string,
      messages: Array<{
        role: "user" | "assistant";
        content: string;
        citations?: AiChatMessage["citations"];
      }>,
      patch?: { title?: string; pinnedRecords?: AiChatPinnedRecord[] }
    ): Promise<AiChatThread | null> {
      const $push = {
        messages: {
          $each: messages.map((m) => ({
            role: m.role,
            content: m.content,
            citations: m.citations ?? [],
            createdAt: new Date(),
          })),
        },
      };
      const $set: Record<string, unknown> = {};
      if (patch?.title?.trim()) $set.title = patch.title.trim().slice(0, 120);
      if (patch?.pinnedRecords) $set.pinnedRecords = patch.pinnedRecords;

      const doc = await Model.findOneAndUpdate(
        { _id: id, organizationId, userId },
        { $push, ...(Object.keys($set).length ? { $set } : {}) },
        { new: true }
      ).lean();
      return doc ? mapDoc(doc as AiChatThreadDocument) : null;
    },

    async delete(
      organizationId: string,
      userId: string,
      id: string
    ): Promise<boolean> {
      const result = await Model.deleteOne({ _id: id, organizationId, userId });
      return result.deletedCount > 0;
    },
  };
}
