/**
 * ALICE task runner — drafts with approval.
 *
 *   run      → build context from live compliance data → model → validate JSON
 *              → store the draft (pending if it changes data, else ready)
 *   approve  → claim the draft → apply through the owning module's service
 *              (its own permissions) → activity "drafted by ALICE, approved by X"
 *              → recalculate clause health
 *   discard  → mark discarded; nothing changes
 */

import type { SecurityIdentity } from "../../../security";
import {
  AppError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import type { LiveComplianceRepository } from "../repositories/live-compliance.repository";
import type { LiveComplianceService } from "../services/live-compliance.service";
import { LIVE_COMPLIANCE_RESOURCE } from "../types";
import type { Authorizer } from "../../../security";
import type { AliceDraft, AliceDraftRepository, AliceDraftStatus } from "./alice-draft.repository";
import {
  ALICE_SYSTEM_PROMPT,
  ALICE_TASKS,
  AliceRefError,
  isAliceTaskId,
  type AliceRecordsPort,
  type AliceTaskId,
} from "./tasks";

/** Language model: one completion, text in → text out. */
export type AliceModelPort = {
  generateText(input: {
    prompt: string;
    systemInstructions: Array<{ role: "system"; content: string }>;
    conversation: [];
    maxTokens?: number;
  }): Promise<string>;
};

/** Applies an approved draft through the owning module (re-checks permissions). */
export type AliceApplyHandler = (input: {
  identity: SecurityIdentity;
  organizationId: string;
  ref: string | null;
  output: any;
}) => Promise<{ source: string; message: string }>;

export type AliceApplyRegistry = Partial<Record<AliceTaskId, AliceApplyHandler>>;

export type AliceRunEvent =
  | { type: "status"; message: string }
  | { type: "draft"; draft: AliceDraft }
  | { type: "error"; message: string };

export type AliceServiceDeps = {
  authorizer: Authorizer;
  live: Pick<LiveComplianceService, "contextForOrganization" | "recalc">;
  drafts: AliceDraftRepository;
  activity: Pick<LiveComplianceRepository, "addActivity">;
  model: AliceModelPort;
  records: AliceRecordsPort;
  apply: AliceApplyRegistry;
  organisationName?: (organizationId: string) => Promise<string | null>;
  displayName?: (userId: string) => Promise<string | null>;
  now?: () => Date;
};

const MAX_ATTEMPTS = 2;

/** Pull the JSON object out of a model reply (tolerates code fences / prose). */
export function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const body = (fenced?.[1] ?? text).trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object in reply");
  return JSON.parse(body.slice(start, end + 1));
}

export type AliceService = ReturnType<typeof createAliceService>;

