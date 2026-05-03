"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type KeyboardEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { C } from "@wikipefia/mdx-renderer/theme";
import {
  useQuestionBoxPairs,
  useAskQuestionBox,
} from "../../hooks/use-questionbox";
import { Markdown } from "../parts/markdown-impl";
import { TypingIndicator } from "../TypingIndicator";

export interface QuestionBoxProps {
  /** Parent agent thread id this widget lives in. */
  threadId: string;
  /** Assistant message id whose tool-call materializes this widget. */
  messageId: string;
  /** AI SDK tool-call id — the unique anchor for this QuestionBox. */
  toolCallId: string;
  /** Topic the LLM wrote into the tool args. Shown as the box label. */
  topic: string;
}

/**
 * Inline "ask a focused follow-up about this subtopic" widget.
 *
 * Visual states:
 *   - default — collapsed pill: "❔ Ask about: <topic>"
 *   - composing — pill expands into a textarea + Send button
 *   - has-pairs — list of past Q&A pairs above; below them either a
 *     compact "+ Ask another" trigger or, if currently streaming, a
 *     typing indicator.
 *
 * Streaming answer renders through the same `Markdown` component used for
 * main thread messages, so prose / math / code formatting matches the
 * surrounding chat exactly. The visual separation comes from the parent
 * card's border + the soft Q-vs-A row backgrounds, not from a different
 * typography stack.
 */
export function QuestionBox({
  threadId,
  messageId,
  toolCallId,
  topic,
}: QuestionBoxProps) {
  const { pairs, status: pairsStatus } = useQuestionBoxPairs(toolCallId);
  const ask = useAskQuestionBox();

  const [composing, setComposing] = useState(false);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Pair-level state. The "live" pair is the last one if it's still being
  // generated — drives both the typing indicator and the composer disable.
  const lastPair = pairs.length > 0 ? pairs[pairs.length - 1] : null;
  const isStreaming =
    lastPair?.status === "streaming" || lastPair?.status === "pending";

  useEffect(() => {
    if (composing) {
      // Slight delay to let the framer-motion expand finish before focusing.
      const id = window.setTimeout(() => {
        textareaRef.current?.focus();
      }, 60);
      return () => window.clearTimeout(id);
    }
  }, [composing]);

  const submit = useCallback(async () => {
    const q = text.trim();
    if (q.length === 0 || submitting || isStreaming) return;
    setSubmitting(true);
    try {
      await ask({
        parentThreadId: threadId,
        parentMessageId: messageId,
        toolCallId,
        topic,
        question: q,
      });
      setText("");
      setComposing(false);
    } finally {
      setSubmitting(false);
    }
  }, [
    text,
    submitting,
    isStreaming,
    ask,
    threadId,
    messageId,
    toolCallId,
    topic,
  ]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        submit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setComposing(false);
        setText("");
      }
    },
    [submit],
  );

  const hasPairs = pairs.length > 0;

  return (
    <div
      className="my-4"
      style={{
        border: `1px solid ${C.borderLight}`,
      }}
    >
      {/* Header pill — always present, shows topic + answer count once
          there's any history. */}
      <div
        className="px-4 py-2 flex items-center gap-2 border-b"
        style={{ borderColor: C.borderLight, backgroundColor: C.bg }}
      >
        <span
          className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold"
          style={{
            backgroundColor: C.accent,
            color: "#fff",
            fontFamily: "var(--font-mono)",
          }}
          aria-hidden
        >
          ?
        </span>
        <span
          className="text-[10px] uppercase tracking-[0.15em] flex-1 truncate"
          style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
        >
          {hasPairs ? "Follow-up · " : "Ask about · "}
          <span style={{ color: C.text }}>{topic}</span>
        </span>
        {hasPairs ? (
          <span
            className="text-[10px] uppercase tracking-[0.15em]"
            style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
          >
            {pairs.length} {pairs.length === 1 ? "answer" : "answers"}
          </span>
        ) : null}
      </div>

      {/* Q&A history. Each pair is a question row + an answer row, with
          a thin divider between them so prose width stays edge-to-edge. */}
      {pairs.map((pair, i) => (
        <div
          key={pair.id}
          style={{
            borderTop:
              i === 0 ? "none" : `1px solid ${C.borderLight}`,
          }}
        >
          {/* Question */}
          <div
            className="px-4 py-3"
            style={{ backgroundColor: C.bg }}
          >
            <div
              className="text-[10px] uppercase tracking-[0.15em] mb-1"
              style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
            >
              You
            </div>
            <div
              className="text-[14px] leading-relaxed"
              style={{ fontFamily: "var(--font-serif)", color: C.text }}
            >
              {pair.question}
            </div>
          </div>
          {/* Answer */}
          <div
            className="px-4 py-3"
            style={{
              backgroundColor: C.bgWhite,
              borderTop: `1px solid ${C.borderLight}`,
            }}
          >
            {pair.answer.length > 0 ? (
              <Markdown text={pair.answer} />
            ) : null}
            {pair.status === "streaming" || pair.status === "pending" ? (
              <div className="mt-1">
                <TypingIndicator />
              </div>
            ) : null}
            {pair.status === "error" ? (
              <div
                className="text-[12px] mt-2"
                style={{
                  color: "#DC2626",
                  fontFamily: "var(--font-mono)",
                }}
              >
                ✕ {pair.errorMessage ?? "Something went wrong."}
              </div>
            ) : null}
          </div>
        </div>
      ))}

      {/* Composer / trigger */}
      <div
        className="px-4 py-3"
        style={{
          backgroundColor: C.bg,
          borderTop: hasPairs ? `1px solid ${C.borderLight}` : "none",
        }}
      >
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
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKeyDown}
                rows={Math.min(8, Math.max(2, text.split("\n").length))}
                placeholder={`Ask a follow-up about: ${topic}`}
                disabled={submitting || isStreaming}
                className="w-full border px-3 py-2 text-[14px] resize-y outline-none disabled:opacity-50"
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
                  ⌘+Enter to send · Esc to cancel
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setComposing(false);
                      setText("");
                    }}
                    disabled={submitting}
                    className="border h-[28px] px-3 text-[10px] font-bold uppercase tracking-[0.1em] cursor-pointer disabled:opacity-40"
                    style={{
                      fontFamily: "var(--font-mono)",
                      borderColor: "transparent",
                      color: C.textMuted,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={
                      text.trim().length === 0 || submitting || isStreaming
                    }
                    className="border-2 h-[30px] px-4 text-[10px] font-bold uppercase tracking-[0.1em] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      fontFamily: "var(--font-mono)",
                      borderColor: C.accent,
                      backgroundColor: C.accent,
                      color: "#fff",
                    }}
                  >
                    {submitting ? "Sending…" : "Send →"}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="trigger"
              type="button"
              onClick={() => setComposing(true)}
              disabled={isStreaming || pairsStatus !== "ready"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
              className="w-full text-left flex items-center gap-2 px-3 py-2 border cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                fontFamily: "var(--font-mono)",
                borderColor: C.borderLight,
                backgroundColor: C.bgWhite,
                color: C.textMuted,
              }}
            >
              <span style={{ color: C.accent }}>+</span>
              <span className="text-[11px] uppercase tracking-[0.1em]">
                {hasPairs ? "Ask another follow-up" : "Ask a question"}
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
