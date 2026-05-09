"use node";

import { v } from "convex/values";
import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { saveMessage } from "@convex-dev/agent";
import { internalAction } from "../_generated/server";
import { components, internal } from "../_generated/api";
import { getAgentForThread } from "./agents";
import { getMode } from "@wikipefia/chat/modes";

/**
 * Tools that fully satisfy tutor-mode "Phase C" (verify understanding) —
 * each puts the agent into `awaiting_user` because they have
 * `needsApproval: true`. If the model finishes a tutor-mode turn and the
 * last assistant message contains substantial prose but NONE of these,
 * Phase C was skipped (the "promise without payoff" failure mode the
 * system prompt warns about). We auto-retry once with a hidden reminder.
 */
const PAUSING_TOOLS = new Set([
  "AskUserQuestion",
  "Quiz",
  "NextTopicButton",
]);

/**
 * Marker prepended to the synthetic user message we save when retrying a
 * Phase-C-skipped tutor turn. Filtered from the UI in `convex-transport`.
 * Obscure enough that no real user would type it.
 */
export const PHASE_C_RETRY_MARKER = "__WIKIPEFIA_INTERNAL_PHASE_C_RETRY__";

/**
 * The agent loop. Triggered by:
 *   - createThread (after first user message)
 *   - sendMessage (after each subsequent user message)
 *   - editAndRegenerate (after editing a user message)
 *   - regenerateMessage (regenerate without editing)
 *   - submitToolResponse (after the user answers a Quiz)
 *
 * Streams generation deltas to the database via the agent component's
 * saveStreamDeltas option. The client subscribes via useUIMessages.
 *
 * Closing the tab does NOT abort this action — the action runs to
 * completion (or until cancelGeneration is requested) regardless of
 * client connection state. That's the whole point of running on Convex.
 *
 * ── Cancellation ─────────────────────────────────────────────
 * Two mechanisms run concurrently while streaming:
 *
 *   1. `onStepFinish` checks the cancel flag between LLM steps. Catches
 *      cancels at clean tool/step boundaries.
 *   2. A 300ms `setInterval` poll calls `controller.abort()` on the
 *      AbortSignal we hand to streamText, so the underlying provider
 *      stream is interrupted MID-token. Without this, clicking Cancel
 *      while the LLM is still spitting tokens does nothing visible.
 *
 * ── Superseded runs ──────────────────────────────────────────
 * Each run is launched with a `generationId` matching the thread's
 * current `generationId`. If a newer regenerate/send/etc. fires, it
 * bumps the thread's generationId; this run sees the mismatch on its
 * next poll and aborts itself. That stops two parallel runs from both
 * appending steps to the same thread.
 */
