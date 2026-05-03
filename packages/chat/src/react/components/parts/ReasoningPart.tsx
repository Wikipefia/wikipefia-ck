"use client";

import { useState } from "react";
import { C } from "@wikipefia/mdx-renderer/theme";
import type { MessagePart } from "../../../types";

interface ReasoningPartProps {
  part: Extract<MessagePart, { type: "reasoning" }>;
}

/** Collapsible model reasoning. Hidden by default. */
export function ReasoningPart({ part }: ReasoningPartProps) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border my-3"
      style={{ borderColor: C.borderLight, backgroundColor: C.bg }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-1.5 text-left text-[10px] uppercase tracking-wider flex items-center gap-2"
        style={{
          fontFamily: "var(--font-mono)",
          color: C.textMuted,
        }}
      >
        <span>{open ? "▼" : "▶"}</span>
        <span className="font-bold">Reasoning</span>
        <span style={{ opacity: 0.6 }}>
          {part.text.length} chars
        </span>
      </button>
      {open ? (
        <div
          className="px-3 py-2 border-t text-[12px] whitespace-pre-wrap"
          style={{
            borderColor: C.borderLight,
            color: C.text,
            fontFamily: "var(--font-mono)",
          }}
        >
          {part.text}
        </div>
      ) : null}
    </div>
  );
}
