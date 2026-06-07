"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { C } from "@wikipefia/mdx-renderer/theme";
import { Button } from "@wikipefia/ui";
import { useSubmitToolResponse } from "../../hooks/use-messages";
import { InlineMarkdown } from "./inline-markdown";

export interface QuizQuestion {
  text: string;
  options: { value: string; correct: boolean; explanation?: string }[];
}

export interface InteractiveQuizProps {
  messageId: string;
  toolCallId: string;
  /**
   * The AI SDK approvalId attached to the paused tool call. Required to
   * resolve the approval correctly — passing null/undefined leads to the
   * answers being silently auto-denied by the AI SDK.
   */
  approvalId?: string | null;
  questions: QuizQuestion[];
  /** When true, the user has already answered (replay) — display as read-only result. */
  answered?: { answers: string[] } | null;
}

/**
 * Renders a quiz that pauses the agent until submitted. On submit, we send
 * the user's answers via the transport's submitToolResponse, which on the
 * server triggers approveToolCall + scheduling of the next agent step.
 */
export function InteractiveQuiz({
  messageId,
  toolCallId,
  approvalId,
  questions,
  answered,
}: InteractiveQuizProps) {
  const submit = useSubmitToolResponse();
  const [picks, setPicks] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<boolean>(!!answered);

  const allAnswered = questions.every((_, i) => picks[i] !== undefined);

  const handleSubmit = useCallback(async () => {
    if (!allAnswered || submitting) return;
    setSubmitting(true);
    try {
      const answers = questions.map((_, i) => picks[i]);
      await submit(messageId, toolCallId, { answers }, approvalId);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }, [
    allAnswered,
    submitting,
    questions,
    picks,
    submit,
    messageId,
    toolCallId,
    approvalId,
  ]);

  const isReadOnly = submitted || !!answered;
  const currentAnswers = answered?.answers ?? questions.map((_, i) => picks[i]);

  // Visual emphasis when the user still has to answer:
  //   - heavier accent border around the entire card
  //   - "Awaiting your answer" header chip with a pulsing dot
  //   - subtle outer glow so it stands out in the message stream
  const awaitingAnswer = !isReadOnly;

  return (
    <div
      className="border-2 my-4"
      style={{
        borderColor: awaitingAnswer ? C.accent : C.border,
        backgroundColor: C.bgWhite,
        boxShadow: awaitingAnswer ? `0 0 0 4px ${C.accent}14` : undefined,
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
    >
      <div
        className="px-4 py-2.5 border-b-2 flex items-center justify-between gap-3"
        style={{
          borderColor: awaitingAnswer ? C.accent : C.border,
          backgroundColor: awaitingAnswer ? C.accent : C.headerBg,
        }}
      >
        <span
          className="text-[10px] font-bold uppercase tracking-[0.15em] flex items-center gap-2"
          style={{
            fontFamily: "var(--font-mono)",
            color: awaitingAnswer ? "#fff" : C.headerText,
          }}
        >
          ? QUIZ
        </span>
        {awaitingAnswer ? (
          <span
            className="text-[10px] font-bold uppercase tracking-[0.15em] flex items-center gap-1.5"
            style={{ fontFamily: "var(--font-mono)", color: "#fff" }}
          >
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{
                  backgroundColor: "#fff",
                  animation: "wpf-quiz-pulse 1.6s cubic-bezier(0,0,0.2,1) infinite",
                }}
              />
              <span
                className="relative inline-flex rounded-full h-2 w-2"
                style={{ backgroundColor: "#fff" }}
              />
            </span>
            Awaiting your answer
            <style>{`@keyframes wpf-quiz-pulse { 0%, 100% { transform: scale(1); opacity: 0.75; } 50% { transform: scale(2.6); opacity: 0; } }`}</style>
          </span>
        ) : null}
      </div>
      <div className="px-4 py-4 flex flex-col gap-5">
        {questions.map((q, qi) => (
          <motion.div
            key={qi}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: qi * 0.06 }}
          >
            <div
              className="text-[14px] mb-2"
              style={{ fontFamily: "var(--font-serif)", color: C.text }}
            >
              <span
                className="text-[10px] uppercase tracking-wider mr-2"
                style={{ fontFamily: "var(--font-mono)", color: C.accent }}
              >
                Q{qi + 1}
              </span>
              <InlineMarkdown text={q.text} />
            </div>
            <div className="flex flex-col gap-1.5">
              {q.options.map((opt, oi) => {
                const picked = currentAnswers[qi] === opt.value;
                const showResult = isReadOnly;
                const correct = opt.correct;
                const color: string = C.text;
                let borderColor: string = C.borderLight;
                let bg: string = C.bgWhite;
                if (showResult) {
                  if (picked && correct) {
                    borderColor = "#059669";
                    bg = "rgba(5, 150, 105, 0.06)";
                  } else if (picked && !correct) {
                    borderColor = "#DC2626";
                    bg = "rgba(220, 38, 38, 0.06)";
                  } else if (correct) {
                    borderColor = "#059669";
                  }
                } else if (picked) {
                  borderColor = C.accent;
                  bg = C.bg;
                }
                return (
                  <button
                    key={oi}
                    type="button"
                    disabled={isReadOnly || submitting}
                    onClick={() => setPicks((prev) => ({ ...prev, [qi]: opt.value }))}
                    className="text-left border px-3 py-2 transition-colors disabled:cursor-default"
                    style={{
                      borderColor,
                      backgroundColor: bg,
                      color,
                      fontFamily: "var(--font-serif)",
                    }}
                  >
                    <span
                      className="text-[10px] uppercase tracking-wider mr-2"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: showResult
                          ? correct
                            ? "#059669"
                            : picked
                              ? "#DC2626"
                              : C.textMuted
                          : C.textMuted,
                      }}
                    >
                      {showResult
                        ? correct
                          ? "✓"
                          : picked
                            ? "✕"
                            : "○"
                        : picked
                          ? "●"
                          : "○"}
                    </span>
                    <span className="text-[14px]">
                      <InlineMarkdown text={opt.value} />
                    </span>
                    {showResult && opt.explanation ? (
                      <div
                        className="text-[12px] mt-1.5"
                        style={{ color: C.textMuted, fontFamily: "var(--font-serif)" }}
                      >
                        <InlineMarkdown text={opt.explanation} />
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </motion.div>
        ))}
        {!isReadOnly ? (
          <div className="flex items-center justify-between gap-3 mt-2">
            <span
              className="text-[10px] uppercase tracking-[0.15em]"
              style={{
                fontFamily: "var(--font-mono)",
                color: allAnswered ? C.accent : C.textMuted,
              }}
            >
              {Object.keys(picks).length}/{questions.length} answered
            </span>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!allAnswered || submitting}
              className="border-2 h-[36px] px-5 text-[11px] transition-all"
              style={{
                borderColor: allAnswered ? C.accent : C.border,
                backgroundColor: allAnswered ? C.accent : C.bgWhite,
                color: allAnswered ? "#fff" : C.textMuted,
                boxShadow: allAnswered ? `0 2px 0 0 ${C.accent}40` : undefined,
              }}
            >
              {submitting ? "Submitting…" : "Submit answers →"}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
