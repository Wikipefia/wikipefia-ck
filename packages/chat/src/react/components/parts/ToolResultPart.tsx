"use client";

import { C } from "@wikipefia/mdx-renderer/theme";
import type { MessagePart } from "../../../types";

interface ToolResultPartProps {
  part: Extract<MessagePart, { type: "tool-result" }>;
}

/**
 * Inline display of a user-supplied tool result (e.g. "You answered: B, A, C").
 * Most tool results are paired with their preceding tool-call render and
 * shown there (Quiz with feedback). This is the fallback display.
 */
export function ToolResultPart({ part }: ToolResultPartProps) {
  return (
    <div
      className="border-l-2 pl-3 my-3 text-[12px]"
      style={{
        borderColor: C.borderLight,
        color: C.textMuted,
        fontFamily: "var(--font-mono)",
      }}
    >
      <div className="text-[10px] uppercase tracking-wider mb-1">
        Tool result · {part.toolName}
      </div>
      <pre className="whitespace-pre-wrap text-[11px]" style={{ color: C.text }}>
        {typeof part.result === "string"
          ? part.result
          : JSON.stringify(part.result, null, 2)}
      </pre>
    </div>
  );
}