export const runAgent = internalAction({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
    /**
     * The thread's `generationId` at the time this run was scheduled.
     * If the thread's current generationId no longer matches, this run
     * has been superseded and aborts. Optional for back-compat with any
     * already-scheduled jobs from before this field existed.
     */
    generationId: v.optional(v.number()),
    /**
     * True when this is a Phase-C-recovery retry triggered by our
     * post-stream check (tutor mode only). Prevents infinite retry loops:
     * the recovery itself never recovers again, even if it also skips.
     * The reminder user message saved before this run carries the
     * PHASE_C_RETRY_MARKER prefix so the UI hides it.
     */
    isPhaseCRetry: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { threadId, promptMessageId, generationId, isPhaseCRetry },
  ) => {
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
    // If we were already superseded before we even started, bail without
    // touching status — the newer run owns the thread now.
    if (
      generationId !== undefined &&
      meta.generationId !== undefined &&
      meta.generationId !== generationId
    ) {
      return;
    }

    const agent = getAgentForThread(meta);
    const mode = getMode(meta.mode);
    const abortController = new AbortController();

    // Defensive cleanup: if a previous run was superseded by us and managed
    // to finalize a partial assistant message between then and now, wipe it.
    // We're guaranteed to be the current generation here (checked above), so
    // any messages strictly after the prompt user msg are stragglers.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const idCast = promptMessageId as any;
      const promptFetch = (await ctx.runQuery(
        components.agent.messages.getMessagesByIds,
        { messageIds: [idCast] },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      )) as any[] | undefined;
      const promptMsg = promptFetch?.[0] as
        | {
            threadId: string;
            order: number;
            stepOrder: number;
            message?: { role?: string };
          }
        | undefined;
      if (promptMsg && promptMsg.message?.role === "user") {
        for (let i = 0; i < 8; i++) {
          const result = (await ctx.runMutation(
            components.agent.messages.deleteByOrder,
            {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              threadId: promptMsg.threadId as any,
              startOrder: promptMsg.order,
              startStepOrder: promptMsg.stepOrder + 1,
              endOrder: Number.MAX_SAFE_INTEGER,
            },
          )) as { isDone: boolean } | undefined;
          if (result?.isDone ?? true) break;
        }
      }
    } catch (err) {
      // Non-fatal — worst case, a stale partial assistant remains visible.
      console.warn("runAgent defensive cleanup failed", err);
    }

    // 300ms cancel poll. Fires controller.abort() the moment cancelRequested
    // flips OR a newer generation supersedes us OR the thread is deleted.
    let aborted = false;
    const cancelPoll = setInterval(() => {
      void (async () => {
        try {
          const state = await ctx.runQuery(
            internal.chat.threads.getRunStateForPolling,
            { threadId },
          );
          if (!state) {
            aborted = true;
            abortController.abort();
            return;
          }
          if (state.deletedAt) {
            aborted = true;
            abortController.abort();
            return;
          }
          if (state.cancelRequested) {
            aborted = true;
            abortController.abort();
            return;
          }
          if (
            generationId !== undefined &&
            state.generationId !== undefined &&
            state.generationId !== generationId
          ) {
            aborted = true;
            abortController.abort();
            return;
          }
        } catch {
          // network blip — we'll catch the cancel on the next tick
        }
      })();
    }, 300);

    try {
      // ── Dynamic activeTools per step ──────────────────────
      // Architecture: the model sees ALL widgets in the system prompt, but
      // only `lookupWidgetDocs` is callable upfront. Calling lookupWidgetDocs
      // for a widget unlocks it (DB write); the NEXT step's `prepareStep`
      // re-reads `unlockedWidgets` and adds the new widget to activeTools.
      //
      // Without prepareStep, AI SDK's experimental_activeTools is fixed for
      // the entire streamText call — meaning the lookup tool would unlock
      // widgets in DB but never make them callable within the same response.
      // That manifested as "lookupWidgetDocs sometimes does nothing".
      //
      // We also keep an in-memory `unlockedSet` mirror so the unlock from a
      // mid-stream tool execute is reflected immediately on the next step,
      // even before the DB read on the polling tick (race-free).
      const unlockedSet = new Set<string>(
        (await ctx.runQuery(internal.chat.threads.getUnlockedWidgets, {
          threadId,
        })) as string[],
      );

      const result = await agent.streamText(
        ctx,
        { threadId, userId: meta.userId },
        {
          promptMessageId,
          // Mid-stream abort: AI SDK passes this through to the provider's
          // fetch, so cancellation works even mid-token.
          abortSignal: abortController.signal,
          // Per-step hook: AI SDK calls this BEFORE every LLM call. We
          // recompute activeTools so freshly-unlocked widgets become
          // available in the very next step.
          //
          // NOTE: AI SDK v6's PrepareStepResult uses `activeTools` (the
          // non-experimental name). Using `experimental_activeTools` here
          // would be silently ignored.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          prepareStep: async () => {
            const fresh = (await ctx.runQuery(
              internal.chat.threads.getUnlockedWidgets,
              { threadId },
            )) as string[];
            for (const w of fresh) unlockedSet.add(w);

            // Apply the thread-mode's tool policy. Three modes:
            //
            //   - "default" — original behavior. Always-active baseline is
            //     `lookupWidgetDocs` + `QuestionBox` + every widget the
            //     model has unlocked via `lookupWidgetDocs` so far. The
            //     model can dynamically grow its toolkit during the
            //     conversation.
            //
            //   - "include" — STRICT whitelist. ONLY the listed tools +
            //     `lookupWidgetDocs` are active. We deliberately drop
            //     `QuestionBox` and any widgets the model unlocked via
            //     `lookupWidgetDocs` — modes like tutor want a focused
            //     toolkit and shouldn't accidentally expose tools (e.g.
            //     `Quiz` when tutor uses `AskUserQuestion` instead) just
            //     because the model called `lookupWidgetDocs` on them.
            //     If a mode wants QuestionBox/lookup-unlocking, it must
            //     list them explicitly in `allowedTools.tools`.
            //
            //   - "exclude" — start from the default-mode baseline and
            //     drop the listed tools.
            let activeTools: string[];
            if (mode.allowedTools.kind === "include") {
              // Strict whitelist. lookupWidgetDocs is kept so the model
              // can still read full schemas/examples for the listed
              // tools, but the unlock-via-lookup mechanism is bypassed.
              activeTools = Array.from(
                new Set(["lookupWidgetDocs", ...mode.allowedTools.tools]),
              );
            } else if (mode.allowedTools.kind === "exclude") {
              const baseActive = [
                "lookupWidgetDocs",
                "QuestionBox",
                ...Array.from(unlockedSet),
              ];
              const excluded = new Set(mode.allowedTools.tools);
              activeTools = baseActive.filter((t) => !excluded.has(t));
            } else {
              activeTools = [
                "lookupWidgetDocs",
                "QuestionBox",
                ...Array.from(unlockedSet),
              ];
            }
            return { activeTools };
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onStepFinish: async () => {
            const state = await ctx.runQuery(
              internal.chat.threads.getRunStateForPolling,
              { threadId },
            );
            if (!state) {
              throw new Error("__CANCELLED__");
            }
            if (state.cancelRequested) {
              throw new Error("__CANCELLED__");
            }
            if (
              generationId !== undefined &&
              state.generationId !== undefined &&
              state.generationId !== generationId
            ) {
              throw new Error("__SUPERSEDED__");
            }
          },
        },
        { saveStreamDeltas: { chunking: "word", throttleMs: 250 } },
      );
      await result.consumeStream();

      // Aborted via the polling loop — treat the same as a step-level cancel.
      if (aborted) {
        const state = await ctx.runQuery(
          internal.chat.threads.getRunStateForPolling,
          { threadId },
        );
        // Only flip to idle if we're still the current generation. Otherwise
        // a newer run owns the status and we leave it alone.
        if (
          state &&
          (generationId === undefined ||
            state.generationId === undefined ||
            state.generationId === generationId)
        ) {
          await ctx.runMutation(internal.chat.threads.setStatus, {
            threadId,
            status: "idle",
          });
        }
        return;
      }

      // Determine final status: pending approval → awaiting_user, else idle.
      const hasPendingApproval = await checkPendingApproval(ctx, threadId);

      // ── Tutor-mode Phase-C recovery ──────────────────────
      // If we just finished a tutor-mode turn, the model wrote substantial
      // prose, and there's NO pausing tool call (Quiz/AskUserQuestion/
      // NextTopicButton) — the system prompt's contract was violated. The
      // model wrote something like "Проверим, что ты усвоил" and stopped
      // without actually emitting the question tool. This is the
      // "promise without payoff" failure mode.
      //
      // We schedule ONE retry that injects a hidden user-role reminder and
      // reruns the agent. `isPhaseCRetry` flag prevents infinite loops —
      // the retry itself never re-recovers.
      if (
        !hasPendingApproval &&
        !isPhaseCRetry &&
        mode.id === "tutor" &&
        (await detectPhaseCSkip(ctx, threadId))
      ) {
        // Status stays "generating" — the retry's runAgent will manage it.
        await scheduleTutorPhaseCRetry(
          ctx,
          threadId,
          meta.userId,
          generationId,
        );
        return;
      }

      await ctx.runMutation(internal.chat.threads.setStatus, {
        threadId,
        status: hasPendingApproval ? "awaiting_user" : "idle",
      });

      // Title generation runs in PARALLEL via the separate `generateTitle`
      // action scheduled from createThread. We don't need to do anything here.
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isAbort =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err as any)?.name === "AbortError" ||
        message.includes("aborted") ||
        message === "__CANCELLED__" ||
        message === "__SUPERSEDED__";
      if (isAbort) {
        // For supersede, leave status to the newer run. For a normal cancel,
        // flip to idle.
        if (message !== "__SUPERSEDED__") {
          const state = await ctx.runQuery(
            internal.chat.threads.getRunStateForPolling,
            { threadId },
          );
          if (
            state &&
            (generationId === undefined ||
              state.generationId === undefined ||
              state.generationId === generationId)
          ) {
            await ctx.runMutation(internal.chat.threads.setStatus, {
              threadId,
              status: "idle",
            });
          }
        }
        return;
      }
      console.error("runAgent error", err);
      await ctx.runMutation(internal.chat.threads.setStatus, {
        threadId,
        status: "error",
      });
    } finally {
      clearInterval(cancelPoll);
    }
  },
});

