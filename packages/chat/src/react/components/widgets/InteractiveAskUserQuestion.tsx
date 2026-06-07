"use client";

import { useState, useCallback, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { C } from "@wikipefia/mdx-renderer/theme";
import { Button, Input, Textarea } from "@wikipefia/ui";
import { useSubmitToolResponse } from "../../hooks/use-messages";
import { InlineMarkdown } from "./inline-markdown";

/**
 * Tutor-mode comprehension question. Pauses the agent until submitted.
 * Three flavors driven by the `args.type` discriminator:
 *   - multiple_choice: radio-button list, submits { value: string }
 *   - numeric:         number input + optional unit, submits { value: number }
 *   - free_text:       textarea (with optional minWords nudge), submits { text: string }
 *
 * Submission goes through the same approval pipeline as Quiz
 * (`useSubmitToolResponse`). The model receives a tool-result on its next
 * step and must evaluate the answer (correct? misconception?).
 *
 * The args shape is intentionally FLAT (single object with optional fields
 * per variant) to keep the JSON Schema compatible with strict-mode
 * providers (Azure / OpenAI) which reject root-level discriminated unions.
 */
export interface AskUserQuestionArgs {
  type: "multiple_choice" | "numeric" | "free_text";
  prompt: string;
  context?: string;
  // multiple_choice
  options?: { value: string; correct: boolean; explanation?: string }[];
  // numeric
  expectedValue?: number;
  tolerance?: number;
  unit?: string;
  // free_text
  expectedKeyPoints?: string[];
  minWords?: number;
}

export interface InteractiveAskUserQuestionProps {
  messageId: string;
  toolCallId: string;
  approvalId?: string | null;
  args: AskUserQuestionArgs;
  /** When set, this question has already been answered (replay). */
  answered?: { value: string | number; text?: string } | null;
}

export function InteractiveAskUserQuestion({
  messageId,
  toolCallId,
  approvalId,
  args,
  answered,
}: InteractiveAskUserQuestionProps) {
  const submit = useSubmitToolResponse();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<boolean>(!!answered);

  const isReadOnly = submitted || !!answered;
  const awaiting = !isReadOnly;

  const headerLabel =
    args.type === "multiple_choice"
      ? "Question"
      : args.type === "numeric"
        ? "Numeric question"
        : "Open question";

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
          className="text-[10px] font-bold uppercase tracking-[0.15em] flex items-center gap-2"
          style={{
            fontFamily: "var(--font-mono)",
            color: awaiting ? "#fff" : C.headerText,
          }}
        >
          ? {headerLabel.toUpperCase()}
        </span>
        {awaiting ? (
          <span
            className="text-[10px] font-bold uppercase tracking-[0.15em] flex items-center gap-1.5"
            style={{ fontFamily: "var(--font-mono)", color: "#fff" }}
          >
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{
                  backgroundColor: "#fff",
                  animation:
                    "wpf-quiz-pulse 1.6s cubic-bezier(0,0,0.2,1) infinite",
                }}
              />
              <span
                className="relative inline-flex rounded-full h-2 w-2"
                style={{ backgroundColor: "#fff" }}
              />
            </span>
            Awaiting your answer
          </span>
        ) : null}
      </div>
      <div className="px-4 py-4 flex flex-col gap-3">
        {args.context ? (
          <div
            className="text-[12px] italic"
            style={{ color: C.textMuted, fontFamily: "var(--font-serif)" }}
          >
            <InlineMarkdown text={args.context} />
          </div>
        ) : null}
        <div
          className="text-[15px]"
          style={{ fontFamily: "var(--font-serif)", color: C.text }}
        >
          <InlineMarkdown text={args.prompt} />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          {args.type === "multiple_choice" ? (
            <MultipleChoiceBody
              options={args.options ?? []}
              answered={answered}
              isReadOnly={isReadOnly}
              submitting={submitting}
              onSubmit={async (value) => {
                if (submitting || isReadOnly) return;
                setSubmitting(true);
                try {
                  await submit(
                    messageId,
                    toolCallId,
                    { type: "multiple_choice", value },
                    approvalId,
                  );
                  setSubmitted(true);
                } finally {
                  setSubmitting(false);
                }
              }}
            />
          ) : args.type === "numeric" ? (
            <NumericBody
              expectedValue={args.expectedValue ?? 0}
              tolerance={args.tolerance ?? 0}
              unit={args.unit}
              answered={answered as { value: number } | null | undefined}
              isReadOnly={isReadOnly}
              submitting={submitting}
              onSubmit={async (value) => {
                if (submitting || isReadOnly) return;
                setSubmitting(true);
                try {
                  await submit(
                    messageId,
                    toolCallId,
                    { type: "numeric", value },
                    approvalId,
                  );
                  setSubmitted(true);
                } finally {
                  setSubmitting(false);
                }
              }}
            />
          ) : (
            <FreeTextBody
              minWords={args.minWords}
              answered={
                answered as { text?: string; value?: string } | null | undefined
              }
              isReadOnly={isReadOnly}
              submitting={submitting}
              onSubmit={async (text) => {
                if (submitting || isReadOnly) return;
                setSubmitting(true);
                try {
                  await submit(
                    messageId,
                    toolCallId,
                    { type: "free_text", text },
                    approvalId,
                  );
                  setSubmitted(true);
                } finally {
                  setSubmitting(false);
                }
              }}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}

// ── Body subcomponents ─────────────────────────────────────

function MultipleChoiceBody({
  options,
  answered,
  isReadOnly,
  submitting,
  onSubmit,
}: {
  options: { value: string; correct: boolean; explanation?: string }[];
  answered: { value?: string | number; text?: string } | null | undefined;
  isReadOnly: boolean;
  submitting: boolean;
  onSubmit: (value: string) => void | Promise<void>;
}) {
  const [pick, setPick] = useState<string | null>(
    typeof answered?.value === "string" ? answered.value : null,
  );
  const showResult = isReadOnly;
  const submittedValue = typeof answered?.value === "string" ? answered.value : pick;

  return (
    <div className="flex flex-col gap-1.5">
      {options.map((opt, oi) => {
        const picked = submittedValue === opt.value;
        const correct = opt.correct;
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
            onClick={() => setPick(opt.value)}
            className="text-left border px-3 py-2 transition-colors disabled:cursor-default"
            style={{
              borderColor,
              backgroundColor: bg,
              color: C.text,
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
      {!isReadOnly ? (
        <div className="flex items-center justify-end mt-1">
          <Button
            type="button"
            onClick={() => pick && onSubmit(pick)}
            disabled={!pick || submitting}
            className="border-2 h-[32px] px-4 text-[10px]"
            style={{
              borderColor: pick ? C.accent : C.border,
              backgroundColor: pick ? C.accent : C.bgWhite,
              color: pick ? "#fff" : C.textMuted,
            }}
          >
            {submitting ? "Submitting…" : "Submit →"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function NumericBody({
  expectedValue,
  tolerance,
  unit,
  answered,
  isReadOnly,
  submitting,
  onSubmit,
}: {
  expectedValue: number;
  tolerance: number;
  unit?: string;
  answered: { value?: number } | null | undefined;
  isReadOnly: boolean;
  submitting: boolean;
  onSubmit: (value: number) => void | Promise<void>;
}) {
  const [text, setText] = useState<string>(
    typeof answered?.value === "number" ? String(answered.value) : "",
  );
  const parsed = parseFloat(text.replace(",", "."));
  const valid = Number.isFinite(parsed);
  const correct = valid && Math.abs(parsed - expectedValue) <= tolerance;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          type="text"
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isReadOnly || submitting}
          placeholder="…"
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter" && valid) {
              e.preventDefault();
              if (!isReadOnly) onSubmit(parsed);
            }
          }}
          className="flex-1 px-3 py-2 h-auto text-[15px]"
          style={{
            fontFamily: "var(--font-mono)",
            borderColor: C.border,
            backgroundColor: C.bgWhite,
            color: C.text,
          }}
        />
        {unit ? (
          <span
            className="text-[12px] uppercase tracking-[0.1em]"
            style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
          >
            {unit}
          </span>
        ) : null}
      </div>
      {isReadOnly ? (
        <div
          className="text-[12px]"
          style={{
            color: correct ? "#059669" : "#DC2626",
            fontFamily: "var(--font-mono)",
          }}
        >
          {correct ? "✓ Correct" : "✕ Expected: "}
          {!correct ? `${expectedValue}` : ""}
          {!correct && tolerance > 0 ? ` ± ${tolerance}` : ""}
          {!correct && unit ? ` ${unit}` : ""}
        </div>
      ) : (
        <div className="flex items-center justify-end mt-1">
          <Button
            type="button"
            onClick={() => onSubmit(parsed)}
            disabled={!valid || submitting}
            className="border-2 h-[32px] px-4 text-[10px]"
            style={{
              borderColor: valid ? C.accent : C.border,
              backgroundColor: valid ? C.accent : C.bgWhite,
              color: valid ? "#fff" : C.textMuted,
            }}
          >
            {submitting ? "Submitting…" : "Submit →"}
          </Button>
        </div>
      )}
    </div>
  );
}

function FreeTextBody({
  minWords,
  answered,
  isReadOnly,
  submitting,
  onSubmit,
}: {
  minWords?: number;
  answered: { text?: string; value?: string } | null | undefined;
  isReadOnly: boolean;
  submitting: boolean;
  onSubmit: (text: string) => void | Promise<void>;
}) {
  const initial =
    typeof answered?.text === "string"
      ? answered.text
      : typeof answered?.value === "string"
        ? answered.value
        : "";
  const [text, setText] = useState<string>(initial);
  const wordCount = text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
  const minWordsResolved = minWords ?? 0;
  const meetsMin = wordCount >= minWordsResolved;
  const canSubmit = text.trim().length > 0 && meetsMin && !submitting;

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={isReadOnly || submitting}
        rows={Math.min(8, Math.max(3, text.split("\n").length))}
        placeholder="Напишите свой ответ…"
        onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSubmit) {
            e.preventDefault();
            onSubmit(text.trim());
          }
        }}
        className="px-3 py-2 text-[14px] resize-y"
        style={{
          fontFamily: "var(--font-serif)",
          borderColor: C.border,
          backgroundColor: C.bgWhite,
          color: C.text,
        }}
      />
      {!isReadOnly ? (
        <div className="flex items-center justify-between gap-3">
          <span
            className="text-[10px] uppercase tracking-[0.15em]"
            style={{
              fontFamily: "var(--font-mono)",
              color: meetsMin ? C.accent : C.textMuted,
            }}
          >
            {minWordsResolved > 0
              ? `${wordCount} / ≥${minWordsResolved} words`
              : `${wordCount} words`}
          </span>
          <Button
            type="button"
            onClick={() => onSubmit(text.trim())}
            disabled={!canSubmit}
            className="border-2 h-[32px] px-4 text-[10px]"
            style={{
              borderColor: canSubmit ? C.accent : C.border,
              backgroundColor: canSubmit ? C.accent : C.bgWhite,
              color: canSubmit ? "#fff" : C.textMuted,
            }}
          >
            {submitting ? "Submitting…" : "Submit →"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
