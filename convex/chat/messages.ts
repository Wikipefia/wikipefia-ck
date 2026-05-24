import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import { components, internal } from "../_generated/api";
import {
  saveMessage,
  listUIMessages,
  syncStreams,
  vStreamArgs,
} from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { buildUserContent } from "./threads";

/**
 * Helper: delete every message strictly after the given (order, stepOrder)
 * coordinate. The agent component stores user prompts at stepOrder=0 and
 * each assistant generation step at stepOrder=1+ (with the SAME order as
 * the prompting user message). So `(order=N, stepOrder=M+1)` is the right
 * lower bound to drop "the assistant response and everything after it".
 *
 * `deleteByOrder` is paginated (max 64 messages per call). We loop until
 * `isDone`, capped by a generous safety bound.
 */
async function deleteAfter(
  ctx: MutationCtx,
  threadId: string,
  order: number,
  stepOrder: number,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const threadIdCast = threadId as any;
  for (let i = 0; i < 32; i++) {
    const result = (await ctx.runMutation(
      components.agent.messages.deleteByOrder,
      {
        threadId: threadIdCast,
        startOrder: order,
        startStepOrder: stepOrder + 1,
        endOrder: Number.MAX_SAFE_INTEGER,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    )) as { isDone: boolean } | undefined;
    if (result?.isDone ?? true) return;
  }
}

/**
 * Public message queries and mutations.
 *
 * The reactive `listMessages` query is consumed by `useUIMessages` on the
 * client. We delegate to the agent component's listUIMessages helper so we
 * get streamed deltas + paginated history seamlessly merged.
 *
 * Identity: anonymous `userId` from the client (localStorage session id).
 */

// ── Public query: list messages with streaming deltas ───

export const listMessages = query({
  args: {
    threadId: v.string(),
    userId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: v.optional(vStreamArgs),
  },
  handler: async (ctx, args) => {
    const meta = await ctx.db
      .query("threadMeta")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .first();
    if (!meta || meta.userId !== args.userId) throw new Error("Forbidden");

    const messages = await listUIMessages(ctx, components.agent, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
    });

    const streams = await syncStreams(ctx, components.agent, {
      threadId: args.threadId,
      streamArgs: args.streamArgs,
    });

    return { ...messages, streams };
  },
});

// ── Public mutations ──────────────────────────────────────

