"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { C } from "@wikipefia/mdx-renderer/theme";
import { Button } from "./primitives/Button";
import { useEditAndRegenerate } from "../hooks/use-messages";

interface MessageEditorProps {
  messageId: string;
  initialText: string;
  onCancel: () => void;
  onSubmitted: () => void;
}

/**
 * Inline editor that opens over a user message. On submit, calls
 * editAndRegenerate which updates the message and triggers a new agent run.
 */
export function MessageEditor({
  messageId,
  initialText,
  onCancel,
  onSubmitted,
}: MessageEditorProps) {
  const [text, setText] = useState(initialText);
  const [submitting, setSubmitting] = useState(false);
  const editAndRegenerate = useEditAndRegenerate();
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.setSelectionRange(text.length, text.length);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = useCallback(async () => {
    if (text.trim().length === 0 || submitting) return;
    if (text === initialText) {
      onCancel();
      return;
    }
    setSubmitting(true);
    try {
      await editAndRegenerate(messageId, text);
      onSubmitted();
    } finally {
      setSubmitting(false);
    }
  }, [text, initialText, submitting, editAndRegenerate, messageId, onSubmitted, onCancel]);

  return (
    <div className="flex flex-col gap-2">
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        rows={Math.min(10, Math.max(2, text.split("\n").length))}
        className="w-full border px-3 py-2 text-[14px] resize-y outline-none"
        style={{
          fontFamily: "var(--font-serif)",
          borderColor: C.border,
          backgroundColor: C.bgWhite,
          color: C.text,
        }}
      />
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel} variant="ghost" size="sm">
          Cancel
        </Button>
        <Button onClick={submit} variant="primary" size="sm" disabled={submitting}>
          {submitting ? "Regenerating…" : "Save & regenerate"}
        </Button>
      </div>
      <div
        className="text-[10px] uppercase tracking-wider"
        style={{ color: C.textMuted, fontFamily: "var(--font-mono)" }}
      >
        ⌘+Enter to save · Esc to cancel
      </div>
    </div>
  );
}