export function createAliceService(deps: AliceServiceDeps) {
  const now = deps.now ?? (() => new Date());

  function requireOrgIdentity(identity: SecurityIdentity | null | undefined) {
    if (!identity?.subjectId) throw new UnauthorizedError();
    if (!identity.organizationId) throw new ForbiddenError("Organisation context is required");
    return { identity, organizationId: identity.organizationId, subjectId: identity.subjectId };
  }

  async function assertAllowed(identity: SecurityIdentity, action: "read" | "update") {
    const allowed = await deps.authorizer.allow({
      identity,
      action,
      resourceType: LIVE_COMPLIANCE_RESOURCE,
      organizationId: identity.organizationId,
    });
    if (!allowed) throw new ForbiddenError("User does not have permission to use ALICE for compliance");
  }

  function taskOrThrow(taskId: string) {
    if (!isAliceTaskId(taskId)) throw new NotFoundError(`Unknown ALICE task: ${taskId}`);
    return ALICE_TASKS[taskId];
  }

  return {
    tasks() {
      return Object.values(ALICE_TASKS).map((t) => ({
        id: t.id,
        title: t.title,
        requiresApproval: t.requiresApproval,
      }));
    },

    async run(
      identity: SecurityIdentity | null | undefined,
      taskId: string,
      ref: string | null,
      emit: (event: AliceRunEvent) => void
    ): Promise<AliceDraft> {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "read");
      const task = taskOrThrow(taskId);

      // Build context before streaming anything, so a bad reference is a
      // plain 400 rather than an error line mid-stream.
      const live = await deps.live.contextForOrganization(ctx.organizationId);
      let context: Record<string, unknown>;
      try {
        context = await task.buildContext({
          organizationId: ctx.organizationId,
          organisationName: (await deps.organisationName?.(ctx.organizationId)) ?? "the organisation",
          today: live.today,
          standards: live.standards,
          snapshot: live.snapshot,
          clauses: live.clauses,
          advice: live.advice,
          ref,
          records: deps.records,
        });
      } catch (error) {
        if (error instanceof AliceRefError) throw new ValidationAppError(error.message);
        throw error;
      }

      emit({ type: "status", message: "Read your compliance data" });

      const prompt = [
        `TASK: ${task.title}`,
        task.instructions,
        `TODAY: ${live.today}`,
        `RESPOND WITH JSON SHAPED LIKE: ${task.shape}`,
        `CONTEXT:\n${JSON.stringify(context)}`,
      ].join("\n\n");

      let output: unknown = null;
      let lastError = "";
      for (let attempt = 1; attempt <= MAX_ATTEMPTS && output === null; attempt++) {
        emit({ type: "status", message: attempt === 1 ? "Drafting" : "Tidying the draft" });
        const reply = await deps.model.generateText({
          prompt:
            attempt === 1
              ? prompt
              : `${prompt}\n\nYour previous reply was not valid (${lastError}). Reply again with only the JSON object.`,
          systemInstructions: [{ role: "system", content: ALICE_SYSTEM_PROMPT }],
          conversation: [],
          maxTokens: 2_000,
        });
        try {
          const parsed = task.schema.safeParse(extractJson(reply));
          if (parsed.success) {
            output = task.refine ? task.refine(parsed.data, context) : parsed.data;
          } else {
            lastError = parsed.error.issues
              .slice(0, 3)
              .map((i) => `${i.path.join(".") || "root"}: ${i.message}`)
              .join("; ");
          }
        } catch (error) {
          lastError = error instanceof Error ? error.message : "unreadable reply";
        }
      }
      if (output === null) {
        throw new AppError({
          message: "ALICE could not produce a usable draft. Please try again.",
          statusCode: 502,
          code: "ALICE_DRAFT_INVALID",
        });
      }

      const canApply = task.requiresApproval && Boolean(deps.apply[task.id]);
      const draft = await deps.drafts.create(ctx.organizationId, {
        task: task.id,
        ref,
        title: task.title,
        status: canApply ? "pending" : "ready",
        output,
        markdown: task.toMarkdown(output),
        applyLabel: canApply && task.applyLabel ? task.applyLabel(output, context) : null,
        createdBy: ctx.subjectId,
      });
      emit({ type: "draft", draft });
      return draft;
    },

    async listDrafts(
      identity: SecurityIdentity | null | undefined,
      query: { status?: AliceDraftStatus; limit?: number }
    ): Promise<AliceDraft[]> {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "read");
      return deps.drafts.list(ctx.organizationId, { status: query.status, limit: query.limit ?? 20 });
    },

    async getDraft(identity: SecurityIdentity | null | undefined, id: string): Promise<AliceDraft> {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "read");
      const draft = await deps.drafts.findById(ctx.organizationId, id);
      if (!draft) throw new NotFoundError("Draft not found");
      return draft;
    },

    async approve(identity: SecurityIdentity | null | undefined, id: string): Promise<AliceDraft> {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "update");
      const draft = await deps.drafts.findById(ctx.organizationId, id);
      if (!draft) throw new NotFoundError("Draft not found");
      if (draft.status !== "pending") {
        throw new ValidationAppError(
          draft.status === "ready" ? "This draft has nothing to apply" : `This draft was already ${draft.status}`
        );
      }
      const handler = deps.apply[draft.task];
      if (!handler) throw new ValidationAppError("This draft cannot be applied yet");

      const name =
        (await deps.displayName?.(ctx.subjectId)) ?? ctx.identity.email ?? "a team member";
      // Claim first so two approvals cannot apply twice.
      const claimed = await deps.drafts.decide(ctx.organizationId, id, {
        status: "approved",
        decidedBy: ctx.subjectId,
        decidedByName: name,
      });
      if (!claimed) throw new ValidationAppError("This draft was already decided");

      let result: { source: string; message: string };
      try {
        result = await handler({
          identity: ctx.identity,
          organizationId: ctx.organizationId,
          ref: draft.ref,
          output: draft.output,
        });
      } catch (error) {
        await deps.drafts.revertToPending(ctx.organizationId, id);
        throw error;
      }

      await deps.drafts.setAppliedMessage(ctx.organizationId, id, result.message);
      await deps.activity.addActivity(ctx.organizationId, [
        {
          source: result.source,
          text: `${result.message}. Drafted by ALICE, approved by ${name}.`,
          at: now(),
          actorUserId: ctx.subjectId,
        },
      ]);
      await deps.live.recalc(ctx.organizationId, "alice");
      return { ...claimed, appliedMessage: result.message };
    },

    async discard(identity: SecurityIdentity | null | undefined, id: string): Promise<AliceDraft> {
      const ctx = requireOrgIdentity(identity);
      await assertAllowed(ctx.identity, "update");
      const name = (await deps.displayName?.(ctx.subjectId)) ?? ctx.identity.email ?? null;
      const decided = await deps.drafts.decide(ctx.organizationId, id, {
        status: "discarded",
        decidedBy: ctx.subjectId,
        decidedByName: name,
      });
      if (!decided) {
        const existing = await deps.drafts.findById(ctx.organizationId, id);
        if (!existing) throw new NotFoundError("Draft not found");
        throw new ValidationAppError(`This draft is already ${existing.status}`);
      }
      return decided;
    },
  };
}
