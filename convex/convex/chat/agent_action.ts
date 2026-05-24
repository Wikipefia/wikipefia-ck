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
 *
 * `PlanTopics` is also a pausing tool — when the model emits it, the
 * thread enters Phase 0 review and waits for the user. The detector
 * uses `hasPendingApproval` (which sees the approval-request part) for
 * the planning case; PlanTopics doesn't need to be in this set, but
 * including it is harmless (defense in depth).
 */
const PAUSING_TOOLS = new Set([
  "AskUserQuestion",
  "Quiz",
  "NextTopicButton",
  "PlanTopics",
]);

/**
 * Marker prepended to the synthetic user message we save when retrying a
 * Phase-C-skipped tutor turn. Filtered from the UI in `convex-transport`.
 * Obscure enough that no real user would type it.
 */
export const PHASE_C_RETRY_MARKER = "__WIKIPEFIA_INTERNAL_PHASE_C_RETRY__";

/** Marker for the coverage-check retry (different cause, same UI hide). */
export const COVERAGE_RETRY_MARKER = "__WIKIPEFIA_INTERNAL_COVERAGE_RETRY__";

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
    /**
     * True when this is a coverage-recovery retry — model emitted
     * NextTopicButton but our LLM coverage check found gaps. The retry
     * disables further coverage checks (one shot per turn).
     */
    isCoverageRetry: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    {
      threadId,
      promptMessageId,
      generationId,
      isPhaseCRetry,
      isCoverageRetry,
    },
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

      // ── Tutor-mode plan extraction ───────────────────────
      // When the model emits `PlanTopics` (Phase 0), the tool's args
      // contain the topic list — but `execute` only runs after user
      // approval, by which time the user may have edited the plan. So
      // we extract the args from the tool-call part itself, BEFORE
      // approval, and persist them to `threadMeta.topicPlan` so the
      // side panel can show them immediately.
      if (mode.id === "tutor") {
        await extractAndSaveTopicPlan(ctx, threadId);
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
        (await detectPhaseCSkip(ctx, threadId, meta.tutorPhase))
      ) {
        // Status stays "generating" — the retry's runAgent will manage it.
        await scheduleTutorPhaseCRetry(
          ctx,
          threadId,
          meta.userId,
          generationId,
          meta.tutorPhase,
        );
        return;
      }

      // ── Tutor-mode coverage check ─────────────────────────
      // When the model emits NextTopicButton (signaling "topic done, move
      // on"), we run a cheap LLM check to verify the topic was actually
      // covered according to its `prompt`. If the check fails, we save a
      // hidden reminder and schedule a retry — the model writes more about
      // the current topic and (eventually) emits a fresh NextTopicButton.
      //
      // Limited to the first attempt (`!isCoverageRetry`) so a stubborn
      // model can't trap the user in an infinite "you're not done yet"
      // loop. Skipped during PlanTopics review (no active topic yet) and
      // during the planning phase.
      if (
        hasPendingApproval &&
        !isPhaseCRetry &&
        !isCoverageRetry &&
        mode.id === "tutor" &&
        (meta.tutorPhase === "teaching")
      ) {
        const coverageRetry = await maybeScheduleCoverageRetry(
          ctx,
          threadId,
          meta,
          generationId,
        );
        if (coverageRetry) {
          // Don't flip status — recovery owns it.
          return;
        }
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
 * Cheap LLM call: given the active topic's `prompt` and the assistant's
 * recent prose, determine whether the topic has been adequately covered.
 *
 * Returns `{ covered: true }` on YES, `{ covered: false, reason }` on NO,
 * and `{ covered: true }` on any error (we err on the side of letting
 * the user move on rather than getting stuck in retry hell).
 */
const COVERAGE_MODEL = "openai/gpt-4o-mini";
const COVERAGE_SYSTEM_PROMPT = `You are a teaching-quality auditor. Given a tutor topic's prompt (instructions for what to cover) and the tutor's recent explanation, decide whether the topic has been adequately covered.

OUTPUT FORMAT (strict):
Line 1: exactly "YES" or "NO".
Lines 2+: brief one-sentence justification. If NO, list the missing aspects, comma-separated.

Rules:
- "Adequately covered" = the explanation addresses every key concept the topic prompt asked for. Examples may be optional, but core concepts cannot be skipped.
- Be generous with paraphrases. The tutor doesn't have to use the exact wording from the prompt.
- If the explanation just defines a term without examples but the prompt didn't demand examples — that's still YES.
- Be strict if entire core concepts from the prompt are missing.

Examples:
TOPIC PROMPT: "Explain what a derivative is, give the formal definition with limit, and one geometric interpretation."
EXPLANATION: "A derivative is the rate of change. Formally, f'(x) = lim h→0 (f(x+h) − f(x))/h. Geometrically, it's the slope of the tangent line at a point."
ANSWER:
YES
All three asked aspects present.

TOPIC PROMPT: "Define random variable, distinguish discrete vs continuous, give two examples of each."
EXPLANATION: "A random variable is a variable whose value depends on a random experiment."
ANSWER:
NO
Missing: discrete vs continuous distinction, examples for each kind.`;

interface CoverageResult {
  covered: boolean;
  reason?: string;
}

async function runCoverageCheck(
  topicPrompt: string,
  assistantContent: string,
): Promise<CoverageResult> {
  if (assistantContent.trim().length < 100) {
    // Too little content to even bother — clearly under-covered. The
    // existing Phase-C-retry typically catches this, but defense in
    // depth.
    return { covered: false, reason: "Объяснение слишком короткое." };
  }
  try {
    const { text } = await generateText({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: titleOpenRouter(COVERAGE_MODEL) as any,
      system: COVERAGE_SYSTEM_PROMPT,
      prompt: [
        "TOPIC PROMPT:",
        topicPrompt.slice(0, 2000),
        "",
        "EXPLANATION:",
        assistantContent.slice(0, 4000),
        "",
        "ANSWER:",
      ].join("\n"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...({ maxOutputTokens: 200 } as any),
    });
    const lines = (text ?? "").trim().split("\n");
    const verdict = (lines[0] ?? "").trim().toUpperCase();
    if (verdict.startsWith("YES")) {
      return { covered: true };
    }
    if (verdict.startsWith("NO")) {
      const reason = lines.slice(1).join(" ").trim();
      return { covered: false, reason: reason || "Тема покрыта неполностью." };
    }
    // Ambiguous response → treat as covered (don't trap user).
    return { covered: true };
  } catch (err) {
    console.warn("runCoverageCheck failed", err);
    return { covered: true };
  }
}

/**
 * After a tutor-mode turn that ended with a NextTopicButton emission,
 * verify that the active topic was actually covered. Returns true when a
 * recovery was scheduled (caller should NOT flip thread status), false
 * when no retry was needed (normal awaiting_user flow proceeds).
 */
async function maybeScheduleCoverageRetry(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  threadId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta: any,
  generationId: number | undefined,
): Promise<boolean> {
  // Only fires when the active topic exists AND the model just emitted
  // NextTopicButton (the case we want to gate).
  const plan = (meta?.topicPlan ?? []) as Array<{
    id: string;
    title: string;
    prompt: string;
    status: "pending" | "active" | "completed" | "skipped";
  }>;
  const active = plan.find((t) => t.status === "active");
  if (!active) return false;

  // Find the latest assistant message — does it contain NextTopicButton?
  // If not, this isn't the case we care about.
  const recent = await ctx.runQuery(
    components.agent.messages.listMessagesByThreadId,
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      threadId: threadId as any,
      order: "desc",
      paginationOpts: { numItems: 5, cursor: null },
    },
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (recent?.page ?? []) as any[];
  const latestAssistant = items.find(
    (m) => (m.message?.role ?? m.role) === "assistant",
  );
  if (!latestAssistant) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const latestContent: any[] = Array.isArray(latestAssistant.message?.content)
    ? latestAssistant.message.content
    : Array.isArray(latestAssistant.parts)
      ? latestAssistant.parts
      : [];
  const hasNextTopic = latestContent.some((p) => {
    const t = p?.type;
    const isCall =
      t === "tool-call" ||
      (typeof t === "string" && t.startsWith("tool-") && t !== "tool-result");
    return isCall && p.toolName === "NextTopicButton";
  });
  if (!hasNextTopic) return false;

  // Aggregate all assistant text since this topic became active. We walk
  // backwards from the most recent message, collecting prose, and stop
  // when we hit either: (a) the previous NextTopicButton (= start of
  // this topic), or (b) the PlanTopics tool message (= start of the
  // session).
  const collected: string[] = [];
  for (const m of items) {
    if ((m.message?.role ?? m.role) !== "assistant") continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content: any[] = Array.isArray(m.message?.content)
      ? m.message.content
      : Array.isArray(m.parts)
        ? m.parts
        : [];
    let stop = false;
    for (const p of content) {
      if (p?.type === "text" && typeof p.text === "string") {
        collected.unshift(p.text);
      }
      const t = p?.type;
      const isCall =
        t === "tool-call" ||
        (typeof t === "string" && t.startsWith("tool-") && t !== "tool-result");
      if (
        isCall &&
        m._creationTime !== latestAssistant._creationTime &&
        (p.toolName === "NextTopicButton" || p.toolName === "PlanTopics")
      ) {
        stop = true;
        break;
      }
    }
    if (stop) break;
  }
  const assistantContent = collected.join("\n\n");

  const result = await runCoverageCheck(active.prompt, assistantContent);
  if (result.covered) return false;

  // Coverage failed — save a hidden reminder + schedule recovery.
  const reminder =
    `${COVERAGE_RETRY_MARKER}\n\n` +
    `СИСТЕМНОЕ НАПОМИНАНИЕ (coverage-retry, авто-инжект):\n\n` +
    `Coverage check определил, что тема "${active.title}" покрыта неполностью.\n\n` +
    `Пропущенные аспекты или замечания:\n${result.reason ?? "—"}\n\n` +
    `СЕЙЧАС: продолжи объяснять ТЕКУЩУЮ тему — НЕ переходи на следующую. ` +
    `Покрой пропущенные аспекты прозой, потом задай НОВЫЙ AskUserQuestion ` +
    `по этим пропущенным аспектам, и ТОЛЬКО ПОТОМ снова эмить ` +
    `NextTopicButton. Не извиняйся, не комментируй это сообщение — ` +
    `просто продолжай.`;
  const { messageId } = await saveMessage(ctx, components.agent, {
    threadId,
    userId: meta.userId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    message: {
      role: "user",
      content: [{ type: "text", text: reminder }],
    } as any,
  });
  await ctx.scheduler.runAfter(
    250,
    internal.chat.agent_action.runAgent,
    {
      threadId,
      promptMessageId: messageId,
      generationId,
      isCoverageRetry: true,
    },
  );
  return true;
}

/**
 * Tutor-mode plan extractor.
 *
 * Scans the most recent assistant message for a PlanTopics tool-call
 * part. If found AND the thread hasn't already saved a plan (or is in
 * "input"/undefined phase), persists the topics to threadMeta.topicPlan
 * with stable client-side ids and flips tutorPhase → "review" so the UI
 * opens the side panel.
 *
 * Idempotent: re-running on the same message is a no-op (the plan and
 * phase are already set). Safe to call after every tutor-mode runAgent.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function extractAndSaveTopicPlan(ctx: any, threadId: string): Promise<void> {
  try {
    // Skip extraction if a plan already exists and we're not in
    // input/replan-pending state — re-emissions during recovery
    // shouldn't overwrite an in-progress plan the user has been
    // editing.
    const meta = await ctx.runQuery(internal.chat.threads.getMeta, {
      threadId,
    });
    if (!meta) return;
    const phase = meta.tutorPhase ?? "input";
    if (phase !== "input" && phase !== "replan") return;

    // Walk the last few assistant messages looking for a PlanTopics
    // tool-call. We scan a small window because the planning emission
    // is always the most recent assistant message in the input phase.
    const result = await ctx.runQuery(
      components.agent.messages.listMessagesByThreadId,
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        threadId: threadId as any,
        order: "desc",
        paginationOpts: { numItems: 3, cursor: null },
      },
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = (result?.page ?? []) as any[];
    for (const m of items) {
      if ((m.message?.role ?? m.role) !== "assistant") continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const content: any[] = Array.isArray(m.message?.content)
        ? m.message.content
        : Array.isArray(m.parts)
          ? m.parts
          : [];
      for (const part of content) {
        const partType = part?.type;
        const isToolCall =
          partType === "tool-call" ||
          (typeof partType === "string" &&
            partType.startsWith("tool-") &&
            partType !== "tool-result");
        if (!isToolCall) continue;
        if (part.toolName !== "PlanTopics") continue;
        // Found it. Args may live under `input` (AI SDK v6) or `args`
        // (older shape) — accept either.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const args = (part.input ?? part.args) as
          | { topics?: Array<{ title?: string; description?: string; prompt?: string }> }
          | undefined;
        const rawTopics = Array.isArray(args?.topics) ? args.topics : [];
        if (rawTopics.length === 0) return;
        const topics = rawTopics.map((t, i) => ({
          // Stable id: index + first 8 chars of title hash. Doesn't
          // need to be globally unique, just stable across edits and
          // unique within this plan.
          id: `t${i}-${stableShortId(typeof t.title === "string" ? t.title : `topic-${i}`)}`,
          title: typeof t.title === "string" ? t.title : `Тема ${i + 1}`,
          description: typeof t.description === "string" ? t.description : "",
          prompt: typeof t.prompt === "string" ? t.prompt : "",
          order: i,
          status: "pending" as const,
        }));
        await ctx.runMutation(
          internal.chat.threads.setTopicPlanInternal,
          {
            threadId,
            topics,
            tutorPhase: "review",
          },
        );
        return;
      }
      // Stop after the first assistant message — don't accidentally
      // pick up a PlanTopics from earlier in the history.
      break;
    }
  } catch (err) {
    console.warn("extractAndSaveTopicPlan failed", err);
  }
}

/**
 * Cheap, deterministic 6-character id derived from a string. Used as a
 * disambiguator for topic ids. Not crypto-strength — just enough to
 * avoid collisions across topics within a single plan.
 */
function stableShortId(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(h).toString(36).slice(0, 6);
}

/**
 * Tutor-mode Phase-C-skip detector.
 *
 * Returns true when the model finished a turn without an end-of-turn
 * pausing tool (AskUserQuestion / Quiz / NextTopicButton / PlanTopics)
 * in a context where one was REQUIRED.
 *
 * Phase-aware semantics:
 *   - "teaching": EVERY turn must end with a pausing tool. ANY content
 *     (prose or non-pausing widgets like Definition) without a pausing
 *     tool triggers recovery, regardless of prose length. This is the
 *     case that bit us before — the model emitted Phase A + a Definition
 *     and stopped without explaining or asking.
 *   - "input": the model is supposed to either (a) emit `PlanTopics`
 *     when material is present, or (b) write a short clarification
 *     "what are we studying?" prose-only. We use the 60-char threshold
 *     here so the legitimate clarification case doesn't false-positive.
 *   - "completed": model writes final summary; no tool expected. Skip.
 *   - undefined/non-tutor: legacy 60-char threshold (back-compat).
 *
 * `QuestionBox` is NOT a pausing tool here — a teaching turn that ends
 * with only a QuestionBox is still "skipped" since the user can ignore
 * the box and the cycle stalls.
 */
async function detectPhaseCSkip(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  threadId: string,
  tutorPhase?: string,
): Promise<boolean> {
  if (tutorPhase === "completed" || tutorPhase === "review") return false;
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
    let hasNonPausingToolCall = false;
    for (const part of content) {
      const t = part?.type;
      if (t === "text" && typeof part.text === "string") {
        textLen += part.text.length;
      } else if (
        // tool-call shapes vary by SDK version; we accept any of these.
        t === "tool-call" ||
        (typeof t === "string" && t.startsWith("tool-") && t !== "tool-result")
      ) {
        if (typeof part.toolName === "string") {
          if (PAUSING_TOOLS.has(part.toolName)) {
            hasPausingTool = true;
          } else if (part.toolName !== "lookupWidgetDocs") {
            // lookupWidgetDocs is a meta-tool; it doesn't count as
            // "real content". Anything else (Definition, MathBlock,
            // Figure, ...) does.
            hasNonPausingToolCall = true;
          }
        }
      }
    }
    if (hasPausingTool) return false;
    // STRICT mode: in tutor teaching, ANY assistant content without a
    // pausing tool fires recovery — even short Phase-A-only intros that
    // happened to include a Definition widget. That's the failure mode
    // we observed: model wrote "Сейчас разберём X" + Definition, then
    // stopped without Phase B / Phase C.
    if (tutorPhase === "teaching") {
      return textLen > 0 || hasNonPausingToolCall;
    }
    // For tutor "input" phase or non-tutor threads: keep the old
    // 60-char threshold so a legitimate "what are we studying?"
    // clarification doesn't false-positive.
    return textLen >= 60 || hasNonPausingToolCall;
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
 * Reminder content is phase-specific:
 *   - teaching: "you didn't end with a pausing tool — finish the cycle"
 *   - input: "you didn't emit PlanTopics — emit it now"
 *   - other: generic
 */
async function scheduleTutorPhaseCRetry(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  threadId: string,
  userId: string,
  generationId: number | undefined,
  tutorPhase: string | undefined,
): Promise<void> {
  let body: string;
  if (tutorPhase === "teaching") {
    body =
      `В режиме TEACHING каждый твой шаг ОБЯЗАН заканчиваться вызовом одного из инструментов: ` +
      `\`AskUserQuestion\` (если только что объяснял Phase B либо проверяешь дополнительный аспект), ` +
      `либо \`NextTopicButton\` (если тема покрыта и ты готов перейти к следующей).\n\n` +
      `В предыдущем шаге ты не вызвал НИ ОДНОГО из них — возможно, ты эмитнул только Phase A intro и/или какой-то декоративный виджет (Definition, MathBlock и т.п.) и остановился. AI SDK завершил generate-loop, пользователь ничего не может сделать.\n\n` +
      `СЕЙЧАС: продолжи цикл с того места, где ты остановился. Если ещё не было Phase B (объяснения чанка) — напиши его прозой, потом эмить \`AskUserQuestion\`. Если Phase B уже был — сразу \`AskUserQuestion\`. Никаких "извинений" или комментариев про напоминание.`;
  } else if (tutorPhase === "input") {
    body =
      `Ты в фазе PHASE 0 (планирование). Твой первый шаг ОБЯЗАН быть вызовом tool \`PlanTopics\` — разбиение материала на ордерёд тем.\n\n` +
      `СЕЙЧАС: эмить \`PlanTopics\` с массивом тем. Никакой прозы перед или после tool-call. Если у тебя действительно нет материала — спроси одной короткой фразой "Что изучаем?", без tool-call'ов.`;
  } else {
    body =
      `В предыдущем своём ответе ты НАПИСАЛ прозу про проверку понимания (например, "Проверим, что ты усвоил") но НЕ ВЫЗВАЛ tool \`AskUserQuestion\`. Это failure mode "promise without payoff".\n\n` +
      `СЕЙЧАС: вызови ровно ОДИН \`AskUserQuestion\` с 1–3 вопросами по только что объяснённому чанку. Никакой прозы — только tool-call.`;
  }
  const reminderText =
    `${PHASE_C_RETRY_MARKER}\n\n` +
    `СИСТЕМНОЕ НАПОМИНАНИЕ (Phase-C-retry, авто-инжект):\n\n` +
    body +
    `\n\nЭто сообщение является внутренним напоминанием системы, не от пользователя. Не извиняйся, не комментируй — просто продолжай цикл tutor-режима.`;
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