/**
 * Tutor-mode Phase-C-skip detector.
 *
 * Looks at the most recent assistant message. Returns true iff:
 *   - the message has substantial prose content (>= 60 chars of text), AND
 *   - it contains ZERO tool calls from PAUSING_TOOLS.
 *
 * Note: we don't worry about QuestionBox here — it doesn't pause and
 * doesn't satisfy Phase C either way. A tutor-mode message with ONLY a
 * QuestionBox and prose still counts as "skipped".
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function detectPhaseCSkip(ctx: any, threadId: string): Promise<boolean> {
  try {
    const result = await ctx.runQuery(
      components.agent.messages.listMessagesByThreadId,
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        threadId: threadId as any,
        order: "desc",
        paginationOpts: { numItems: 5, cursor: null },
      },
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = (result?.page ?? []) as any[];
    // Find the most recent assistant message.
    const lastAssistant = items.find(
      (m) => (m.message?.role ?? m.role) === "assistant",
    );
    if (!lastAssistant) return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content: any[] = Array.isArray(lastAssistant.message?.content)
      ? lastAssistant.message.content
      : Array.isArray(lastAssistant.parts)
        ? lastAssistant.parts
        : [];
    let textLen = 0;
    let hasPausingTool = false;
    for (const part of content) {
      const t = part?.type;
      if (t === "text" && typeof part.text === "string") {
        textLen += part.text.length;
      } else if (
        // tool-call shapes vary by SDK version; we accept any of these.
        (t === "tool-call" ||
          (typeof t === "string" && t.startsWith("tool-") && t !== "tool-result")) &&
        typeof part.toolName === "string" &&
        PAUSING_TOOLS.has(part.toolName)
      ) {
        hasPausingTool = true;
      }
    }
    if (hasPausingTool) return false;
    // Threshold: too-short messages probably aren't Phase B explanations
    // (could be a clarifying question, a cancellation echo, etc.). 60 chars
    // is roughly "one sentence" — anything substantive triggers recovery.
    return textLen >= 60;
  } catch (err) {
    console.warn("detectPhaseCSkip failed", err);
    return false;
  }
}

/**
 * Save a hidden user-role reminder + schedule another runAgent that's
 * flagged as a Phase-C retry. The reminder text starts with
 * `PHASE_C_RETRY_MARKER` so the UI filters it out (see convex-transport).
 *
 * The model receives a short, surgical instruction: emit ONE
 * AskUserQuestion, no prose. This compensates for the "promise without
 * payoff" failure mode where the model writes "Проверим, что ты усвоил"
 * and stops without the tool call.
 */
