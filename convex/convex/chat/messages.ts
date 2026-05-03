import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
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

    await ctx.db.patch(meta._id, {
      status: "generating",
      cancelRequested: false,
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.chat.agent_action.runAgent, {
      threadId,
      promptMessageId: messageId,
    });
  },
});

/**
 * Edit a user message and re-run the agent from that point onward.
 *
 * Strategy:
 *   1. Read message metadata (order, threadId) via getMessagesByIds.
 *   2. Patch its content via updateMessage.
 *   3. Delete every later message via deleteByOrder.
 *   4. Schedule the agent.
 */
export const editAndRegenerate = mutation({
  args: {
    userId: v.string(),
    messageId: v.string(),
    newContent: v.string(),
  },
  handler: async (ctx, { userId, messageId, newContent }) => {
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

    // Update the message content
    await ctx.runMutation(components.agent.messages.updateMessage, {
      messageId: idCast,
      patch: {
        message: {
          role: "user",
          content: [{ type: "text", text: newContent }],
        },
      },
    });

    // Delete everything strictly after this message's order
    // (deleteByOrder is exclusive of endOrder upper bound — use a huge number)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const threadIdCast = msg.threadId as any;
    await ctx.runMutation(components.agent.messages.deleteByOrder, {
      threadId: threadIdCast,
      startOrder: msg.order + 1,
      endOrder: Number.MAX_SAFE_INTEGER,
    });

    await ctx.db.patch(meta._id, {
      status: "generating",
      cancelRequested: false,
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.chat.agent_action.runAgent, {
      threadId: msg.threadId,
      promptMessageId: messageId,
    });
  },
});

/**
 * Submit a user response to a tool that was awaiting approval (e.g. Quiz).
 *
 * Saves a tool-approval-response message linked by approvalId, then
 * schedules the agent to continue.
 */
export const submitToolResponse = mutation({
  args: {
    userId: v.string(),
    messageId: v.string(),
    toolCallId: v.string(),
    response: v.any(),
  },
  handler: async (ctx, { userId, messageId, toolCallId, response }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const idCast = messageId as any;
    const fetched = await ctx.runQuery(
      components.agent.messages.getMessagesByIds,
      { messageIds: [idCast] },
    );
    const msg = fetched?.[0] as { threadId: string } | undefined;
    if (!msg) throw new Error("Message not found");

    const meta = await ctx.db
      .query("threadMeta")
      .withIndex("by_thread", (q) => q.eq("threadId", msg.threadId))
      .first();
    if (!meta || meta.userId !== userId) throw new Error("Forbidden");

    // Save a tool-approval-response message that the agent component will
    // pick up on the next step. The approval/answer is encoded as the
    // `output` payload.
    await saveMessage(ctx, components.agent, {
      threadId: msg.threadId,
      userId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      message: {
        role: "tool",
        content: [
          {
            type: "tool-approval-response",
            approvalId: toolCallId,
            approved: true,
            output: response,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ] as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });

    await ctx.db.patch(meta._id, {
      status: "generating",
      cancelRequested: false,
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.chat.agent_action.runAgent, {
      threadId: msg.threadId,
      promptMessageId: messageId,
    });
  },
});
