import type {
  CreateFormElementInput,
  FormElement,
  UpdateFormElementInput,
} from "../types";
import {
  getFormElementModel,
  type FormElementDocument,
} from "./form-element.model";

function mapElement(doc: FormElementDocument): FormElement {
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    formId: doc.formId,
    type: doc.type,
    attributes: (doc.attributes ?? {}) as Record<string, unknown>,
    previousElementId: doc.previousElementId ?? null,
    nextElementId: doc.nextElementId ?? null,
    parentElementId: doc.parentElementId ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type FormElementRepository = ReturnType<
  typeof createFormElementRepository
>;

export function createFormElementRepository() {
  const Model = () => getFormElementModel();

  async function findDoc(
    organizationId: string,
    formId: string,
    id: string
  ): Promise<FormElementDocument | null> {
    return Model()
      .findOne({ _id: id, organizationId, formId })
      .lean() as Promise<FormElementDocument | null>;
  }

  async function findHead(
    organizationId: string,
    formId: string
  ): Promise<FormElementDocument | null> {
    return Model()
      .findOne({
        organizationId,
        formId,
        previousElementId: null,
      })
      .lean() as Promise<FormElementDocument | null>;
  }

  return {
    mapElement,

    async findById(
      organizationId: string,
      formId: string,
      id: string
    ): Promise<FormElement | null> {
      const doc = await findDoc(organizationId, formId, id);
      return doc ? mapElement(doc) : null;
    },

    async listOrdered(
      organizationId: string,
      formId: string
    ): Promise<FormElement[]> {
      const docs = (await Model()
        .find({ organizationId, formId })
        .lean()) as FormElementDocument[];
      if (docs.length === 0) return [];

      const byId = new Map(docs.map((d) => [String(d._id), d]));
      let current =
        docs.find((d) => d.previousElementId == null) ?? docs[0] ?? null;
      const ordered: FormElement[] = [];
      const seen = new Set<string>();
      while (current && !seen.has(String(current._id))) {
        ordered.push(mapElement(current));
        seen.add(String(current._id));
        const nextId = current.nextElementId;
        current = nextId ? byId.get(nextId) ?? null : null;
      }
      // Append orphans (broken list) so nothing is silently lost.
      for (const doc of docs) {
        if (!seen.has(String(doc._id))) {
          ordered.push(mapElement(doc));
        }
      }
      return ordered;
    },

    async create(
      organizationId: string,
      formId: string,
      input: CreateFormElementInput
    ): Promise<FormElement> {
      const afterId = input.afterElementId ?? null;
      const sessionDocs = await Model().find({ organizationId, formId }).lean();
      const count = sessionDocs.length;

      if (count === 0) {
        const created = await Model().create({
          organizationId,
          formId,
          type: input.type,
          attributes: input.attributes ?? {},
          previousElementId: null,
          nextElementId: null,
          parentElementId: input.parentElementId ?? null,
        });
        return mapElement(created.toObject() as FormElementDocument);
      }

      if (afterId == null) {
        const head = await findHead(organizationId, formId);
        const created = await Model().create({
          organizationId,
          formId,
          type: input.type,
          attributes: input.attributes ?? {},
          previousElementId: null,
          nextElementId: head ? String(head._id) : null,
          parentElementId: input.parentElementId ?? null,
        });
        const newId = String(created._id);
        if (head) {
          await Model().updateOne(
            { _id: head._id },
            { $set: { previousElementId: newId } }
          );
        }
        return mapElement(created.toObject() as FormElementDocument);
      }

      const after = await findDoc(organizationId, formId, afterId);
      if (!after) {
        throw new Error("afterElementId not found");
      }
      const nextId = after.nextElementId;
      const created = await Model().create({
        organizationId,
        formId,
        type: input.type,
        attributes: input.attributes ?? {},
        previousElementId: afterId,
        nextElementId: nextId,
        parentElementId: input.parentElementId ?? null,
      });
      const newId = String(created._id);
      await Model().updateOne(
        { _id: afterId },
        { $set: { nextElementId: newId } }
      );
      if (nextId) {
        await Model().updateOne(
          { _id: nextId },
          { $set: { previousElementId: newId } }
        );
      }
      return mapElement(created.toObject() as FormElementDocument);
    },

    async update(
      organizationId: string,
      formId: string,
      id: string,
      input: UpdateFormElementInput
    ): Promise<FormElement | null> {
      const $set: Record<string, unknown> = {};
      if (input.type !== undefined) $set.type = input.type;
      if (input.attributes !== undefined) $set.attributes = input.attributes;
      if (input.parentElementId !== undefined) {
        $set.parentElementId = input.parentElementId;
      }
      const doc = await Model()
        .findOneAndUpdate(
          { _id: id, organizationId, formId },
          { $set },
          { new: true }
        )
        .lean();
      return doc ? mapElement(doc as FormElementDocument) : null;
    },

    async reorder(
      organizationId: string,
      formId: string,
      id: string,
      afterElementId: string | null,
      parentElementId?: string | null
    ): Promise<FormElement | null> {
      if (afterElementId === id) {
        throw new Error("Cannot place an element after itself");
      }
      const target = await findDoc(organizationId, formId, id);
      if (!target) return null;

      // Detach
      const prevId = target.previousElementId;
      const nextId = target.nextElementId;
      if (prevId) {
        await Model().updateOne(
          { _id: prevId },
          { $set: { nextElementId: nextId } }
        );
      }
      if (nextId) {
        await Model().updateOne(
          { _id: nextId },
          { $set: { previousElementId: prevId } }
        );
      }

      const parentPatch =
        parentElementId !== undefined
          ? { parentElementId }
          : {};

      // Attach
      if (afterElementId == null) {
        const head = await findHead(organizationId, formId);
        // If head is the detached target, use former next as head candidate.
        const newHead =
          head && String(head._id) === id
            ? nextId
              ? await findDoc(organizationId, formId, nextId)
              : null
            : head;
        await Model().updateOne(
          { _id: id },
          {
            $set: {
              previousElementId: null,
              nextElementId: newHead ? String(newHead._id) : null,
              ...parentPatch,
            },
          }
        );
        if (newHead) {
          await Model().updateOne(
            { _id: newHead._id },
            { $set: { previousElementId: id } }
          );
        }
      } else {
        const after = await findDoc(organizationId, formId, afterElementId);
        if (!after) throw new Error("afterElementId not found");
        const afterNext = after.nextElementId;
        await Model().updateOne(
          { _id: id },
          {
            $set: {
              previousElementId: afterElementId,
              nextElementId: afterNext,
              ...parentPatch,
            },
          }
        );
        await Model().updateOne(
          { _id: afterElementId },
          { $set: { nextElementId: id } }
        );
        if (afterNext && afterNext !== id) {
          await Model().updateOne(
            { _id: afterNext },
            { $set: { previousElementId: id } }
          );
        }
      }

      return this.findById(organizationId, formId, id);
    },

    async hardDelete(
      organizationId: string,
      formId: string,
      id: string
    ): Promise<boolean> {
      const target = await findDoc(organizationId, formId, id);
      if (!target) return false;

      // Promote first child to row leader; re-parent remaining siblings.
      const children = await Model()
        .find({ organizationId, formId, parentElementId: id })
        .lean();
      if (children.length > 0) {
        const ordered = await this.listOrdered(organizationId, formId);
        const childIds = new Set(children.map((doc) => String(doc._id)));
        const orderedChildren = ordered.filter((el) => childIds.has(el.id));
        const [first, ...rest] = orderedChildren;
        if (first) {
          await Model().updateOne(
            { _id: first.id },
            { $set: { parentElementId: null } }
          );
          if (rest.length > 0) {
            await Model().updateMany(
              { _id: { $in: rest.map((el) => el.id) } },
              { $set: { parentElementId: first.id } }
            );
          }
        }
      }

      const prevId = target.previousElementId;
      const nextId = target.nextElementId;
      if (prevId) {
        await Model().updateOne(
          { _id: prevId },
          { $set: { nextElementId: nextId } }
        );
      }
      if (nextId) {
        await Model().updateOne(
          { _id: nextId },
          { $set: { previousElementId: prevId } }
        );
      }
      const result = await Model().deleteOne({
        _id: id,
        organizationId,
        formId,
      });
      return result.deletedCount > 0;
    },

    async hardDeleteByForm(
      organizationId: string,
      formId: string
    ): Promise<number> {
      const result = await Model().deleteMany({ organizationId, formId });
      return result.deletedCount ?? 0;
    },

    async createManySequential(
      organizationId: string,
      formId: string,
      seeds: Array<{ type: string; attributes?: Record<string, unknown> }>
    ): Promise<FormElement[]> {
      const created: FormElement[] = [];
      let afterId: string | null = null;
      for (const seed of seeds) {
        const el = await this.create(organizationId, formId, {
          type: seed.type,
          attributes: seed.attributes,
          afterElementId: afterId,
        });
        created.push(el);
        afterId = el.id;
      }
      return created;
    },
  };
}
