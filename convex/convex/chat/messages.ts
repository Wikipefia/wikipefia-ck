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
    // assistant message that contained this tool call. We need the toolName
    // for the synthesized tool-result and we PREFER the message's stored
    // approvalId over whatever the client passed (defense in depth).
    let toolName = "Quiz";
    let resolvedApprovalId = approvalId;
    if (Array.isArray(msg.message?.content)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const part of msg.message!.content as any[]) {
        if (part?.type === "tool-call" && part.toolCallId === toolCallId) {
          if (typeof part.toolName === "string") toolName = part.toolName;
        }
        if (
          part?.type === "tool-approval-request" &&
          part.toolCallId === toolCallId &&
          typeof part.approvalId === "string"
        ) {
          resolvedApprovalId = part.approvalId;
        }
      }
    }
    // Last-resort fallback so the call doesn't 500. AI SDK will auto-deny in
    // this branch, but at least the tool-result still feeds the LLM.
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

    const generationId = (meta.generationId ?? 0) + 1;
    await ctx.db.patch(meta._id, {
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
