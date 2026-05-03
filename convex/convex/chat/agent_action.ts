"use node";

import { v } from "convex/values";
import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { getAgentForModel } from "./agents";
import { CORE_TIER_WIDGETS } from "@wikipefia/chat/tools";

/**
 * The agent loop. Triggered by:
 *   - createThread (after first user message)
 *   - sendMessage (after each subsequent user message)
 *   - editAndRegenerate (after editing a user message)
 *   - submitToolResponse (after the user answers a Quiz)
 *
 * Streams generation deltas to the database via the agent component's
 * saveStreamDeltas option. The client subscribes via useUIMessages.
 *
 * Closing the tab does NOT abort this action — the action runs to
 * completion (or until cancelGeneration is requested) regardless of
 * client connection state. That's the whole point of running on Convex.
 */
export const runAgent = internalAction({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
  },
  handler: async (ctx, { threadId, promptMessageId }) => {
    const meta = await ctx.runQuery(internal.chat.threads.getMeta, {
      threadId,
    });
    if (!meta) {
      console.warn("runAgent: thread meta missing", threadId);
      return;
    }
    if (meta.deletedAt) return;
    if (meta.cancelRequested) {
      await ctx.runMutation(internal.chat.threads.setStatus, {
        threadId,
        status: "idle",
      });
      return;
    }

    const agent = getAgentForModel(meta.modelId);

    try {
      // Compute the active tools for THIS thread: core tier + previously
      // unlocked widgets + the lookup tool. This bounds tool-schema serialization
      // size (a major token-cost concern with 22+ widget tools).
      const unlocked = await ctx.runQuery(
        internal.chat.threads.getUnlockedWidgets,
        { threadId },
      );
      const activeTools = [
        ...CORE_TIER_WIDGETS,
        ...unlocked.filter(
          (w: string) =>
            !CORE_TIER_WIDGETS.includes(w as (typeof CORE_TIER_WIDGETS)[number]),
        ),
        "lookupWidgetDocs",
      ];

      const result = await agent.streamText(
        ctx,
        { threadId, userId: meta.userId },
        {
          promptMessageId,
          // AI SDK v5/v6: prepareStep is the per-step hook we use to gate tools
          experimental_activeTools: activeTools,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onStepFinish: async () => {
            const cancelled = await ctx.runQuery(
              internal.chat.threads.isCancelRequested,
              { threadId },
            );
            if (cancelled) {
              throw new Error("__CANCELLED__");
            }
          },
        },
        { saveStreamDeltas: { chunking: "word", throttleMs: 250 } },
      );
      await result.consumeStream();

      // Determine final status: pending approval → awaiting_user, else idle.
      const hasPendingApproval = await checkPendingApproval(ctx, threadId);
      await ctx.runMutation(internal.chat.threads.setStatus, {
        threadId,
        status: hasPendingApproval ? "awaiting_user" : "idle",
      });

      // Title generation runs in PARALLEL via the separate `generateTitle`
      // action scheduled from createThread. We don't need to do anything here.
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === "__CANCELLED__") {
        await ctx.runMutation(internal.chat.threads.setStatus, {
          threadId,
          status: "idle",
        });
        return;
      }
      console.error("runAgent error", err);
      await ctx.runMutation(internal.chat.threads.setStatus, {
        threadId,
        status: "error",
      });
    }
  },
});

/**
 * Check if any tool call in the latest assistant message is awaiting approval.
 * The agent component expresses this via tool-approval-request parts in
 * message content; we scan recent messages.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkPendingApproval(ctx: any, threadId: string): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { components } = await import("../_generated/api") as any;
    const result = await ctx.runQuery(components.agent.messages.listMessages, {
      threadId,
      paginationOpts: { numItems: 5, cursor: null },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = (result?.page ?? []) as any[];
    for (const m of items) {
      if (!Array.isArray(m.parts)) continue;
      for (const p of m.parts) {
        if (p?.type === "tool-approval-request") return true;
      }
    }
  } catch (err) {
    console.warn("checkPendingApproval failed", err);
  }
  return false;
}

/**
 * Cheap, fast model used purely for thread-title generation. Hardcoded —
 * the user-facing model picker doesn't affect this. ~$0.15/M input.
 */
const TITLE_MODEL = "openai/gpt-4o-mini";

const titleOpenRouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const TITLE_SYSTEM_PROMPT = `You generate concise thread titles for a tutoring chat.

Rules:
- 4–7 words.
- Match the user's language (Russian, English, or Czech).
- No quotes, no punctuation, no prefix like "Title:" — return ONLY the title text.
- Capture the topic, not the user's tone.

Examples:
User: "объясни мне градиентный спуск как пятилетке"
Title: Градиентный спуск простыми словами

User: "what is mitochondria?"
Title: What is mitochondria

User: "porovnej kvantovou a klasickou mechaniku"
Title: Kvantová vs klasická mechanika`;

/**
 * Generate a thread title based on the user's FIRST message only.
 *
 * Runs IN PARALLEL with `runAgent` — scheduled together at thread creation
 * time. Doesn't wait for the assistant's response, doesn't load thread
 * context, and uses a fixed cheap model so cost is negligible.
 */
export const generateTitle = internalAction({
  args: {
    threadId: v.string(),
    firstUserMessage: v.string(),
  },
  handler: async (ctx, { threadId, firstUserMessage }) => {
    try {
      // Skip if title was already auto-generated (defensive — shouldn't happen
      // because we only schedule this from createThread).
      const meta = await ctx.runQuery(internal.chat.threads.getMeta, {
        threadId,
      });
      if (!meta || meta.titleAutoGenerated) return;

      // Trim very long messages — the model only needs the gist.
      const prompt = firstUserMessage.length > 1500
        ? firstUserMessage.slice(0, 1500) + "…"
        : firstUserMessage;

      const { text } = await generateText({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        model: titleOpenRouter(TITLE_MODEL) as any,
        system: TITLE_SYSTEM_PROMPT,
        prompt,
        // Hard cap so the title model can't burn tokens.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ maxOutputTokens: 40 } as any),
      });

      const title = (text ?? "")
        .trim()
        .replace(/^[\"'`«»]+|[\"'`«»]+$/g, "")
        .replace(/[\.!?;]+$/, "")
        .trim();

      if (title.length > 0 && title.length <= 200) {
        await ctx.runMutation(internal.chat.threads.updateTitle, {
          threadId,
          title,
          auto: true,
        });
      }
    } catch (err) {
      // Title generation is non-critical — log and move on.
      console.warn("generateTitle failed", err);
    }
  },
});
