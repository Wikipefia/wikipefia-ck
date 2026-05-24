"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { C } from "@wikipefia/mdx-renderer/theme";
import { useSubmitToolResponse } from "../../hooks/use-messages";

/**
 * Chat-side widget that pairs with the right-side TopicListPanel during
 * Phase 0 / "review" of tutor mode.
 *
 * Shows:
 *   - A short summary of the plan (topic count + a line saying "edit on
 *     the right then click Continue").
 *   - A primary "Начать обучение" button → submitToolResponse({action:"start"})
 *     resolves the PlanTopics approval and triggers teaching.
 *
 * The actual editing happens in the right-side panel
 * (TopicListPanel) — that's where the user edits / deletes / reorders /
 * adds topics and triggers re-planning. This chat widget only owns the
 * "approve and start" gesture.
 */
export interface InteractivePlanTopicsProps {
  messageId: string;
  toolCallId: string;
  approvalId?: string | null;
  topicCount: number;
  /**
   * Resolved-result from a previously-completed approval (replay state).
   * When set, the widget renders read-only acknowledging the user's
   * choice ("you started teaching" / "you requested replan").
   */
  answered?: {
    action?: "start" | "replan";
    instructions?: string;
  } | null;
}

export function InteractivePlanTopics({
  messageId,
  toolCallId,
  approvalId,
  topicCount,
  answered,
}: InteractivePlanTopicsProps) {
  const submit = useSubmitToolResponse();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<boolean>(!!answered);

  const isReadOnly = submitted || !!answered;
  const awaiting = !isReadOnly;

  const handleStart = useCallback(async () => {
    if (submitting || isReadOnly) return;
    setSubmitting(true);
    try {
      await submit(messageId, toolCallId, { action: "start" }, approvalId);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }, [submit, submitting, isReadOnly, messageId, toolCallId, approvalId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
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
          ▤ ПЛАН ОБУЧЕНИЯ
        </span>
        {isReadOnly ? (
          <span
            className="text-[10px] uppercase tracking-[0.15em]"
            style={{ fontFamily: "var(--font-mono)", color: C.headerText }}
          >
            {answered?.action === "replan"
              ? "Запрошено перепланирование"
              : "Обучение запущено"}
          </span>
        ) : null}
      </div>
      <div className="px-4 py-4 flex flex-col gap-3">
        <div>
          <div
            className="text-[12px]"
            style={{ fontFamily: "var(--font-serif)", color: C.text }}
          >
            Я разбил материал на{" "}
            <strong>
              {topicCount} {pluralize(topicCount, "тему", "темы", "тем")}
            </strong>
            . Просмотрите план в боковой панели справа: можно
            редактировать названия, описания и инструкции, удалять и
            переставлять темы, или попросить меня перепланировать с нуля.
          </div>
          <div
            className="text-[12px] mt-2"
            style={{ fontFamily: "var(--font-serif)", color: C.textMuted }}
          >
            Когда готовы — нажмите кнопку ниже, чтобы начать обучение.
          </div>
        </div>

        {!isReadOnly ? (
          <div className="flex items-center justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={handleStart}
              disabled={submitting || topicCount === 0}
              className="border-2 h-[36px] px-5 text-[11px] font-bold uppercase tracking-[0.1em] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                fontFamily: "var(--font-mono)",
                borderColor: C.accent,
                backgroundColor: C.accent,
                color: "#fff",
                boxShadow: `0 2px 0 0 ${C.accent}40`,
              }}
            >
              {submitting ? "Запуск..." : "→ Начать обучение"}
            </button>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

/** Russian plural pluralizer (1, 2-4, 5+). */
function pluralize(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
