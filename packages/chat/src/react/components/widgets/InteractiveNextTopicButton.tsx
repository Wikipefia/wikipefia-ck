"use client";

import { useState, useCallback, type KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { C } from "@wikipefia/mdx-renderer/theme";
import { Button, Textarea } from "@wikipefia/ui";
import { useSubmitToolResponse } from "../../hooks/use-messages";

/**
 * Tutor-mode "proceed to next topic" affordance. Pauses the agent until the
 * user picks one of two actions:
 *   - "continue": move on to the next chunk
 *   - "ask":     ask a clarifying question about the current chunk
 *                (the user types it in an inline textarea)
 *
 * Submission goes through the same approval pipeline as Quiz / AskUserQuestion
 * via `useSubmitToolResponse`. The model is instructed (in the auto-advance-off
 * prompt fragment) on how to handle each branch.
 */

export interface InteractiveNextTopicButtonProps {
  messageId: string;
  toolCallId: string;
  approvalId?: string | null;
  args: {
    currentTopicSummary?: string;
    nextTopicHint?: string;
  };
  /** When set, the user has already chosen — render read-only state. */
  answered?: {
    action?: "continue" | "ask";
    question?: string;
  } | null;
}

export function InteractiveNextTopicButton({
  messageId,
  toolCallId,
  approvalId,
  args,
  answered,
}: InteractiveNextTopicButtonProps) {
  const submit = useSubmitToolResponse();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<boolean>(!!answered);
  const [composing, setComposing] = useState(false);
  const [questionText, setQuestionText] = useState("");

  const isReadOnly = submitted || !!answered;
  const awaiting = !isReadOnly;

  const continueAction = useCallback(async () => {
    if (submitting || isReadOnly) return;
    setSubmitting(true);
    try {
      await submit(messageId, toolCallId, { action: "continue" }, approvalId);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }, [submit, submitting, isReadOnly, messageId, toolCallId, approvalId]);

  const askAction = useCallback(async () => {
    const q = questionText.trim();
    if (q.length === 0 || submitting || isReadOnly) return;
    setSubmitting(true);
    try {
      await submit(
        messageId,
        toolCallId,
        { action: "ask", question: q },
        approvalId,
      );
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }, [
    questionText,
    submit,
    submitting,
    isReadOnly,
    messageId,
    toolCallId,
    approvalId,
  ]);

  const onComposerKey = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        askAction();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setComposing(false);
        setQuestionText("");
      }
    },
    [askAction],
  );

  return (
    <div
      className="border-2 my-4"
      style={{
        borderColor: awaiting ? C.accent : C.border,
        backgroundColor: C.bgWhite,
        boxShadow: awaiting ? `0 0 0 4px ${C.accent}14` : undefined,
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
    >
      <div
        className="px-4 py-2.5 border-b-2 flex items-center justify-between gap-3"
        style={{
          borderColor: awaiting ? C.accent : C.border,
          backgroundColor: awaiting ? C.accent : C.headerBg,
        }}
      >
        <span
          className="text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{
            fontFamily: "var(--font-mono)",
            color: awaiting ? "#fff" : C.headerText,
          }}
        >
          → Готовы двигаться дальше?
        </span>
        {isReadOnly ? (
          <span
            className="text-[10px] uppercase tracking-[0.15em]"
            style={{ fontFamily: "var(--font-mono)", color: C.headerText }}
          >
            {answered?.action === "ask" ? "Вы задали вопрос" : "Вы продолжили"}
          </span>
        ) : null}
      </div>
      <div className="px-4 py-4 flex flex-col gap-3">
        {args.currentTopicSummary ? (
          <div>
            <div
              className="text-[10px] uppercase tracking-[0.15em] mb-1"
              style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
            >
              Только что разобрали
            </div>
            <div
              className="text-[13px]"
              style={{ fontFamily: "var(--font-serif)", color: C.text }}
            >
              {args.currentTopicSummary}
            </div>
          </div>
        ) : null}
        {args.nextTopicHint ? (
          <div>
            <div
              className="text-[10px] uppercase tracking-[0.15em] mb-1"
              style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
            >
              Дальше
            </div>
            <div
              className="text-[15px] font-bold"
              style={{ fontFamily: "var(--font-serif)", color: C.text }}
            >
              {args.nextTopicHint}
            </div>
          </div>
        ) : null}

        {/* Read-only echo of the user's choice. */}
        {isReadOnly && answered?.action === "ask" && answered.question ? (
          <div
            className="text-[13px] italic px-3 py-2 border-l-2"
            style={{
              borderColor: C.accent,
              backgroundColor: C.bg,
              fontFamily: "var(--font-serif)",
              color: C.text,
            }}
          >
            {answered.question}
          </div>
        ) : null}

        {/* Live controls (only while awaiting). */}
        {!isReadOnly ? (
          <AnimatePresence initial={false} mode="wait">
            {composing ? (
              <motion.div
                key="composer"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.14 }}
                className="flex flex-col gap-2"
              >
                <Textarea
                  autoFocus
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  onKeyDown={onComposerKey}
                  rows={Math.min(
                    6,
                    Math.max(3, questionText.split("\n").length),
                  )}
                  placeholder="Что осталось непонятным?"
                  disabled={submitting}
                  className="px-3 py-2 text-[14px] resize-y"
                  style={{
                    fontFamily: "var(--font-serif)",
                    borderColor: C.border,
                    backgroundColor: C.bgWhite,
                    color: C.text,
                  }}
                />
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-[10px] uppercase tracking-[0.15em]"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: C.textMuted,
                    }}
                  >
                    ⌘+Enter — отправить · Esc — отмена
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setComposing(false);
                        setQuestionText("");
                      }}
                      disabled={submitting}
                      className="h-[30px] px-3 text-[10px]"
                      style={{ color: C.textMuted }}
                    >
                      Отмена
                    </Button>
                    <Button
                      type="button"
                      onClick={askAction}
                      disabled={
                        questionText.trim().length === 0 || submitting
                      }
                      className="border-2 h-[30px] px-4 text-[10px]"
                      style={{
                        borderColor: C.accent,
                        backgroundColor: C.accent,
                        color: "#fff",
                      }}
                    >
                      {submitting ? "Отправка…" : "Задать вопрос →"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="actions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}
                className="flex items-center justify-between gap-3 mt-1"
              >
                <button
                  type="button"
                  onClick={() => setComposing(true)}
                  disabled={submitting}
                  className="text-[11px] uppercase tracking-[0.1em] underline cursor-pointer disabled:opacity-40"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: C.textMuted,
                  }}
                >
                  ? У меня есть вопрос
                </button>
                <Button
                  type="button"
                  onClick={continueAction}
                  disabled={submitting}
                  className="border-2 h-[36px] px-5 text-[11px]"
                  style={{
                    borderColor: C.accent,
                    backgroundColor: C.accent,
                    color: "#fff",
                    boxShadow: `0 2px 0 0 ${C.accent}40`,
                  }}
                >
                  {submitting ? "Отправка…" : "→ Перейти к следующей теме"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        ) : null}
      </div>
    </div>
  );
}