export const sendMessage = mutation({
  args: {
    userId: v.string(),
    threadId: v.string(),
    prompt: v.string(),
    attachments: v.array(
      v.object({
        storageId: v.string(),
        name: v.string(),
        mimeType: v.string(),
        size: v.number(),
      }),
    ),
  },
  handler: async (ctx, { userId, threadId, prompt, attachments }) => {
    const meta = await ctx.db
      .query("threadMeta")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .first();
    if (!meta || meta.userId !== userId) throw new Error("Forbidden");

    const content = await buildUserContent(ctx, prompt, attachments);
    const { messageId } = await saveMessage(ctx, components.agent, {
      threadId,
      userId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      message: { role: "user", content } as any,
    });

    const generationId = (meta.generationId ?? 0) + 1;
    await ctx.db.patch(meta._id, {
      status: "generating",
      cancelRequested: false,
      generationId,
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.chat.agent_action.runAgent, {
      threadId,
      promptMessageId: messageId,
      generationId,
    });
  },
});

/**
 * Edit a user message and re-run the agent from that point onward.
 *
 * Strategy:
 *   1. Read message metadata (order, threadId) via getMessagesByIds.
 *   2. Build new content (text + attachments) via buildUserContent.
 *   3. Patch its content via updateMessage.
 *   4. Delete every later message via deleteByOrder.
 *   5. Optionally update the thread's modelId (for the next generation).
 *   6. Schedule the agent.
 *
 * Both `attachments` and `modelId` are optional — when omitted the existing
 * attachments / model are preserved (attachments default to the empty list
 * because we always replace the message content; pass the original list
 * through from the client to keep them).
 */
export const editAndRegenerate = mutation({
  args: {
    userId: v.string(),
    messageId: v.string(),
    newContent: v.string(),
    attachments: v.optional(
      v.array(
        v.object({
          storageId: v.string(),
          name: v.string(),
          mimeType: v.string(),
          size: v.number(),
        }),
      ),
    ),
    modelId: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { userId, messageId, newContent, attachments, modelId },
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const idCast = messageId as any;
    const fetched = await ctx.runQuery(
      components.agent.messages.getMessagesByIds,
      { messageIds: [idCast] },
    );
    const msg = fetched?.[0] as
      | {
          threadId: string;
          order: number;
          stepOrder: number;
          message?: { role?: string };
        }
      | undefined;
    if (!msg) throw new Error("Message not found");
    if (msg.message?.role !== "user") {
      throw new Error("Only user messages can be edited");
    }

    const meta = await ctx.db
      .query("threadMeta")
      .withIndex("by_thread", (q) => q.eq("threadId", msg.threadId))
      .first();
    if (!meta || meta.userId !== userId) throw new Error("Forbidden");

    // Update the message content (text + attachments).
    const content = await buildUserContent(ctx, newContent, attachments ?? []);
    await ctx.runMutation(components.agent.messages.updateMessage, {
      messageId: idCast,
      patch: {
        message: {
          role: "user",
          content,
        },
      },
    });

    // Delete the assistant response (same `order`, higher `stepOrder`) plus
    // every subsequent turn. Loops because deleteByOrder is paginated.
    await deleteAfter(ctx, msg.threadId, msg.order, msg.stepOrder);

    const generationId = (meta.generationId ?? 0) + 1;
    await ctx.db.patch(meta._id, {
      ...(modelId && modelId !== meta.modelId ? { modelId } : {}),
      status: "generating",
      cancelRequested: false,
      generationId,
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.chat.agent_action.runAgent, {
      threadId: msg.threadId,
      promptMessageId: messageId,
      generationId,
    });
  },
});

/**
 * Re-run the agent from a given user message WITHOUT modifying it.
 *
 * Strategy mirrors editAndRegenerate, but the user message itself is left
 * untouched — only the assistant response (and any later messages) are
 * deleted before re-running. Useful for "regenerate the answer" actions
 * triggered from either the user message or the assistant message that
 * followed it.
 *
 * `messageId` may refer to either:
 *   - a user message → regenerate the assistant response that followed it
 *   - an assistant message → regenerate this assistant message (deletes it
 *     and re-runs from the previous user message that prompted it)
 */
export const regenerateMessage = mutation({
  args: {
    userId: v.string(),
    messageId: v.string(),
    /** When provided, switches the thread's model before regenerating. */
    modelId: v.optional(v.string()),
  },
  handler: async (ctx, { userId, messageId, modelId }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const idCast = messageId as any;
    const fetched = await ctx.runQuery(
      components.agent.messages.getMessagesByIds,
      { messageIds: [idCast] },
    );
    const msg = fetched?.[0] as
      | {
          threadId: string;
          order: number;
          stepOrder: number;
          message?: { role?: string };
        }
      | undefined;
    if (!msg) throw new Error("Message not found");

    const meta = await ctx.db
      .query("threadMeta")
      .withIndex("by_thread", (q) => q.eq("threadId", msg.threadId))
      .first();
    if (!meta || meta.userId !== userId) throw new Error("Forbidden");

    // ── Determine the user message that drives the next agent run ──
    // The agent stores a user prompt at stepOrder=0 and each assistant
    // generation step at stepOrder=1+ with the SAME `order`. So we always
    // delete starting from (prompt.order, prompt.stepOrder + 1).
    let promptMessageId: string;
    let promptOrder: number;
    let promptStepOrder: number;

    const role = msg.message?.role;
    if (role === "user") {
      promptMessageId = messageId;
      promptOrder = msg.order;
      promptStepOrder = msg.stepOrder;
    } else if (role === "assistant") {
      // Walk back to find the user message that prompted this assistant.
      // The agent guarantees the parent user message has stepOrder=0 at the
      // SAME `order` as the assistant. listMessagesByThreadId with
      // upToAndIncludingMessageId + desc gives us the assistant first, then
      // earlier rows — scan for the first user role hit.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const threadIdCast = msg.threadId as any;
      const recent = (await ctx.runQuery(
        components.agent.messages.listMessagesByThreadId,
        {
          threadId: threadIdCast,
          order: "desc",
          upToAndIncludingMessageId: idCast,
          paginationOpts: { numItems: 50, cursor: null },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      )) as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = (recent?.page ?? []) as any[];
      // Role check alone is enough — assistants never have role: "user".
      const prev = items.find((m) => m?.message?.role === "user") as
        | { _id?: string; order: number; stepOrder: number }
        | undefined;
      if (!prev || !prev._id) {
        throw new Error("No previous user message found to regenerate from");
      }
      promptMessageId = prev._id;
      promptOrder = prev.order;
      promptStepOrder = prev.stepOrder;
    } else {
      throw new Error("Can only regenerate from user or assistant messages");
    }

    // Wipe assistant + every subsequent turn. Loops because deleteByOrder is
    // paginated to 64 rows per call.
    await deleteAfter(ctx, msg.threadId, promptOrder, promptStepOrder);

    const generationId = (meta.generationId ?? 0) + 1;
    await ctx.db.patch(meta._id, {
      ...(modelId && modelId !== meta.modelId ? { modelId } : {}),
      status: "generating",
      cancelRequested: false,
      generationId,
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.chat.agent_action.runAgent, {
      threadId: msg.threadId,
      promptMessageId,
      generationId,
    });
  },
});

/**
 * Submit a user response to a tool that was awaiting approval (e.g. Quiz).
 *
 * The agent component stores tool calls with `needsApproval: true` as a
 * tool-approval-request part with a *separate* `approvalId` (distinct from
 * `toolCallId`). To resume cleanly we must:
 *
 *   1. Save a `tool-approval-response` resolving that approvalId — this
 *      tells the AI SDK the approval is no longer pending so it doesn't
 *      auto-deny the call when re-fetching context.
 *   2. ALSO save a real `tool-result` carrying the user's actual answers
 *      under the `toolCallId`. AI SDK skips its `executeToolCall` when a
 *      tool-result already exists for the call, so the LLM gets the user's
 *      payload directly instead of whatever the tool's stub `execute` would
 *      have returned (the user's answers are NOT propagated through the
 *      approval-response → execute path; AI SDK strips `output` from the
 *      approval-response when serializing for the model).
 *
 * Both parts go in the SAME tool message — `lastMessage` in AI SDK's
 * approval bookkeeping is checked against this single message.
 */
export const submitToolResponse = mutation({
  args: {
    userId: v.string(),
    messageId: v.string(),
    toolCallId: v.string(),
    response: v.any(),
    /**
     * The AI SDK-generated approvalId attached to the paused tool call.
     * When omitted, falls back to `toolCallId` (legacy behavior — the
     * AI SDK will likely auto-deny because the ids don't match).
     */
    approvalId: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { userId, messageId, toolCallId, response, approvalId },
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const idCast = messageId as any;
    const fetched = await ctx.runQuery(
      components.agent.messages.getMessagesByIds,
      { messageIds: [idCast] },
    );
    const msg = fetched?.[0] as
      | {
          threadId: string;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          message?: { role?: string; content?: any };
        }
      | undefined;
    if (!msg) throw new Error("Message not found");

    const meta = await ctx.db
      .query("threadMeta")
      .withIndex("by_thread", (q) => q.eq("threadId", msg.threadId))
      .first();
    if (!meta || meta.userId !== userId) throw new Error("Forbidden");

    // Recover the toolName + the originally-emitted approvalId from the
    // assistant message that contained this tool call.
    //
    // Tool-call parts in saved message content come in TWO shapes
    // depending on AI SDK version / agent SDK version:
    //   1. { type: "tool-call",   toolCallId, toolName: "Quiz", input: ... }
    //   2. { type: "tool-Quiz",   toolCallId, input: ... }      // AI SDK v6 dynamic
    // We accept both — extracting toolName from the type string when the
    // explicit `toolName` field isn't present.
    //
    // Previously we only handled shape (1) and silently fell back to
    // "Quiz" for shape (2) — which broke phase-transition logic for
    // NextTopicButton / PlanTopics / AskUserQuestion submissions because
    // their else-if branches in the phase machinery never matched.
    let toolName = "";
    let resolvedApprovalId = approvalId;
    if (Array.isArray(msg.message?.content)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const part of msg.message!.content as any[]) {
        const t = part?.type;
        const isToolCall =
          t === "tool-call" ||
          (typeof t === "string" &&
            t.startsWith("tool-") &&
            t !== "tool-result" &&
            t !== "tool-approval-request" &&
            t !== "tool-approval-response");
        if (isToolCall && part.toolCallId === toolCallId) {
          if (typeof part.toolName === "string") {
            toolName = part.toolName;
          } else if (typeof t === "string" && t.startsWith("tool-")) {
            // Shape (2): toolName encoded in the type string.
            toolName = t.slice("tool-".length);
          }
        }
        if (
          t === "tool-approval-request" &&
          part.toolCallId === toolCallId &&
          typeof part.approvalId === "string"
        ) {
          resolvedApprovalId = part.approvalId;
        }
      }
    }
    // Last-resort fallback so the call doesn't 500. We default to "Quiz"
    // here for back-compat with thread histories created before this
    // helper handled all paused tools — Quiz was historically the only
    // one. AI SDK will auto-deny if approvalId doesn't match, but at
    // least the tool-result still feeds the LLM.
    if (!toolName) toolName = "Quiz";
    if (!resolvedApprovalId) resolvedApprovalId = toolCallId;

    await saveMessage(ctx, components.agent, {
      threadId: msg.threadId,
      userId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      message: {
        role: "tool",
        content: [
          // (1) Resolve the approval so AI SDK doesn't auto-deny it.
          {
            type: "tool-approval-response",
            approvalId: resolvedApprovalId,
            approved: true,
          },
          // (2) Synthesize a real tool-result with the user's payload. This
          // is what the LLM actually sees on its next step.
          {
            type: "tool-result",
            toolCallId,
            toolName,
            output: {
              type: "json",
              value: response,
            },
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ] as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });

    // Tutor-mode plan-approval transitions:
    //   - PlanTopics with action=start  → flip tutorPhase: review → teaching
    //   - PlanTopics with action=replan → flip tutorPhase: review → input
    //                                     and clear the existing topicPlan so
    //                                     the next runAgent re-emits it
    //                                     fresh (potentially with extra
    //                                     instructions encoded in the
    //                                     response payload).
    //   - NextTopicButton with action=continue → mark current "active" topic
    //                                            as completed and the next
    //                                            "pending" one as active.
    const phasePatch: Record<string, unknown> = {};
    if (toolName === "PlanTopics") {
      const action =
        (response && typeof response === "object" && "action" in response
          ? (response as { action?: unknown }).action
          : undefined);
      if (action === "start") {
        phasePatch.tutorPhase = "teaching";
        // Mark the first topic as active so the system prompt knows
        // where to begin (model also has the conversation history, but
        // explicit state is more reliable).
        const plan = (meta.topicPlan ?? []) as Array<{
          id: string;
          status: "pending" | "active" | "completed" | "skipped";
        } & Record<string, unknown>>;
        if (plan.length > 0) {
          phasePatch.topicPlan = plan.map((t, i) =>
            i === 0 && t.status === "pending"
              ? { ...t, status: "active" as const }
              : t,
          );
        }
      } else if (action === "replan") {
        phasePatch.tutorPhase = "input";
        phasePatch.topicPlan = undefined;
      }
    } else if (toolName === "NextTopicButton") {
      const action =
        response && typeof response === "object" && "action" in response
          ? (response as { action?: unknown }).action
          : undefined;
      if (action === "continue") {
        const plan = (meta.topicPlan ?? []) as Array<{
          id: string;
          status: "pending" | "active" | "completed" | "skipped";
        } & Record<string, unknown>>;
        if (plan.length > 0) {
          // Find the active topic; mark it completed; activate the next
          // pending one. If there's no next pending, the session is done.
          let activatedNext = false;
          let allCompleted = true;
          const updated = plan.map((t) => {
            if (t.status === "active") {
              return { ...t, status: "completed" as const };
            }
            return t;
          });
          for (let i = 0; i < updated.length; i++) {
            if (
              !activatedNext &&
              (updated[i].status === "pending" ||
                updated[i].status === "skipped")
            ) {
              if (updated[i].status === "pending") {
                updated[i] = { ...updated[i], status: "active" };
                activatedNext = true;
                allCompleted = false;
              }
            } else if (updated[i].status === "pending") {
              allCompleted = false;
            }
          }
          phasePatch.topicPlan = updated;
          if (allCompleted && !activatedNext) {
            phasePatch.tutorPhase = "completed";
          }
        }
      }
    }

    const generationId = (meta.generationId ?? 0) + 1;
    await ctx.db.patch(meta._id, {
      status: "generating",
      cancelRequested: false,
      generationId,
      updatedAt: Date.now(),
      ...phasePatch,
    });
    await ctx.scheduler.runAfter(0, internal.chat.agent_action.runAgent, {
      threadId: msg.threadId,
      promptMessageId: messageId,
      generationId,
    });
  },
});
