"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { C } from "@wikipefia/mdx-renderer/theme";
import { useSubmitToolResponse } from "../../hooks/use-messages";

export interface QuizQuestion {
  text: string;
  options: { value: string; correct: boolean; explanation?: string }[];
}

export interface InteractiveQuizProps {
  messageId: string;
  toolCallId: string;
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
      await submit(messageId, toolCallId, { answers });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }, [allAnswered, submitting, questions, picks, submit, messageId, toolCallId]);

  const isReadOnly = submitted || !!answered;
  const currentAnswers = answered?.answers ?? questions.map((_, i) => picks[i]);

  return (
    <div
      className="border-2 my-4"
      style={{ borderColor: C.border, backgroundColor: C.bgWhite }}
    >
      <div
        className="px-4 py-2.5 border-b-2"
        style={{ borderColor: C.border, backgroundColor: C.headerBg }}
      >
        <span
          className="text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{ fontFamily: "var(--font-mono)", color: C.headerText }}
        >
          ? QUIZ
        </span>
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
              {q.text}
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
                    <span className="text-[14px]">{opt.value}</span>
                    {showResult && opt.explanation ? (
                      <div
                        className="text-[12px] mt-1.5"
                        style={{ color: C.textMuted, fontFamily: "var(--font-serif)" }}
                      >
                        {opt.explanation}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </motion.div>
        ))}
        {!isReadOnly ? (
          <div className="flex justify-end mt-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!allAnswered || submitting}
              className="border h-[34px] px-4 text-[11px] font-bold uppercase tracking-[0.1em] disabled:opacity-40"
              style={{
                fontFamily: "var(--font-mono)",
                borderColor: C.border,
                backgroundColor: allAnswered ? C.headerBg : C.bgWhite,
                color: allAnswered ? C.headerText : C.textMuted,
              }}
            >
              {submitting ? "Submitting…" : "Submit answers"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
