"use client";

import { useState, type ReactNode } from "react";
import { C } from "@wikipefia/mdx-renderer/theme";
import type { AttachmentRef, ChatMessage, MessagePart } from "../../types";
import { TextPart } from "./parts/TextPart";
import { ToolCallPart } from "./parts/ToolCallPart";
import { ToolResultPart } from "./parts/ToolResultPart";
import { ReasoningPart } from "./parts/ReasoningPart";
import { FilePart } from "./parts/FilePart";
import { TypingIndicator } from "./TypingIndicator";
import { ErrorBanner } from "./ErrorBanner";
import { MessageEditor } from "./MessageEditor";
import { IconButton } from "./primitives/IconButton";
import { useThread } from "../hooks/use-threads";
import { useRegenerateMessage } from "../hooks/use-messages";

interface MessageProps {
  message: ChatMessage;
  index: number;
}

/**
 * Visual rules:
 *  - User messages: a single subtle background card. No header label, no timestamp.
 *  - Assistant messages: NO background, NO border. Just rendered parts inline.
 *  - Both span the same horizontal width (parent column max-w-3xl).
 *  - Hover-only action row in the bottom-right corner: regenerate, edit, copy.
 *
 * Reasoning parts emitted by OpenAI provider models are filtered (the
 * "reasoning summary" UX is unhelpful and confusing). Other providers'
 * reasoning is shown in a collapsed disclosure.
 */
