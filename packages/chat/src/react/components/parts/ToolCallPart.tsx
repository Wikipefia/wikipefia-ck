"use client";

import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { WidgetSkeleton } from "../widgets/WidgetSkeleton";
import type { MessagePart } from "../../../types";

// Lazy-load the heavy widget renderer + interactive quiz. They pull in
// framer-motion + 35+ widget components from @wikipefia/mdx-renderer.
// Most chats have at most a handful of tool calls, and many have none —
// loading these eagerly was a major contributor to the dev-server CPU
// spike (every page rebuild had to compile all of mdx-renderer).
const WidgetRenderer = lazy(() =>
  import("../widgets/WidgetRenderer").then((m) => ({
    default: m.WidgetRenderer,
  })),
);

const InteractiveQuiz = lazy(() =>
  import("../widgets/InteractiveQuiz").then((m) => ({
    default: m.InteractiveQuiz,
  })),
);

const QuestionBox = lazy(() =>
  import("../widgets/QuestionBox").then((m) => ({
    default: m.QuestionBox,
  })),
);

const InteractiveAskUserQuestion = lazy(() =>
  import("../widgets/InteractiveAskUserQuestion").then((m) => ({
    default: m.InteractiveAskUserQuestion,
  })),
);

const InteractiveNextTopicButton = lazy(() =>
  import("../widgets/InteractiveNextTopicButton").then((m) => ({
    default: m.InteractiveNextTopicButton,
  })),
);

interface ToolCallPartProps {
  part: Extract<MessagePart, { type: "tool-call" }>;
  messageId: string;
  /** Required for QuestionBox to subscribe to the right side-channel. */
  threadId: string;
  /** If a matching tool-result part exists in the same message, pass its result. */
  resolvedResult?: unknown;
}

export function ToolCallPart({
  part,
  messageId,
  threadId,
  resolvedResult,
}: ToolCallPartProps) {
  // QuestionBox renders even when the agent's tool-result is already saved —
  // the actual conversation lives in our `questionBoxPairs` side-channel,
  // not the tool-result. Rendering only depends on having the topic arg.
  if (part.toolName === "QuestionBox" && part.state === "complete") {
    const args = part.args as { topic?: string };
    const topic =
      typeof args?.topic === "string" && args.topic.trim().length > 0
        ? args.topic
        : "this section";
    return (
      <Suspense
        fallback={
          <WidgetSkeleton toolName="QuestionBox" partialArgsKeyCount={1} />
        }
      >
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <QuestionBox
            threadId={threadId}
            messageId={messageId}
            toolCallId={part.toolCallId}
            topic={topic}
          />
        </motion.div>
      </Suspense>
    );
  }

  // AskUserQuestion (tutor mode) — same approval pattern as Quiz, single
  // question with multiple_choice / numeric / free_text variants.
  if (part.toolName === "AskUserQuestion" && part.state === "complete") {
    const args = part.args as
      | (Record<string, unknown> & { type?: string })
      | undefined;
    // Defensive: only render if `type` AND the type-specific required
    // payload are present. A model occasionally emits a malformed
    // AskUserQuestion (e.g. type set but no options for multiple_choice);
    // we'd rather fall through to the generic widget renderer (which
    // shows raw args for debugging) than render a clickable widget with
    // no content.
    if (isWellFormedAskUserQuestion(args)) {
      const answered = extractAskUserQuestionAnswer(resolvedResult);
      return (
        <Suspense
          fallback={
            <WidgetSkeleton toolName="AskUserQuestion" partialArgsKeyCount={2} />
          }
        >
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <InteractiveAskUserQuestion
              messageId={messageId}
              toolCallId={part.toolCallId}
              approvalId={part.approvalId ?? null}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              args={args as any}
              answered={answered}
            />
          </motion.div>
        </Suspense>
      );
    }
    // Malformed — render nothing rather than show a broken UI. The model
    // gets an approval-pending state still, but the user sees a clean
    // gap. The Phase-C-retry mechanism (in agent_action.ts) will
    // typically replace this with a well-formed AskUserQuestion soon.
    return null;
  }

  // NextTopicButton (tutor mode, autoAdvance=off) — pauses the agent and
  // gives the user one of two choices: continue OR ask a clarifying question.
  if (part.toolName === "NextTopicButton" && part.state === "complete") {
    const args = part.args as {
      currentTopicSummary?: string;
      nextTopicHint?: string;
    };
    const answered = extractNextTopicAnswer(resolvedResult);
    return (
      <Suspense
        fallback={
          <WidgetSkeleton toolName="NextTopicButton" partialArgsKeyCount={2} />
        }
      >
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <InteractiveNextTopicButton
            messageId={messageId}
            toolCallId={part.toolCallId}
            approvalId={part.approvalId ?? null}
            args={args}
            answered={answered}
          />
        </motion.div>
      </Suspense>
    );
  }

  // Quiz uses an interactive renderer when awaiting user input; when
  // result exists, it renders read-only with feedback.
  if (part.toolName === "Quiz" && part.state === "complete") {
    const args = part.args as {
      questions?: {
        text: string;
        options: { value: string; correct: boolean; explanation?: string }[];
      }[];
    };
    // Defensive: a Quiz with no questions array (or an empty one) is
    // malformed — most likely the model emitted Quiz with default/empty
    // args (sometimes happens when the model lookups Quiz docs but
    // doesn't fill them in correctly, or in tutor mode where Quiz is
    // explicitly disabled but the model tries it anyway). Rather than
    // render an empty "0/0 answered" widget that the user can't
    // interact with, we render nothing. The pending approval still
    // exists server-side — if it leaves the thread stuck in
    // awaiting_user, the user can hit Cancel.
    if (!Array.isArray(args.questions) || args.questions.length === 0) {
      return null;
    }
    // The user's submitted answers can land in either:
    //   - resolvedResult.answers (when stored as a tool-result), or
    //   - a tool-result with a value-typed JSON output (AI SDK normalizes
    //     execute() returns into { type: "json", value: ... } shape).
    const answers = extractAnswers(resolvedResult);
    return (
      <Suspense
        fallback={<WidgetSkeleton toolName="Quiz" partialArgsKeyCount={1} />}
      >
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <InteractiveQuiz
            messageId={messageId}
            toolCallId={part.toolCallId}
            approvalId={part.approvalId ?? null}
            questions={args.questions}
            answered={answers ? { answers } : null}
          />
        </motion.div>
      </Suspense>
    );
  }

  if (part.state === "partial") {
    const keys =
      part.args && typeof part.args === "object"
        ? Object.keys(part.args as Record<string, unknown>).length
        : 0;
    return (
      <WidgetSkeleton toolName={part.toolName} partialArgsKeyCount={keys} />
    );
  }

  return (
    <Suspense fallback={<WidgetSkeleton toolName={part.toolName} />}>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <WidgetRenderer toolName={part.toolName} args={part.args} />
      </motion.div>
    </Suspense>
  );
}

