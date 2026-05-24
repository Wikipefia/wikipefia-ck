"use node";

import { v } from "convex/values";
import { streamText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { internalAction } from "../_generated/server";
import { components, internal } from "../_generated/api";

/**
 * Streaming answerer for QuestionBox sub-conversations.
 *
 * Triggered by `askQuestionBox` mutation (one schedule per submitted
 * question). Reads the pair, builds a custom-shaped context, calls AI SDK's
 * `streamText` directly (no agent component — we don't want tools or
 * thread side-effects here), and patches the pair's `answer` field with
 * the streamed text deltas.
 *
 * Throttling: we batch deltas in-memory and flush to Convex every ~250ms.
 * Each flush is a `ctx.runMutation(appendPairAnswer)` which appends to the
 * doc. Convex's reactive query then pushes the update to subscribed UIs.
 *
 * Context shape (what the model sees on `messages`):
 *   1. All parent-thread messages strictly before `parentMessageId`.
 *   2. The parent assistant message itself, with content TRUNCATED at the
 *      QuestionBox tool-call (everything after the box is dropped).
 *   3. Every earlier Q&A pair from the same QuestionBox, expanded as
 *      alternating user → assistant → user → assistant turns.
 *   4. The user's current question as a final user message.
 *
 * Plus a custom system message scoped to the QuestionBox topic.
 */

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const QUESTION_BOX_SYSTEM = `You are answering a follow-up question that the user asked from a QuestionBox you previously placed inline in your last response.

The QuestionBox is anchored to this subtopic: "{TOPIC}".

The user has read your previous response. Stay tightly on this subtopic — this is a focused side-conversation, NOT a re-explanation of the broader thread.

Rules:
- Match the user's language (Russian, English, or Czech). Default to the language of the user's question.
- Be CONCISE. 1–4 short paragraphs is usually enough; only go longer if the user explicitly asks for depth.
- Use plain markdown: bold, italic, lists, fenced code, math (\`$inline$\` and \`$$block$$\`).
- Do NOT call any tools. This sub-conversation is plain prose — no widgets, no quizzes, no QuestionBoxes.
- Do NOT restate the broader explanation from your previous turn. Drill into the specific subtopic, building on what the user already saw.
- If the question is off-topic for this QuestionBox, say so briefly and suggest the user ask in the main chat instead.
- NEVER fabricate facts. If unsure, say so explicitly.`;

const FLUSH_INTERVAL_MS = 250;

/**
 * Trim a content array down to the parts BEFORE the QuestionBox tool-call,
 * filtering out parts the AI SDK shouldn't (or can't) re-ingest as input.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function truncateAndSanitize(content: any[], questionBoxToolCallId: string): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any[] = [];
  for (const part of content) {
    if (
      part?.type === "tool-call" &&
      part.toolCallId === questionBoxToolCallId
    ) {
      // Reached our QuestionBox itself — stop here.
      break;
    }
    if (
      part?.type === "tool-approval-request" ||
      part?.type === "tool-approval-response" ||
      part?.type === "reasoning" ||
      part?.type === "redacted-reasoning"
    ) {
      continue;
    }
    out.push(part);
  }
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeContent(content: any): any {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return content;
  return content.filter(
    (p) =>
      p?.type !== "tool-approval-request" &&
      p?.type !== "tool-approval-response" &&
      p?.type !== "reasoning" &&
      p?.type !== "redacted-reasoning",
  );
}

export const runAnswer = internalAction({
  args: { pairId: v.id("questionBoxPairs") },
  handler: async (ctx, { pairId }) => {
    const pair = await ctx.runQuery(internal.chat.questionBox.getPairById, {
      pairId,
    });
    if (!pair) {
      console.warn("runAnswer: pair missing", pairId);
      return;
    }

    // ── Build context ────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parentList = (await ctx.runQuery(
      components.agent.messages.listMessagesByThreadId,
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        threadId: pair.parentThreadId as any,
        order: "asc",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        upToAndIncludingMessageId: pair.parentMessageId as any,
        paginationOpts: { numItems: 500, cursor: null },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    )) as any;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = (parentList?.page ?? []) as any[];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [];
    for (const m of items) {
      if (!m?.message) continue;
      if (m._id === pair.parentMessageId && Array.isArray(m.message.content)) {
        const pre = truncateAndSanitize(m.message.content, pair.toolCallId);
        if (pre.length > 0) {
          messages.push({ role: m.message.role, content: pre });
        }
        // Don't push parts after the QuestionBox.
        continue;
      }
      messages.push({
        role: m.message.role,
        content: sanitizeContent(m.message.content),
      });
    }

    // Append earlier Q&A pairs in this same QuestionBox as alternating turns.
    const earlier = await ctx.runQuery(
      internal.chat.questionBox.listEarlierPairs,
      { toolCallId: pair.toolCallId, uptoOrd: pair.ord },
    );
    earlier.sort((a, b) => a.ord - b.ord);
    for (const ep of earlier) {
      messages.push({ role: "user", content: ep.question });
      if (ep.answer) {
        messages.push({ role: "assistant", content: ep.answer });
      }
    }

    // Final user turn = the question we're about to answer.
    messages.push({ role: "user", content: pair.question });

    // ── Pick model ───────────────────────────────────────
    const meta = await ctx.runQuery(internal.chat.threads.getMeta, {
      threadId: pair.parentThreadId,
    });
    const modelId =
      pair.model ?? meta?.modelId ?? "anthropic/claude-sonnet-4.5";

    // ── Stream ───────────────────────────────────────────
    await ctx.runMutation(internal.chat.questionBox.setPairStatus, {
      pairId,
      status: "streaming",
    });

    let buffer = "";
    let lastFlush = Date.now();
    const flush = async (force: boolean) => {
      if (buffer.length === 0) return;
      if (!force && Date.now() - lastFlush < FLUSH_INTERVAL_MS) return;
      const delta = buffer;
      buffer = "";
      lastFlush = Date.now();
      await ctx.runMutation(internal.chat.questionBox.appendPairAnswer, {
        pairId,
        delta,
      });
    };

    try {
      const result = streamText({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        model: openrouter(modelId) as any,
        system: QUESTION_BOX_SYSTEM.replace("{TOPIC}", pair.topic),
        messages,
      });

      for await (const chunk of result.textStream) {
        buffer += chunk;
        await flush(false);
      }
      await flush(true);

      await ctx.runMutation(internal.chat.questionBox.setPairStatus, {
        pairId,
        status: "complete",
      });
    } catch (err) {
      // Flush whatever we managed to collect before the error so the user
      // can at least see partial output.
      try {
        await flush(true);
      } catch {
        /* ignore */
      }
      const message = err instanceof Error ? err.message : String(err);
      console.error("QuestionBox runAnswer error", err);
      await ctx.runMutation(internal.chat.questionBox.setPairStatus, {
        pairId,
        status: "error",
        errorMessage: message,
      });
    }
  },
});
