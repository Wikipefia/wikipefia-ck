"use client";

import { useState, type ReactNode } from "react";
import { C } from "@wikipefia/mdx-renderer/theme";
import type { ChatMessage, MessagePart } from "../../types";
import { TextPart } from "./parts/TextPart";
import { ToolCallPart } from "./parts/ToolCallPart";
import { ToolResultPart } from "./parts/ToolResultPart";
import { ReasoningPart } from "./parts/ReasoningPart";
import { FilePart } from "./parts/FilePart";
import { TypingIndicator } from "./TypingIndicator";
import { ErrorBanner } from "./ErrorBanner";
import { MessageEditor } from "./MessageEditor";
import { IconButton } from "./primitives/IconButton";

interface MessageProps {
  message: ChatMessage;
  index: number;
}

/**
 * Visual rules:
 *  - User messages: a single subtle background card. No header label, no timestamp.
 *  - Assistant messages: NO background, NO border. Just rendered parts inline.
 *  - Both span the same horizontal width (parent column max-w-3xl).
 *  - Hover-only edit (user) / copy (assistant) actions in the corner.
 *
 * Reasoning parts emitted by OpenAI provider models are filtered (the
 * "reasoning summary" UX is unhelpful and confusing). Other providers'
 * reasoning is shown in a collapsed disclosure.
 */
export function Message({ message }: MessageProps) {
  const [editing, setEditing] = useState(false);
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

  if (isUser) {
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
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <IconButton
              size="sm"
              variant="ghost"
              aria-label="Edit message"
              title="Edit message"
              onClick={() => setEditing(true)}
            >
              ✎
            </IconButton>
          </div>
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
        <div className="absolute -top-1 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <IconButton
            size="sm"
            variant="ghost"
            aria-label="Copy message"
            title="Copy text"
            onClick={() => {
              const text = extractPlainText(message.parts);
              navigator.clipboard?.writeText(text);
            }}
          >
            ⎘
          </IconButton>
        </div>
      ) : null}
      {message.status === "error" && message.errorMessage ? (
        <ErrorBanner message={message.errorMessage} />
      ) : null}
    </div>
  );
}

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

interface PartListProps {
  parts: MessagePart[];
  messageId: string;
  resultByCallId: Map<string, unknown>;
}

function PartList({ parts, messageId, resultByCallId }: PartListProps): ReactNode {
  return (
    <>
      {parts.map((part, i) => {
        const key = `${i}-${part.type}`;
        switch (part.type) {
          case "text":
            return part.text.length > 0 ? <TextPart key={key} text={part.text} /> : null;
          case "tool-call": {
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
