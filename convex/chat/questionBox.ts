import { v } from "convex/values";
import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Public + internal API for the QuestionBox sub-conversation feature.
 *
 * The streaming heavy-lifting lives in `questionBox_action.ts` (Node runtime
 * for AI SDK + OpenRouter). This file holds the V8-runtime queries +
 * mutations.
 */

// ── Public reactive query ─────────────────────────────────

/**
 * List all Q&A pairs for one QuestionBox, ordered by ord ascending.
 * Returns an empty array when no pairs exist (not an error — the UI
 * uses this to know "user hasn't asked anything yet").
 */
export const listPairs = query({
  args: { userId: v.string(), toolCallId: v.string() },
  handler: async (ctx, { userId, toolCallId }) => {
    const rows = await ctx.db
      .query("questionBoxPairs")
      .withIndex("by_tool_call_ord", (q) => q.eq("toolCallId", toolCallId))
      .collect();
    if (rows.length === 0) return [];
    // Defense in depth: pairs are scoped per-user, refuse cross-user reads.
    if (rows[0].userId !== userId) throw new Error("Forbidden");
    return rows
      .sort((a, b) => a.ord - b.ord)
      .map((r) => ({
        _id: r._id,
        ord: r.ord,
        question: r.question,
        answer: r.answer,
        status: r.status,
        errorMessage: r.errorMessage,
        createdAt: r.createdAt,
      }));
  },
});

// ── Public mutation: submit a follow-up question ─────────

export const askQuestionBox = mutation({
  args: {
    userId: v.string(),
    parentThreadId: v.string(),
    parentMessageId: v.string(),
    toolCallId: v.string(),
    topic: v.string(),
    question: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.question.trim().length === 0) {
      throw new Error("Question must be non-empty");
    }
    // Verify the parent thread belongs to this user.
    const meta = await ctx.db
      .query("threadMeta")
      .withIndex("by_thread", (q) => q.eq("threadId", args.parentThreadId))
      .first();
    if (!meta || meta.userId !== args.userId) throw new Error("Forbidden");

    // Find next ord. Index range query on (toolCallId, ord) descending → first
    // gives the current max.
    const last = await ctx.db
      .query("questionBoxPairs")
      .withIndex("by_tool_call_ord", (q) => q.eq("toolCallId", args.toolCallId))
      .order("desc")
      .first();
    const nextOrd = last ? last.ord + 1 : 0;

    // Refuse to enqueue if a previous pair is still streaming/pending — the
    // UI should disable the "ask" button in that state too, this is just a
    // server-side guardrail against double-submits.
    if (last && (last.status === "streaming" || last.status === "pending")) {
      throw new Error(
        "Previous question is still being answered. Wait for it to finish.",
      );
    }

    const pairId = await ctx.db.insert("questionBoxPairs", {
      parentThreadId: args.parentThreadId,
      parentMessageId: args.parentMessageId,
      toolCallId: args.toolCallId,
      userId: args.userId,
      topic: args.topic,
      ord: nextOrd,
      question: args.question,
      answer: "",
      status: "pending",
      model: meta.modelId,
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(
      0,
      internal.chat.questionBox_action.runAnswer,
      { pairId },
    );
  },
});

// ── Internal helpers used by the action ───────────────────

export const getPairById = internalQuery({
  args: { pairId: v.id("questionBoxPairs") },
  handler: async (ctx, { pairId }) => ctx.db.get(pairId),
});

export const listEarlierPairs = internalQuery({
  args: { toolCallId: v.string(), uptoOrd: v.number() },
  handler: async (ctx, { toolCallId, uptoOrd }) => {
    return await ctx.db
      .query("questionBoxPairs")
      .withIndex("by_tool_call_ord", (q) =>
        q.eq("toolCallId", toolCallId).lt("ord", uptoOrd),
      )
      .collect();
  },
});

/**
 * Internal: every Q&A pair anchored to one QuestionBox, ascending order.
 * Used by the main agent's `contextHandler` to inject the side-channel
 * sub-conversation into the parent thread's view so subsequent turns of
 * the main model can reference what the user asked / what was answered
 * inside any QuestionBox they interacted with.
 */
export const listPairsByToolCall = internalQuery({
  args: { toolCallId: v.string() },
  handler: async (ctx, { toolCallId }) => {
    const rows = await ctx.db
      .query("questionBoxPairs")
      .withIndex("by_tool_call_ord", (q) => q.eq("toolCallId", toolCallId))
      .collect();
    return rows.sort((a, b) => a.ord - b.ord);
  },
});

export const setPairStatus = internalMutation({
  args: {
    pairId: v.id("questionBoxPairs"),
    status: v.union(
      v.literal("pending"),
      v.literal("streaming"),
      v.literal("complete"),
      v.literal("error"),
    ),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, { pairId, status, errorMessage }) => {
    await ctx.db.patch(pairId, {
      status,
      ...(errorMessage !== undefined ? { errorMessage } : {}),
    });
  },
});

export const appendPairAnswer = internalMutation({
  args: { pairId: v.id("questionBoxPairs"), delta: v.string() },
  handler: async (ctx, { pairId, delta }) => {
    const pair = await ctx.db.get(pairId);
    if (!pair) return;
    await ctx.db.patch(pairId, {
      answer: pair.answer + delta,
      // Flip to streaming on first chunk; if status was already "complete"
      // (shouldn't happen) leave it alone.
      ...(pair.status === "pending" ? { status: "streaming" as const } : {}),
    });
  },
});