async function scheduleTutorPhaseCRetry(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  threadId: string,
  userId: string,
  generationId: number | undefined,
): Promise<void> {
  const reminderText =
    `${PHASE_C_RETRY_MARKER}\n\n` +
    `СИСТЕМНОЕ НАПОМИНАНИЕ (Phase-C-retry, авто-инжект):\n\n` +
    `В предыдущем своём ответе ты НАПИСАЛ прозу про проверку понимания ` +
    `(например, "Проверим, что ты усвоил") но НЕ ВЫЗВАЛ tool ` +
    `\`AskUserQuestion\`. Это и есть failure mode "promise without ` +
    `payoff", про который тебя предупреждал system prompt — пользователь ` +
    `увидел обещание квиза без квиза.\n\n` +
    `СЕЙЧАС: вызови ровно ОДИН \`AskUserQuestion\` с 1–3 вопросами по ` +
    `ТОЛЬКО ЧТО объяснённому чанку. Никакой прозы — только tool-call. ` +
    `Если ты уже использовал тип \`free_text\`, теперь подойдёт ` +
    `\`multiple_choice\` (и наоборот) — для разнообразия проверки.\n\n` +
    `Это сообщение является внутренним напоминанием системы, не от ` +
    `пользователя. Не извиняйся, не комментируй — просто эмить tool.`;
  const { messageId } = await saveMessage(ctx, components.agent, {
    threadId,
    userId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    message: {
      role: "user",
      content: [{ type: "text", text: reminderText }],
    } as any,
  });
  // Reuse the same generationId — this is a continuation of the same
  // logical run, not a new user-initiated turn. (If the user clicks
  // regenerate / sends a new message before recovery completes, the
  // generationId will bump and supersede this retry naturally.)
  //
  // Delay recovery by ~250ms (matches saveStreamDeltas throttle window)
  // so the previous stream's last delta-flush + message finalization
  // settle before the new streamText begins. Without this, useUIMessages
  // can briefly return BOTH the prior orphaned stream entry AND the new
  // pending stub, each rendering its own TypingIndicator.
  await ctx.scheduler.runAfter(
    250,
    internal.chat.agent_action.runAgent,
    {
      threadId,
      promptMessageId: messageId,
      generationId,
      isPhaseCRetry: true,
    },
  );
}

/**
 * Check if any tool call in the latest assistant message is awaiting approval.
 * The agent component expresses this via tool-approval-request parts in
 * message content; we scan recent messages.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkPendingApproval(ctx: any, threadId: string): Promise<boolean> {
  try {
    const result = await ctx.runQuery(
      components.agent.messages.listMessagesByThreadId,
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        threadId: threadId as any,
        order: "desc",
        paginationOpts: { numItems: 5, cursor: null },
      },
    );
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