export function Message({ message }: MessageProps) {
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const thread = useThread(message.threadId ?? null);
  const regenerate = useRegenerateMessage();

  const isUser = message.role === "user";
  const isStreaming =
    message.status === "streaming" || message.status === "pending";

  // Build a result lookup for tool-call parts
  const resultByCallId = new Map<string, unknown>();
  for (const p of message.parts) {
    if (p.type === "tool-result") {
      resultByCallId.set(p.toolCallId, p.result);
    }
  }

  // Hide reasoning parts entirely for OpenAI provider — their "reasoning summary"
  // doesn't add useful UX and is often noisy.
  const hideReasoning =
    message.role === "assistant" &&
    typeof message.model === "string" &&
    /^openai\b|^openai\//i.test(message.model);

  const visibleParts = hideReasoning
    ? message.parts.filter((p) => p.type !== "reasoning")
    : message.parts;

  // Common action handlers
  const handleCopy = () => {
    const text = extractPlainText(message.parts);
    if (!text) return;
    void navigator.clipboard?.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const handleRegenerate = async () => {
    if (regenerating) return;
    setRegenerating(true);
    try {
      await regenerate(message.id);
    } finally {
      setRegenerating(false);
    }
  };

  if (isUser) {
    const initialAttachments = extractUserAttachments(message.parts);
    return (
      <div className="my-3 group relative">
        <div
          className="px-5 py-4"
          style={{
            backgroundColor: C.bg,
            color: C.text,
            // Border-light on a single side gives the brutalist square feel
            // without making it look like a callout.
            border: `1px solid ${C.borderLight}`,
          }}
        >
          {editing ? (
            <MessageEditor
              messageId={message.id}
              initialText={extractUserText(message.parts)}
              initialAttachments={initialAttachments}
              initialModelId={thread?.modelId}
              onCancel={() => setEditing(false)}
              onSubmitted={() => setEditing(false)}
            />
          ) : (
            <PartList
              parts={visibleParts}
              messageId={message.id}
              resultByCallId={resultByCallId}
            />
          )}
        </div>
        {!editing && !isStreaming ? (
          <MessageActions
            onRegenerate={handleRegenerate}
            onEdit={() => setEditing(true)}
            onCopy={handleCopy}
            regenerating={regenerating}
            copied={copied}
            showEdit
          />
        ) : null}
        {message.status === "error" && message.errorMessage ? (
          <ErrorBanner message={message.errorMessage} />
        ) : null}
      </div>
    );
  }

  // Assistant message: no background, no border. Just inline content.
  return (
    <div className="my-4 group relative">
      <PartList
        parts={visibleParts}
        messageId={message.id}
        resultByCallId={resultByCallId}
      />
      {isStreaming ? (
        <div className="mt-1">
          <TypingIndicator />
        </div>
      ) : null}
      {!isStreaming && message.parts.length > 0 ? (
        <MessageActions
          onRegenerate={handleRegenerate}
          onCopy={handleCopy}
          regenerating={regenerating}
          copied={copied}
        />
      ) : null}
      {message.status === "error" && message.errorMessage ? (
        <ErrorBanner message={message.errorMessage} />
      ) : null}
    </div>
  );
}

interface MessageActionsProps {
  onRegenerate: () => void;
  onEdit?: () => void;
  onCopy: () => void;
  regenerating: boolean;
  copied: boolean;
  /** When true, renders an Edit button. User messages only. */
  showEdit?: boolean;
}

/**
 * Hover-revealed action bar shown beneath each message. Order matches the
 * reference design: regenerate · (placeholder) · edit · copy.
 *
 * The buttons themselves are kept ghost-styled with thin glyphs so they
 * don't fight the message content for attention.
 */
function MessageActions({
  onRegenerate,
  onEdit,
  onCopy,
  regenerating,
  copied,
  showEdit,
}: MessageActionsProps) {
  return (
    <div
      className="mt-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
      style={{ color: C.textMuted }}
    >
      <IconButton
        size="sm"
        variant="ghost"
        aria-label="Regenerate response"
        title="Regenerate"
        onClick={onRegenerate}
        disabled={regenerating}
      >
        <RegenerateIcon spinning={regenerating} />
      </IconButton>
      {showEdit ? (
        <IconButton
          size="sm"
          variant="ghost"
          aria-label="Edit message"
          title="Edit"
          onClick={onEdit}
        >
          <EditIcon />
        </IconButton>
      ) : null}
      <IconButton
        size="sm"
        variant="ghost"
        aria-label="Copy message"
        title={copied ? "Copied" : "Copy"}
        onClick={onCopy}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </IconButton>
    </div>
  );
}

// ── Inline icon glyphs ────────────────────────────────────────
// Tiny stroke-only SVGs so the action bar matches the screenshot's
// thin-iconography vibe rather than emoji/typographic glyphs.

function RegenerateIcon({ spinning }: { spinning?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={
        spinning
          ? { animation: "wpf-spin 0.8s linear infinite" }
          : undefined
      }
      aria-hidden
    >
      <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-7.7-4.3" />
      <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 7.7 4.3" />
      <polyline points="21 3 21 9 15 9" />
      <polyline points="3 21 3 15 9 15" />
      {spinning ? (
        <style>{`@keyframes wpf-spin { to { transform: rotate(360deg); transform-origin: center; } }`}</style>
      ) : null}
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 20h4l10-10-4-4L4 16v4z" />
      <path d="M14 6l4 4" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="9" width="11" height="11" rx="1" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────

function extractPlainText(parts: MessagePart[]): string {
  return parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { text: string }).text)
    .join("\n\n");
}

function extractUserText(parts: MessagePart[]): string {
  for (const p of parts) {
    if (p.type === "text") return p.text;
  }
  return "";
}

function extractUserAttachments(
  parts: MessagePart[],
): Array<AttachmentRef & { url?: string }> {
  const out: Array<AttachmentRef & { url?: string }> = [];
  for (const p of parts) {
    if (p.type !== "file") continue;
    if (!p.storageId) continue; // skip server-side-only file refs without storage id
    out.push({
      storageId: p.storageId,
      name: p.name,
      mimeType: p.mimeType,
      size: p.size,
      url: p.url,
    });
  }
  return out;
}

interface PartListProps {
  parts: MessagePart[];
  messageId: string;
  resultByCallId: Map<string, unknown>;
}

/**
 * Tools whose call/result should NOT render as a widget. These are internal
 * meta-tools the model uses to discover schemas — showing them as "broken
 * widget" cards just confuses the user. We do show a tiny breadcrumb
 * elsewhere so the model's intent is still visible.
 */
const HIDDEN_TOOL_NAMES = new Set(["lookupWidgetDocs"]);

function PartList({ parts, messageId, resultByCallId }: PartListProps): ReactNode {
  return (
    <>
      {parts.map((part, i) => {
        const key = `${i}-${part.type}`;
        switch (part.type) {
          case "text":
            return part.text.length > 0 ? <TextPart key={key} text={part.text} /> : null;
          case "tool-call": {
            if (HIDDEN_TOOL_NAMES.has(part.toolName)) {
              return null;
            }
            const result = resultByCallId.get(part.toolCallId);
            return (
              <ToolCallPart
                key={key}
                part={part}
                messageId={messageId}
                resolvedResult={result}
              />
            );
          }
          case "tool-result":
            if (HIDDEN_TOOL_NAMES.has(part.toolName)) {
              return null;
            }
            return resultByCallId.has(part.toolCallId) ? null : (
              <ToolResultPart key={key} part={part} />
            );
          case "reasoning":
            return part.text.length > 0 ? <ReasoningPart key={key} part={part} /> : null;
          case "file":
            return <FilePart key={key} part={part} />;
        }
      })}
    </>
  );
}