/**
 * Pull `answers: string[]` out of whatever shape the AI SDK / @convex-dev/agent
 * emitted as the tool result. Handles three observed shapes:
 *   1. { answers: [...] }                             — direct
 *   2. { type: "json", value: { answers: [...] } }    — AI SDK normalization
 *   3. { value: { answers: [...] } }                  — older agent version
 */
function extractAnswers(result: unknown): string[] | null {
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  const direct = r.answers;
  if (Array.isArray(direct) && direct.every((a) => typeof a === "string")) {
    return direct as string[];
  }
  const inner = (r.value ?? r.output) as { answers?: unknown } | undefined;
  if (inner && typeof inner === "object") {
    const a = (inner as { answers?: unknown }).answers;
    if (Array.isArray(a) && a.every((x) => typeof x === "string")) {
      return a as string[];
    }
  }
  return null;
}

/**
 * Returns true when an AskUserQuestion args object has the discriminator
 * `type` AND the type-specific required payload. Guards the UI against
 * rendering a clickable but content-free widget when the model emits a
 * malformed call (e.g. type=multiple_choice with no options).
 */
function isWellFormedAskUserQuestion(
  args: (Record<string, unknown> & { type?: string }) | undefined,
): boolean {
  if (!args || typeof args.prompt !== "string" || args.prompt.trim().length === 0) {
    return false;
  }
  if (args.type === "multiple_choice") {
    const opts = args.options;
    return Array.isArray(opts) && opts.length >= 2;
  }
  if (args.type === "numeric") {
    return typeof args.expectedValue === "number";
  }
  if (args.type === "free_text") {
    const kp = args.expectedKeyPoints;
    return Array.isArray(kp) && kp.length >= 1;
  }
  return false;
}

/**
 * Pull the user's submitted payload out of an AskUserQuestion tool result.
 * Submission shapes (one of):
 *   - { type: "multiple_choice", value: "<option>" }
 *   - { type: "numeric", value: 42 }
 *   - { type: "free_text", text: "..." }
 *
 * Wrapped equivalently in `value`/`output` by the AI SDK normalization.
 */
function extractAskUserQuestionAnswer(
  result: unknown,
): { value: string | number; text?: string } | null {
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  // unwrap AI SDK { type: "json", value: ... } and similar
  const inner =
    typeof r.value === "object" && r.value !== null
      ? (r.value as Record<string, unknown>)
      : typeof r.output === "object" && r.output !== null
        ? (r.output as Record<string, unknown>)
        : r;
  const v = inner.value;
  const text = inner.text;
  if (typeof text === "string") return { value: text, text };
  if (typeof v === "string" || typeof v === "number") return { value: v };
  return null;
}

/**
 * Pull the NextTopicButton submission payload from a tool result.
 *   - { action: "continue" }
 *   - { action: "ask", question: string }
 */
function extractNextTopicAnswer(
  result: unknown,
): { action?: "continue" | "ask"; question?: string } | null {
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  const inner =
    typeof r.value === "object" && r.value !== null
      ? (r.value as Record<string, unknown>)
      : typeof r.output === "object" && r.output !== null
        ? (r.output as Record<string, unknown>)
        : r;
  const action = inner.action;
  if (action !== "continue" && action !== "ask") return null;
  const question = typeof inner.question === "string" ? inner.question : undefined;
  return { action, question };
}
