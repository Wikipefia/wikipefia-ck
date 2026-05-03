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

interface ToolCallPartProps {
  part: Extract<MessagePart, { type: "tool-call" }>;
  messageId: string;
  /** If a matching tool-result part exists in the same message, pass its result. */
  resolvedResult?: unknown;
}

export function ToolCallPart({
  part,
  messageId,
  resolvedResult,
}: ToolCallPartProps) {
  // Quiz uses an interactive renderer when awaiting user input; when
  // result exists, it renders read-only with feedback.
  if (part.toolName === "Quiz" && part.state === "complete") {
    const args = part.args as {
      questions?: {
        text: string;
        options: { value: string; correct: boolean; explanation?: string }[];
      }[];
    };
    const answers =
      resolvedResult &&
      typeof resolvedResult === "object" &&
      "answers" in (resolvedResult as Record<string, unknown>)
        ? ((resolvedResult as { answers: string[] }).answers ?? null)
        : null;
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
            questions={args.questions ?? []}
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
